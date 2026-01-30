package ai

import "context"

type Message struct {
	Role    string
	Content string
}

type Provider interface {
	Chat(ctx context.Context, messages []Message) (string, error)
}
