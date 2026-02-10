package vision

import (
	"context"
	"image"
)

type Prediction struct {
	Index   int     `json:"index"`
	Label   string  `json:"label"`
	LabelZH string  `json:"label_zh,omitempty"`
	Score   float32 `json:"score"`
}

type Classifier interface {
	Predict(ctx context.Context, img image.Image, topK int) ([]Prediction, error)
	Close() error
}

type Config struct {
	ModelPath  string
	LabelsPath string
	InputH     int
	InputW     int
	InputName  string
	OutputName string
	OrtLibraryPath string
}
