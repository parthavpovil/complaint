package handler

import (
	"complain/internal/models"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type CategoryHandler struct {
	DB          *sqlx.DB
	cache       []models.Category
	cacheExpiry time.Time
	mutex       sync.Mutex
}

func NewCategoryHandler(db *sqlx.DB) *CategoryHandler {
	return &CategoryHandler{
		DB:          db,
		cache:       make([]models.Category, 0),
		cacheExpiry: time.Time{}, // Zero time
		mutex:       sync.Mutex{},
	}
}

func (h *CategoryHandler) GetCategories(c *gin.Context) {

	h.mutex.Lock()
	defer h.mutex.Unlock()

	if h.cache != nil && time.Now().Before(h.cacheExpiry) {
		c.JSON(http.StatusOK, gin.H{
			"data":   h.cache,
			"source": "cache",
		})
		return
	}

	var categories []models.Category
	query := `SELECT id, category_name FROM category ORDER BY category_name`

	err := h.DB.Select(&categories, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch categories",
			"details": err.Error(),
		})
		return
	}

	h.cache = categories
	h.cacheExpiry = time.Now().Add(1 * time.Hour)

	c.JSON(http.StatusOK, gin.H{
		"data":   categories,
		"source": "database",
	})
}
