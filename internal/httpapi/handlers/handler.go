package handlers

import (
	"github.com/suPer8Hu/ai-platform/internal/ai"
	"github.com/suPer8Hu/ai-platform/internal/chat"
	"github.com/suPer8Hu/ai-platform/internal/config"
	"github.com/suPer8Hu/ai-platform/internal/email"
	"github.com/suPer8Hu/ai-platform/internal/store/redisstore"
	"gorm.io/gorm"
)

type Handler struct {
	DB          *gorm.DB
	Cfg         config.Config
	Redis       *redisstore.Store
	SMTPSetting email.SMTPConfig
	ChatSvc     *chat.Service
}

func NewHandler(db *gorm.DB, cfg config.Config, r *redisstore.Store) *Handler {
	repo := chat.NewRepo(db)
	chatSvc := chat.NewService(repo, ai.NewFakeProvider(), cfg.ChatContextWindowSize)
	return &Handler{DB: db, Cfg: cfg, Redis: r, SMTPSetting: email.SMTPConfig{Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom},
		ChatSvc: chatSvc,
	}
}
