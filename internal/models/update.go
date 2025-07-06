package models

import "time"

type ComplaintUpdate struct {
	ID          int64     `db:"id" json:"id"`
	ComplaintID int64     `db:"complaint_id" json:"complaint_id"`
	UserID      int64     `db:"user_id" json:"user_id"`
	Comment     string    `db:"comment" json:"comment"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// AddUpdateRequest is the structure for the request body.
type AddUpdateComment struct {
	Comment string `json:"comment" binding:"required,min=10"`
}