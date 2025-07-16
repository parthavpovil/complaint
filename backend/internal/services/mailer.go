// internal/services/mailer.go
package services

import (
    "fmt"
    "net/smtp"
)

type Mailer struct {
    From     string
    Password string
    Host     string
    Port     string
}

func NewMailer(from, password, host, port string) *Mailer {
    return &Mailer{
        From:     from,
        Password: password,
        Host:     host,
        Port:     port,
    }
}

func (m *Mailer) SendComplaintConfirmation(to string, title string, complaintID int64) error {
    auth := smtp.PlainAuth("", m.From, m.Password, m.Host)
    
    subject := "Complaint Registered Successfully"
    body := fmt.Sprintf(`
Dear User,

Your complaint "%s" has been successfully registered with ID: %d.
We will process your complaint and keep you updated.

Thank you for using our service.

Best regards,
Complaint Management Team
`, title, complaintID)

    msg := []byte(fmt.Sprintf("To: %s\r\n"+
        "Subject: %s\r\n"+
        "\r\n"+
        "%s\r\n", to, subject, body))

    addr := fmt.Sprintf("%s:%s", m.Host, m.Port)
    return smtp.SendMail(addr, auth, m.From, []string{to}, msg)
}