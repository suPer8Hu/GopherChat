package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	DBDSN         string
	JWTSecret     string
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string
}

func Load() Config {
	// DSN demo：
	// app:apppass@tcp(127.0.0.1:3306)/ai_platform?charset=utf8mb4&parseTime=true&loc=Local
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local",
			"app", "apppass", "127.0.0.1", "3306", "ai_platform",
		)
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-me"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}

	redisDB := 0
	if v := os.Getenv("REDIS_DB"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			redisDB = n
		}
	}

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := 587
	if v := os.Getenv("SMTP_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			smtpPort = n
		}
	}
	smtpFrom := os.Getenv("SMTP_FROM")
	if smtpFrom == "" {
		smtpFrom = os.Getenv("SMTP_USER")
	}

	return Config{
		DBDSN:     dsn,
		JWTSecret: secret,

		RedisAddr:     redisAddr,
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       redisDB,

		SMTPHost: smtpHost,
		SMTPPort: smtpPort,
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		SMTPFrom: smtpFrom,
	}
}
