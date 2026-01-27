package redisstore

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Store struct {
	rdb *redis.Client
}

func New(addr, password string, db int) *Store {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	return &Store{rdb: rdb}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.rdb.Ping(ctx).Err()
}

func captchaKey(email string) string {
	return fmt.Sprintf("captcha:email:%s", email)
}

func (s *Store) SetCaptcha(ctx context.Context, email, code string, ttl time.Duration) error {
	return s.rdb.Set(ctx, captchaKey(email), code, ttl).Err()
}

func (s *Store) GetCaptcha(ctx context.Context, email string) (string, error) {
	return s.rdb.Get(ctx, captchaKey(email)).Result()
}

func (s *Store) DeleteCaptcha(ctx context.Context, email string) error {
	return s.rdb.Del(ctx, captchaKey(email)).Err()
}
