package chat

import (
	"context"
	"errors"

	"github.com/suPer8Hu/ai-platform/internal/ai"
	"gorm.io/gorm"
)

type Service struct {
	repo              *Repo
	provider          ai.Provider
	contextWindowSize int
}

func NewService(repo *Repo, provider ai.Provider, contextWindowSize int) *Service {
	if contextWindowSize <= 0 || contextWindowSize > 100 {
		contextWindowSize = 20
	}
	return &Service{repo: repo, provider: provider, contextWindowSize: contextWindowSize}
}

const (
	defaultProvider = "fake"
	defaultModel    = "default"
)

func (s *Service) CreateSession(ctx context.Context, userID uint64, provider, model string) (*Session, error) {
	if provider == "" {
		provider = defaultProvider
	}
	if model == "" {
		model = defaultModel
	}

	sid, err := NewSessionID()
	if err != nil {
		return nil, err
	}

	session := &Session{
		SessionID: sid,
		UserID:    userID,
		Provider:  provider,
		Model:     model,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *Service) SendMessage(ctx context.Context, userID uint64, sessionID string, content string) (reply string, assistantMsgID uint64, err error) {
	// 1) verify session ownership
	session, err := s.repo.GetSessionBySessionID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", 0, err
		}
		return "", 0, err
	}
	if session.UserID != userID {
		return "", 0, gorm.ErrRecordNotFound
	}

	// 2) store user message (strong consistency)
	userMsg := &Message{
		SessionID: sessionID,
		UserID:    userID,
		Role:      "user",
		Content:   content,
	}
	if err := s.repo.InsertMessage(ctx, userMsg); err != nil {
		return "", 0, err
	}

	// 3) build provider messages from recent DB history
	recentDesc, err := s.repo.ListRecentMessagesDesc(ctx, userID, sessionID, s.contextWindowSize)
	if err != nil {
		return "", 0, err
	}

	// reverse to ASC (oldest -> newest)
	providerMsgs := make([]ai.Message, 0, len(recentDesc))
	for i := len(recentDesc) - 1; i >= 0; i-- {
		m := recentDesc[i]
		providerMsgs = append(providerMsgs, ai.Message{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	// 4) call provider
	reply, err = s.provider.Chat(ctx, providerMsgs)
	if err != nil {
		return "", 0, err
	}

	// 5) store assistant message (strong consistency)
	assistantMsg := &Message{
		SessionID: sessionID,
		UserID:    userID,
		Role:      "assistant",
		Content:   reply,
	}
	if err := s.repo.InsertMessage(ctx, assistantMsg); err != nil {
		return "", 0, err
	}

	return reply, assistantMsg.ID, nil
}

func (s *Service) ListMessages(ctx context.Context, userID uint64, sessionID string, limit int, beforeID uint64) ([]Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.ListMessages(ctx, userID, sessionID, limit, beforeID)
}
