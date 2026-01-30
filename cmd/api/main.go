package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/suPer8Hu/ai-platform/internal/chat"
	"github.com/suPer8Hu/ai-platform/internal/config"
	"github.com/suPer8Hu/ai-platform/internal/db"
	"github.com/suPer8Hu/ai-platform/internal/httpapi"
	"github.com/suPer8Hu/ai-platform/internal/models"
	"github.com/suPer8Hu/ai-platform/internal/store/redisstore"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	cfg := config.Load()
	// MySQL
	database := db.Connect(cfg.DBDSN)
	if err := database.AutoMigrate(&models.User{}, &chat.Message{}, &chat.Session{}); err != nil {
		log.Fatalf("auto migrate failed: %v", err)
	}

	// Redis
	rds := redisstore.New(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := rds.Ping(ctx); err != nil {
		log.Fatalf("redis ping failed: %v", err)
	}

	r := httpapi.NewRouter(database, cfg, rds)

	log.Printf("server listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
