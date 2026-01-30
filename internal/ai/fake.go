package ai

import (
	"context"
	"strings"
)

type FakeProvider struct{}

func NewFakeProvider() *FakeProvider { return &FakeProvider{} }

func (p *FakeProvider) Chat(ctx context.Context, messages []Message) (string, error) {
	_ = ctx
	if len(messages) == 0 {
		return "Echo: (empty)", nil
	}
	last := messages[len(messages)-1].Content
	last = strings.TrimSpace(last)
	if last == "" {
		return "Echo: (empty)", nil
	}
	return "Echo: " + last, nil
}
