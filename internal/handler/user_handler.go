package handler

import (
	"complain/internal/models" // Make sure your module name is correct
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// The UserHandler now needs the AuthService to generate tokens.
type UserHandler struct {
	DB   *sqlx.DB
	Auth *AuthService // Dependency for Auth Service
}

// NewUserHandler is updated to accept and store both dependencies.
func NewUserHandler(db *sqlx.DB, auth *AuthService) *UserHandler {
	return &UserHandler{
		DB:   db,
		Auth: auth,
	}
}

func (h *UserHandler) Register(c *gin.Context) {
	var r models.RegisterRequest

	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(r.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	query := `INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id`
	var newUserID int64 // Use int64 for DB IDs
	err = h.DB.QueryRow(query, r.Name, r.Email, string(hashedPassword)).Scan(&newUserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": err.Error()})
		// This return was missing before
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user_id": newUserID,
	})
}

// THIS IS THE FULLY CORRECTED LOGIN FUNCTION
func (h *UserHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User // Use the full user model to get all data
	query := "SELECT id, role, password_hash FROM users WHERE email=$1"

	// --- LOGIC IS NOW IN THE CORRECT ORDER ---

	// 1. Find user in database.
	err := h.DB.Get(&user, query, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			// User not found - send a generic, secure error.
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		// Any other database error.
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// 2. If user was found, compare the password.
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		// Password does not match - send the SAME generic error for security.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 3. If password is correct, generate a token using the AuthService.
	tokenString, err := h.Auth.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 4. Send success response with the token.
	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully logged in",
		"token":   tokenString,
	})
}

func(h *UserHandler) PromoteUser(c *gin.Context){
	
}