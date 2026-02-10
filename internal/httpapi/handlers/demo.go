package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/ai"
	"github.com/suPer8Hu/ai-platform/internal/common"
)

const (
	demoMaxMessages = 20
	demoProvider    = "openrouter"
	demoModel       = "openrouter/auto"
)

type demoChatReq struct {
	Messages []ai.Message `json:"messages"`
}

func (h *Handler) DemoChat(c *gin.Context) {
	if strings.TrimSpace(h.Cfg.OpenRouterAPIKey) == "" {
		common.Fail(c, http.StatusServiceUnavailable, 50303, "demo is not configured")
		return
	}

	var req demoChatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}

	messages := normalizeDemoMessages(req.Messages)
	if len(messages) == 0 {
		common.Fail(c, http.StatusBadRequest, 10002, "messages required")
		return
	}

	provider, err := h.ChatSvc.ProviderRegistry().Get(c.Request.Context(), demoProvider, demoModel)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 50010, "demo provider unavailable")
		return
	}

	reply, err := provider.Chat(c.Request.Context(), messages)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 50011, "demo chat failed")
		return
	}

	common.OK(c, gin.H{"reply": reply})
}

type streamProvider interface {
	StreamChat(ctx context.Context, messages []ai.Message) (<-chan string, <-chan error)
}

func (h *Handler) DemoChatStream(c *gin.Context) {
	if strings.TrimSpace(h.Cfg.OpenRouterAPIKey) == "" {
		common.Fail(c, http.StatusServiceUnavailable, 50303, "demo is not configured")
		return
	}

	var req demoChatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}

	messages := normalizeDemoMessages(req.Messages)
	if len(messages) == 0 {
		common.Fail(c, http.StatusBadRequest, 10002, "messages required")
		return
	}

	provider, err := h.ChatSvc.ProviderRegistry().Get(c.Request.Context(), demoProvider, demoModel)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 50010, "demo provider unavailable")
		return
	}

	sp, ok := provider.(streamProvider)
	if !ok {
		common.Fail(c, http.StatusInternalServerError, 50012, "demo stream not supported")
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.WriteHeader(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		common.Fail(c, http.StatusInternalServerError, 50013, "streaming not supported")
		return
	}

	chunks, errs := sp.StreamChat(c.Request.Context(), messages)

	writeEvent := func(event string, payload any) {
		b, _ := json.Marshal(payload)
		_, _ = c.Writer.Write([]byte("event: " + event + "\n"))
		_, _ = c.Writer.Write([]byte("data: " + string(b) + "\n\n"))
		flusher.Flush()
	}

	for {
		select {
		case chunk, ok := <-chunks:
			if !ok {
				writeEvent("done", gin.H{"type": "done"})
				return
			}
			if chunk != "" {
				writeEvent("chunk", gin.H{"type": "chunk", "delta": chunk})
			}
		case err, ok := <-errs:
			if ok && err != nil {
				writeEvent("error", gin.H{"type": "error", "message": err.Error()})
				return
			}
		case <-c.Request.Context().Done():
			return
		}
	}
}

func normalizeDemoMessages(in []ai.Message) []ai.Message {
	out := make([]ai.Message, 0, len(in))
	for _, m := range in {
		role := strings.ToLower(strings.TrimSpace(m.Role))
		if role != "user" && role != "assistant" && role != "system" {
			continue
		}
		content := strings.TrimSpace(m.Content)
		if content == "" {
			continue
		}
		out = append(out, ai.Message{Role: role, Content: content})
	}
	if len(out) > demoMaxMessages {
		out = out[len(out)-demoMaxMessages:]
	}
	return out
}
