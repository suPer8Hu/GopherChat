package email

import (
	"fmt"
	"net/smtp"
)

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

func SendText(cfg SMTPConfig, to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	msg := []byte("" +
		fmt.Sprintf("From: %s\r\n", cfg.From) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n", subject) +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" +
		body +
		"\r\n")

	return smtp.SendMail(addr, auth, cfg.From, []string{to}, msg)
}
