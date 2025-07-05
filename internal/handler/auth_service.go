// Create this file: internal/handler/auth_service.go
package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AppClaims is our custom claims struct.
type AppClaims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// AuthService holds the secret key and all auth-related methods.
type AuthService struct {
	secretKey []byte
}

// NewAuthService is the constructor for our service.
func NewAuthService(secret string) *AuthService {
	return &AuthService{
		secretKey: []byte(secret),
	}
}

// GenerateToken is a method on AuthService.
func (s *AuthService) GenerateToken(userID int64, role string) (string, error) {
	claims := AppClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 72)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

// VerifyToken is a method on AuthService.
func (s *AuthService) VerifyToken(tokenString string) (*AppClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AppClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secretKey, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*AppClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// AuthMiddleware is a method on AuthService.
func (s *AuthService) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Bearer token format is required"})
			return
		}

		tokenString := parts[1]
		// It now correctly calls the VerifyToken method on the service instance.
		claims, err := s.VerifyToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

// RoleAuthMiddleware is also a method on AuthService for consistency.
func (s *AuthService) RoleAuthMiddleware(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole_i, exists := c.Get("userRole")
		if !exists {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "User role not found in context"})
			return
		}
		userRole := userRole_i.(string)
		if userRole != requiredRole {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You are not authorized to perform this action"})
			return
		}
		c.Next()
	}
}