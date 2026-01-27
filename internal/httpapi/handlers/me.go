package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
