package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/suPer8Hu/ai-platform/internal/auth"
	"github.com/suPer8Hu/ai-platform/internal/common"
)

const UserIDKey = "user_id"

func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" {
			common.Fail(c, http.StatusUnauthorized, 40100, "missing authorization header")
			c.Abort()
			return
		}

		parts := strings.SplitN(h, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			common.Fail(c, http.StatusUnauthorized, 40100, "invalid authorization header")
			c.Abort()
			return
		}

		claims, err := auth.ParseJWT(parts[1], jwtSecret)
		if err != nil {
			common.Fail(c, http.StatusUnauthorized, 40102, "invalid token")
			c.Abort()
			return
		}

		c.Set(UserIDKey, claims.UserID) // store and pass it to handler
		c.Next()
	}
}
