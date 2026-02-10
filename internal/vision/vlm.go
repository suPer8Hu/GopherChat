package vision

import "context"

type VLM interface {
	Ask(ctx context.Context, question string, image []byte, mime string) (string, error)
}

type VLMConfig struct {
	BaseURL string
	APIKey  string
	Model   string
	SiteURL string
	AppName string
	Mode    string
}
