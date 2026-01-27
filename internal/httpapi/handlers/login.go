package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/auth"
	"github.com/suPer8Hu/ai-platform/internal/common"
	"github.com/suPer8Hu/ai-platform/internal/models"
	"gorm.io/gorm"
)

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}
	if req.Email == "" || req.Password == "" {
		common.Fail(c, http.StatusBadRequest, 10002, "email and password required")
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// cannot find users：401；others DB error：500
		if err == gorm.ErrRecordNotFound {
			common.Fail(c, http.StatusUnauthorized, 40101, "invalid credentials")
			return
		}
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	if !auth.VerifyPassword(user.PasswordHash, req.Password) {
		common.Fail(c, http.StatusUnauthorized, 40101, "invalid credentials")
		return
	}

	token, err := auth.SignJWT(user.ID, h.Cfg.JWTSecret, 24*time.Hour)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 20002, "failed to sign token")
		return
	}

	common.OK(c, gin.H{"token": token})
}
