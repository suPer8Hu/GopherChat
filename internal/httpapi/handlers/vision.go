package handlers

import (
	"bytes"
	"encoding/base64"
	"errors"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/common"
	"github.com/suPer8Hu/ai-platform/internal/vision"
)

type visionJSONRequest struct {
	ImageBase64 string `json:"image_base64"`
	TopK        int    `json:"top_k"`
}

func (h *Handler) RecognizeImage(c *gin.Context) {
	if h.VisionSvc == nil {
		common.Fail(c, http.StatusServiceUnavailable, 50301, "vision service not configured")
		return
	}

	maxBytes := h.Cfg.VisionMaxImageBytes
	if maxBytes <= 0 {
		maxBytes = int64(200 * 1024 * 1024)
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)

	topK := parseTopK(c.Query("top_k"))

	var imgBytes []byte
	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "application/json") {
		var req visionJSONRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
			return
		}
		if req.TopK > 0 {
			topK = req.TopK
		}
		if strings.TrimSpace(req.ImageBase64) == "" {
			common.Fail(c, http.StatusBadRequest, 10002, "image_base64 required")
			return
		}
		b, err := decodeBase64Image(req.ImageBase64)
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10003, "invalid base64 image")
			return
		}
		imgBytes = b
	} else {
		file, err := c.FormFile("image")
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10002, "image file required")
			return
		}
		if file.Size > maxBytes {
			common.Fail(c, http.StatusRequestEntityTooLarge, 10004, "image too large")
			return
		}
		src, err := file.Open()
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10005, "failed to read image")
			return
		}
		defer src.Close()
		buf := new(bytes.Buffer)
		if _, err := buf.ReadFrom(src); err != nil {
			common.Fail(c, http.StatusBadRequest, 10005, "failed to read image")
			return
		}
		imgBytes = buf.Bytes()
	}

	img, _, err := vision.DecodeImage(bytes.NewReader(imgBytes))
	if err != nil {
		common.Fail(c, http.StatusBadRequest, 10006, "unsupported image format")
		return
	}

	normalizedTopK := h.VisionSvc.ResolveTopK(topK)
	preds, err := h.VisionSvc.Recognize(c.Request.Context(), img, normalizedTopK)
	if err != nil {
		common.Fail(c, http.StatusInternalServerError, 50001, "failed to recognize image")
		return
	}

	common.OK(c, gin.H{
		"top_k":      normalizedTopK,
		"predictions": preds,
	})
}

type visionAskReq struct {
	Question    string `json:"question"`
	ImageBase64 string `json:"image_base64"`
}

func (h *Handler) AskImage(c *gin.Context) {
	if h.VisionVLM == nil {
		common.Fail(c, http.StatusServiceUnavailable, 50302, "vision chat not configured")
		return
	}

	maxBytes := h.Cfg.VisionMaxImageBytes
	if maxBytes <= 0 {
		maxBytes = int64(200 * 1024 * 1024)
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)

	question := ""
	var imgBytes []byte
	mimeType := ""

	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "application/json") {
		var req visionAskReq
		if err := c.ShouldBindJSON(&req); err != nil {
			common.Fail(c, http.StatusBadRequest, 10001, "invalid json")
			return
		}
		question = strings.TrimSpace(req.Question)
		if question == "" {
			common.Fail(c, http.StatusBadRequest, 10002, "question required")
			return
		}
		if strings.TrimSpace(req.ImageBase64) == "" {
			common.Fail(c, http.StatusBadRequest, 10003, "image_base64 required")
			return
		}
		b, err := decodeBase64Image(req.ImageBase64)
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10004, "invalid base64 image")
			return
		}
		imgBytes = b
		mimeType = http.DetectContentType(imgBytes)
	} else {
		if err := c.Request.ParseMultipartForm(maxBytes); err != nil && !errors.Is(err, http.ErrNotMultipart) {
			common.Fail(c, http.StatusBadRequest, 10001, "invalid multipart")
			return
		}
		question = strings.TrimSpace(c.PostForm("question"))
		if question == "" {
			common.Fail(c, http.StatusBadRequest, 10002, "question required")
			return
		}
		file, err := c.FormFile("image")
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10003, "image file required")
			return
		}
		if file.Size > maxBytes {
			common.Fail(c, http.StatusRequestEntityTooLarge, 10005, "image too large")
			return
		}
		src, err := file.Open()
		if err != nil {
			common.Fail(c, http.StatusBadRequest, 10006, "failed to read image")
			return
		}
		defer src.Close()
		buf := new(bytes.Buffer)
		if _, err := buf.ReadFrom(src); err != nil {
			common.Fail(c, http.StatusBadRequest, 10006, "failed to read image")
			return
		}
		imgBytes = buf.Bytes()
		mimeType = file.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = http.DetectContentType(imgBytes)
		}
		if ext := filepath.Ext(file.Filename); mimeType == "application/octet-stream" && ext != "" {
			if mt := mime.TypeByExtension(ext); mt != "" {
				mimeType = mt
			}
		}
	}

	answer, err := h.VisionVLM.Ask(c.Request.Context(), question, imgBytes, mimeType)
	if err != nil {
		if errors.Is(err, vision.ErrQuotaExceeded) {
			common.Fail(c, http.StatusTooManyRequests, 42901, "vision quota exceeded")
			return
		}
		log.Printf("vision ask failed: %v", err)
		common.Fail(c, http.StatusInternalServerError, 50002, "vision chat failed: "+err.Error())
		return
	}

	common.OK(c, gin.H{
		"answer": answer,
	})
}

func parseTopK(raw string) int {
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return n
}

func decodeBase64Image(s string) ([]byte, error) {
	raw := strings.TrimSpace(s)
	if idx := strings.Index(raw, ","); idx != -1 && strings.Contains(raw[:idx], "base64") {
		raw = raw[idx+1:]
	}
	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err == nil {
		return decoded, nil
	}
	return base64.RawStdEncoding.DecodeString(raw)
}
