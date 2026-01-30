package chat

import (
	"context"

	"gorm.io/gorm"
)

type Repo struct {
	db *gorm.DB
}

func NewRepo(db *gorm.DB) *Repo {
	return &Repo{db: db}
}

func (r *Repo) CreateSession(ctx context.Context, s *Session) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *Repo) GetSessionBySessionID(ctx context.Context, sessionID string) (*Session, error) {
	var s Session
	if err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repo) InsertMessage(ctx context.Context, m *Message) error {
	return r.db.WithContext(ctx).Create(m).Error
}

// ListMessages returns messages in DESC id order (newest -> oldest).
func (r *Repo) ListMessages(ctx context.Context, userID uint64, sessionID string, limit int, beforeID uint64) ([]Message, error) {
	q := r.db.WithContext(ctx).
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		Order("id DESC").
		Limit(limit)

	if beforeID > 0 {
		q = q.Where("id < ?", beforeID)
	}

	var msgs []Message
	if err := q.Find(&msgs).Error; err != nil {
		return nil, err
	}
	return msgs, nil
}

// ListRecentMessagesDesc returns the most recent messages in DESC id order (newest -> oldest).
func (r *Repo) ListRecentMessagesDesc(ctx context.Context, userID uint64, sessionID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 20
	}
	var msgs []Message
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		Order("id DESC").
		Limit(limit).
		Find(&msgs).Error; err != nil {
		return nil, err
	}
	return msgs, nil
}
