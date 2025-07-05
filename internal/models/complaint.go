package models

import "time"

// Complaint matches the 'complaints' table in your database.
type Complaint struct {
	ID          int64     `db:"id"`
	UserID      int64     `db:"user_id"`
	Title       string    `db:"title"`
	Description string    `db:"description"`
	Category    string    `db:"category"`
	Status      string    `db:"status"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
	Evidence	string		`db:"evidence`
}

// CreateComplaintRequest is the structure for a new complaint request.
type CreateComplaintRequest struct {
	Title       string `json:"title" binding:"required,min=5"`
	Description string `json:"description" binding:"required,min=10"`
	Category    string `json:"category" binding:"required"`
	Evidence	string `json:"evidence"`
}