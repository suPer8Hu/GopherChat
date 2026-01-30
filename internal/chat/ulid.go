package chat

import (
	"crypto/rand"
	"time"

	"github.com/oklog/ulid/v2"
)

func NewSessionID() (string, error) {
	entropy := ulid.Monotonic(rand.Reader, 0)
	return ulid.MustNew(ulid.Timestamp(time.Now()), entropy).String(), nil
}
