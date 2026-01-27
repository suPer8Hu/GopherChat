package handlers

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/common"
	"github.com/suPer8Hu/ai-platform/internal/email"
)

type sendCaptchaReq struct {
	Email string `json:"email"`
}

func random6Digits() (string, error) {
	// 000000 - 999999
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (h *Handler) SendCaptcha(c *gin.Context) {
	var req sendCaptchaReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}
	if req.Email == "" {
		common.Fail(c, http.StatusBadRequest, 10002, "email required")
		return
	}

	if h.Cfg.SMTPHost == "" || h.Cfg.SMTPUser == "" || h.Cfg.SMTPPass == "" || h.Cfg.SMTPFrom == "" {
		common.Fail(c, http.StatusInternalServerError, 50010, "smtp not configured")
		return
	}

	code, err := random6Digits()
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 50011, "failed to generate captcha")
		return
	}

	// exp
	if err := h.Redis.SetCaptcha(c.Request.Context(), req.Email, code, 5*time.Minute); err != nil {
		common.Fail(c, http.StatusInternalServerError, 50012, "failed to store captcha")
		return
	}

	subject := "Your verification code"
	body := fmt.Sprintf("Your verification code is: %s\nIt expires in 5 minutes.\n", code)
	if err := email.SendText(h.SMTPSetting, req.Email, subject, body); err != nil {
		common.Fail(c, http.StatusInternalServerError, 50013, "failed to send email")
		return
	}

	common.OK(c, gin.H{"sent": true})
}
