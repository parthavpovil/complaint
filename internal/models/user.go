package models
import(
	"time"
)

type User struct{
	ID int64 `db:"id"`
	Name string `db:"name"`
	Email string `db:"email"`
	PasswordHash string `db:"password_hash"`
	Role string `db:"role"`
	CreatedAt time.Time `db:"created_at"`
}

type RegisterRequest struct {
    Name     string `json:"name" binding:"required"`
    Email    string `json:"email" binding:"required,email"` // Essential for login/uniqueness
    Password string `json:"password"binding:"required,min=8"`
}
type LoginRequest struct{
	 Email    string `json:"email" binding:"required,email"` // Essential for login/uniqueness
    Password string `json:"password"binding:"required,min=8"`
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}
