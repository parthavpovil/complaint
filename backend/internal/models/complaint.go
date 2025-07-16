package models

import "time"

// Complaint matches the 'complaints' table in your database.
// ...existing code...
type Complaint struct {
	ID          int64     `db:"id" json:"id"`
	UserID      int64     `db:"user_id" json:"user_id"`
	Title       string    `db:"title" json:"title"`
	Description string    `db:"description" json:"description"`
	Category    int       `db:"catergory_id" json:"category"`
	Status      string    `db:"status" json:"status"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
	Evidence    string    `db:"evidence" json:"evidence"`
	Location    *string   `db:"location" json:"location"` // PostGIS geography type
	Latitude    float64   `db:"latitude" json:"latitude"`
	Longitude   float64   `db:"longitude" json:"longitude"`
	IsPublic    bool      `json:"ispublic" db:"is_public"`
}

// Category represents a complaint category in the database
type Category struct {
	ID   int    `db:"id" json:"id"`
	Name string `db:"category_name" json:"name"`
}

// CreateComplaintRequest is the structure for a new complaint request.
type CreateComplaintRequest struct {
	Title       string  `json:"title" binding:"required,min=5"`
	Description string  `json:"description" binding:"required,min=10"`
	Category    int     `json:"category" binding:"required"`
	Evidence    string  `json:"evidence"`
	Latitude    float64 `json:"latitude" binding:"required,latitude"`
	Longitude   float64 `json:"longitude" binding:"required,longitude"`
	IsPublic    bool    `json:"is_public" `
}
