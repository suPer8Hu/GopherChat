//go:build !onnx

package vision

import "fmt"

func NewONNXClassifier(cfg Config) (Classifier, error) {
	_ = cfg
	return nil, fmt.Errorf("onnx support not enabled (build with -tags=onnx)")
}
