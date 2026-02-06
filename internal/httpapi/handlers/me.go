package handlers

import (
	"net/http"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/auth"
	"github.com/suPer8Hu/ai-platform/internal/chat"
	"github.com/suPer8Hu/ai-platform/internal/common"
	"github.com/suPer8Hu/ai-platform/internal/httpapi/middleware"
	"github.com/suPer8Hu/ai-platform/internal/models"
	"gorm.io/gorm"
)

func (h *Handler) Me(c *gin.Context) {
	v, ok := c.Get(middleware.UserIDKey)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	userID, ok := v.(uint64)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			common.Fail(c, http.StatusUnauthorized, 40103, "user not found")
			return
		}
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	common.OK(c, gin.H{
		"id":       user.ID,
		"email":    user.Email,
		"username": user.Username,
	})
}

type updatePasswordReq struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) UpdateMyPassword(c *gin.Context) {
	v, ok := c.Get(middleware.UserIDKey)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	userID, ok := v.(uint64)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	var req updatePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		common.Fail(c, http.StatusBadRequest, 10002, "old_password and new_password required")
		return
	}
	if utf8.RuneCountInString(req.NewPassword) < 6 {
		common.Fail(c, http.StatusBadRequest, 10002, "new_password too short")
		return
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			common.Fail(c, http.StatusUnauthorized, 40103, "user not found")
			return
		}
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	if !auth.VerifyPassword(user.PasswordHash, req.OldPassword) {
		common.Fail(c, http.StatusUnauthorized, 40101, "invalid password")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 20002, "failed to hash password")
		return
	}

	if err := h.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("password_hash", hash).Error; err != nil {
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	common.OK(c, gin.H{"updated": true})
}

type deleteAccountReq struct {
	Password string `json:"password"`
}

func (h *Handler) DeleteMyAccount(c *gin.Context) {
	v, ok := c.Get(middleware.UserIDKey)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	userID, ok := v.(uint64)
	if !ok {
		common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
		return
	}

	var req deleteAccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}

	if req.Password == "" {
		common.Fail(c, http.StatusBadRequest, 10002, "password required")
		return
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			common.Fail(c, http.StatusUnauthorized, 40103, "user not found")
			return
		}
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	if !auth.VerifyPassword(user.PasswordHash, req.Password) {
		common.Fail(c, http.StatusUnauthorized, 40101, "invalid password")
		return
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&chat.Message{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&chat.Job{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&chat.Session{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", userID).Delete(&models.User{}).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		common.Fail(c, http.StatusInternalServerError, 20001, "db error")
		return
	}

	common.OK(c, gin.H{"deleted": true})
}
