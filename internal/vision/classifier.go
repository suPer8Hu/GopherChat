//go:build onnx

package vision

import (
	"context"
	"errors"
	"fmt"
	"image"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"

	ort "github.com/yalue/onnxruntime_go"
)

const (
	defaultInputName  = "data"
	defaultOutputName = "mobilenetv20_output_flatten0_reshape0"
	defaultInputH     = 224
	defaultInputW     = 224
)

type ONNXClassifier struct {
	modelPath    string
	inputName    string
	outputName   string
	inputH       int
	inputW       int
	labels       []Label
	inputTensor  *ort.Tensor[float32]
	outputTensor *ort.Tensor[float32]
	session      *ort.Session[float32]
	mu           sync.Mutex
	closed       bool
}

var initOnce sync.Once
var initErr error

func NewONNXClassifier(cfg Config) (Classifier, error) {
	modelPath := strings.TrimSpace(cfg.ModelPath)
	if modelPath == "" {
		return nil, errors.New("model path is required")
	}
	labelsPath := strings.TrimSpace(cfg.LabelsPath)
	if labelsPath == "" {
		return nil, errors.New("labels path is required")
	}

	inputH := cfg.InputH
	inputW := cfg.InputW
	if inputH <= 0 {
		inputH = defaultInputH
	}
	if inputW <= 0 {
		inputW = defaultInputW
	}

	inputName := strings.TrimSpace(cfg.InputName)
	if inputName == "" {
		inputName = defaultInputName
	}
	outputName := strings.TrimSpace(cfg.OutputName)
	if outputName == "" {
		outputName = defaultOutputName
	}

	setOrtLibraryPath(cfg.OrtLibraryPath)

	labels, err := LoadLabels(labelsPath)
	if err != nil {
		return nil, err
	}

	initOnce.Do(func() {
		initErr = ort.InitializeEnvironment()
	})
	if initErr != nil {
		return nil, fmt.Errorf("onnxruntime init failed: %w", initErr)
	}

	inputShape := ort.NewShape(1, 3, int64(inputH), int64(inputW))
	inData := make([]float32, inputShape.FlattenedSize())
	inTensor, err := ort.NewTensor(inputShape, inData)
	if err != nil {
		return nil, fmt.Errorf("create input tensor failed: %w", err)
	}

	outShape := ort.NewShape(1, int64(len(labels)))
	outTensor, err := ort.NewEmptyTensor[float32](outShape)
	if err != nil {
		inTensor.Destroy()
		return nil, fmt.Errorf("create output tensor failed: %w", err)
	}

	session, err := ort.NewSession[float32](
		modelPath,
		[]string{inputName},
		[]string{outputName},
		[]*ort.Tensor[float32]{inTensor},
		[]*ort.Tensor[float32]{outTensor},
	)
	if err != nil {
		inTensor.Destroy()
		outTensor.Destroy()
		return nil, fmt.Errorf("create onnx session failed: %w", err)
	}

	return &ONNXClassifier{
		modelPath:    modelPath,
		inputName:    inputName,
		outputName:   outputName,
		inputH:       inputH,
		inputW:       inputW,
		labels:       labels,
		inputTensor:  inTensor,
		outputTensor: outTensor,
		session:      session,
	}, nil
}

func (c *ONNXClassifier) Predict(ctx context.Context, img image.Image, topK int) ([]Prediction, error) {
	if ctx != nil {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
	}

	data, err := Preprocess(img, c.inputW, c.inputH)
	if err != nil {
		return nil, err
	}

	inData := c.inputTensor.GetData()
	if len(inData) != len(data) {
		return nil, fmt.Errorf("input tensor size mismatch: %d vs %d", len(inData), len(data))
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil, errors.New("classifier closed")
	}

	copy(inData, data)
	if err := c.session.Run(); err != nil {
		return nil, fmt.Errorf("onnx run failed: %w", err)
	}

	outData := c.outputTensor.GetData()
	if len(outData) == 0 {
		return nil, errors.New("empty output from model")
	}

	probs := softmax(outData)
	k := topK
	if k <= 0 {
		k = 1
	}
	if k > len(probs) {
		k = len(probs)
	}

	return topKPredictions(probs, c.labels, k), nil
}

func (c *ONNXClassifier) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	if c.session != nil {
		c.session.Destroy()
	}
	if c.inputTensor != nil {
		c.inputTensor.Destroy()
	}
	if c.outputTensor != nil {
		c.outputTensor.Destroy()
	}
	return nil
}

func (c *ONNXClassifier) ModelName() string {
	return filepath.Base(c.modelPath)
}

func setOrtLibraryPath(path string) {
	if p := strings.TrimSpace(path); p != "" {
		ort.SetSharedLibraryPath(p)
		return
	}

	for _, candidate := range []string{
		"/opt/homebrew/lib/libonnxruntime.dylib",
		"/usr/local/lib/libonnxruntime.dylib",
		"/opt/homebrew/lib/onnxruntime.so",
		"/usr/local/lib/onnxruntime.so",
	} {
		if fileExists(candidate) {
			ort.SetSharedLibraryPath(candidate)
			return
		}
	}
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func topKPredictions(outData []float32, labels []Label, k int) []Prediction {
	if k <= 0 {
		return nil
	}
	top := make([]Prediction, 0, k)
	for i, score := range outData {
		label := ""
		labelZH := ""
		if i >= 0 && i < len(labels) {
			label = labels[i].EN
			labelZH = labels[i].ZH
		} else {
			label = "Unknown"
		}
		p := Prediction{Index: i, Label: label, LabelZH: labelZH, Score: score}

		inserted := false
		for j := 0; j < len(top); j++ {
			if score > top[j].Score {
				top = append(top, Prediction{})
				copy(top[j+1:], top[j:])
				top[j] = p
				inserted = true
				break
			}
		}
		if !inserted {
			if len(top) < k {
				top = append(top, p)
			}
		}
		if len(top) > k {
			top = top[:k]
		}
	}
	return top
}

func softmax(logits []float32) []float32 {
	if len(logits) == 0 {
		return nil
	}
	maxVal := logits[0]
	for _, v := range logits[1:] {
		if v > maxVal {
			maxVal = v
		}
	}
	out := make([]float32, len(logits))
	var sum float64
	for i, v := range logits {
		expv := math.Exp(float64(v - maxVal))
		sum += expv
		out[i] = float32(expv)
	}
	if sum == 0 {
		return out
	}
	for i := range out {
		out[i] = float32(float64(out[i]) / sum)
	}
	return out
}
