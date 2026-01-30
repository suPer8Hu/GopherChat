package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/httpapi/middleware"
	"gorm.io/gorm"
)

func ok(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    data,
	})
}

func fail(c *gin.Context, httpStatus int, code int, msg string) {
	c.JSON(httpStatus, gin.H{
		"code":    code,
		"message": msg,
		"data":    nil,
	})
}

func userIDFromContext(c *gin.Context) (uint64, bool) {
	v, ok := c.Get(middleware.UserIDKey)
	if !ok {
		return 0, false
	}
	id, ok := v.(uint64)
	return id, ok
}

type createSessionReq struct {
	Provider string `json:"provider"`
	Model    string `json:"model"`
}

func (h *Handler) CreateChatSession(c *gin.Context) {
	uid, okk := userIDFromContext(c)
	if !okk {
		fail(c, http.StatusUnauthorized, 40101, "unauthorized")
		return
	}

	var req createSessionReq
	_ = c.ShouldBindJSON(&req) // allow empty {}

	sess, err := h.ChatSvc.CreateSession(c.Request.Context(), uid, req.Provider, req.Model)
	if err != nil {
		fail(c, http.StatusInternalServerError, 50001, "failed to create session")
		return
	}

	ok(c, gin.H{"session_id": sess.SessionID})
}

type sendMessageReq struct {
	SessionID string `json:"session_id" binding:"required"`
	Message   string `json:"message" binding:"required"`
}

func (h *Handler) SendChatMessage(c *gin.Context) {
	uid, okk := userIDFromContext(c)
	if !okk {
		fail(c, http.StatusUnauthorized, 40101, "unauthorized")
		return
	}

	var req sendMessageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, 10001, "invalid json")
		return
	}

	reply, msgID, err := h.ChatSvc.SendMessage(c.Request.Context(), uid, req.SessionID, req.Message)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fail(c, http.StatusNotFound, 40004, "session not found")
			return
		}
		fail(c, http.StatusBadRequest, 40001, "failed to send message")
		return
	}

	ok(c, gin.H{
		"session_id": req.SessionID,
		"reply":      reply,
		"message_id": msgID,
	})
}

func (h *Handler) ListChatMessages(c *gin.Context) {
	uid, okk := userIDFromContext(c)
	if !okk {
		fail(c, http.StatusUnauthorized, 40101, "unauthorized")
		return
	}

	sessionID := c.Param("session_id")

	limit, _ := strconv.Atoi(c.Query("limit"))
	beforeIDStr := c.Query("before_id")
	var beforeID uint64
	if beforeIDStr != "" {
		if n, err := strconv.ParseUint(beforeIDStr, 10, 64); err == nil {
			beforeID = n
		}
	}

	msgs, err := h.ChatSvc.ListMessages(c.Request.Context(), uid, sessionID, limit, beforeID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fail(c, http.StatusNotFound, 40004, "session not found")
			return
		}
		fail(c, http.StatusInternalServerError, 50002, "failed to list messages")
		return
	}

	var nextBeforeID uint64
	if len(msgs) > 0 {
		nextBeforeID = msgs[len(msgs)-1].ID
	}

	ok(c, gin.H{
		"messages":       msgs,
		"next_before_id": nextBeforeID,
	})
}
