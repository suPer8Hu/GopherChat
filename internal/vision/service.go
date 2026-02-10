package vision

import (
	"context"
	"fmt"
	"image"
)

type Service struct {
	classifier  Classifier
	defaultTopK int
	maxTopK     int
}

func NewService(classifier Classifier, defaultTopK, maxTopK int) (*Service, error) {
	if classifier == nil {
		return nil, fmt.Errorf("classifier is required")
	}
	if defaultTopK <= 0 {
		defaultTopK = 1
	}
	if maxTopK <= 0 {
		maxTopK = defaultTopK
	}
	if defaultTopK > maxTopK {
		defaultTopK = maxTopK
	}
	return &Service{
		classifier:  classifier,
		defaultTopK: defaultTopK,
		maxTopK:     maxTopK,
	}, nil
}

func (s *Service) ResolveTopK(k int) int {
	if k <= 0 {
		return s.defaultTopK
	}
	if k > s.maxTopK {
		return s.maxTopK
	}
	return k
}

func (s *Service) Recognize(ctx context.Context, img image.Image, topK int) ([]Prediction, error) {
	k := s.ResolveTopK(topK)
	return s.classifier.Predict(ctx, img, k)
}
