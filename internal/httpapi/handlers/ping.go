package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/common"
)

func (h *Handler) Ping(c *gin.Context) {
	common.OK(c, gin.H{
		"pong": true,
	})
}
