package vision

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type GeminiVLM struct {
	BaseURL string
	APIKey  string
	Model   string
	Client  *http.Client
}

type geminiInlineData struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type geminiPart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *geminiInlineData `json:"inline_data,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiReq struct {
	Contents []geminiContent `json:"contents"`
}

type geminiResp struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

func NewGeminiVLM(cfg VLMConfig) (*GeminiVLM, error) {
	if strings.TrimSpace(cfg.APIKey) == "" {
		return nil, errors.New("gemini: api key is required")
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = "gemini-2.0-flash"
	}
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta/models"
	}
	return &GeminiVLM{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  cfg.APIKey,
		Model:   model,
		Client:  &http.Client{Timeout: 120 * time.Second},
	}, nil
}

func (v *GeminiVLM) Ask(ctx context.Context, question string, image []byte, mime string) (string, error) {
	if v.Client == nil {
		return "", errors.New("gemini: http client is nil")
	}
	if strings.TrimSpace(question) == "" {
		return "", errors.New("question is required")
	}
	if len(image) == 0 {
		return "", errors.New("image is required")
	}
	if mime == "" {
		mime = "image/jpeg"
	}

	reqBody := geminiReq{
		Contents: []geminiContent{
			{
				Role: "user",
				Parts: []geminiPart{
					{Text: question},
					{InlineData: &geminiInlineData{
						MimeType: mime,
						Data:     base64.StdEncoding.EncodeToString(image),
					}},
				},
			},
		},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	model := normalizeGeminiModel(v.Model)
	url := fmt.Sprintf("%s/%s:generateContent", v.BaseURL, model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", v.APIKey)

	resp, err := v.Client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1*1024*1024))
	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusPaymentRequired {
		return "", ErrQuotaExceeded
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := strings.TrimSpace(string(body))
		if msg == "" {
			msg = fmt.Sprintf("status %d", resp.StatusCode)
		}
		return "", fmt.Errorf("gemini: %s", msg)
	}

	var decoded geminiResp
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", err
	}
	if decoded.Error != nil && decoded.Error.Message != "" {
		if decoded.Error.Code == http.StatusTooManyRequests || decoded.Error.Code == http.StatusPaymentRequired {
			return "", ErrQuotaExceeded
		}
		return "", errors.New(decoded.Error.Message)
	}
	if len(decoded.Candidates) == 0 {
		return "", errors.New("gemini: empty response")
	}
	for _, part := range decoded.Candidates[0].Content.Parts {
		if strings.TrimSpace(part.Text) != "" {
			return strings.TrimSpace(part.Text), nil
		}
	}
	return "", errors.New("gemini: empty response")
}

func normalizeGeminiModel(model string) string {
	m := strings.TrimSpace(model)
	if m == "" {
		return "gemini-2.0-flash"
	}
	return strings.TrimPrefix(m, "models/")
}
