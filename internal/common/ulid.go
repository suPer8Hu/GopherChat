package common

import (
	"crypto/rand"
	"time"

	"github.com/oklog/ulid/v2"
)

// job ID generation
func NewULID() (string, error) {
	t := time.Now().UTC()
	entropy := ulid.Monotonic(rand.Reader, 0)
	return ulid.MustNew(ulid.Timestamp(t), entropy).String(), nil
}
