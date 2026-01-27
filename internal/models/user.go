package models

import "time"

type User struct {
	ID           uint64    `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Username     string    `gorm:"size:32;uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
