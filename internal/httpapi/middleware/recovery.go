package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/common"
)

func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("panic recovered: %v", r)
				common.Fail(c, http.StatusInternalServerError, 20000, "internal server error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
