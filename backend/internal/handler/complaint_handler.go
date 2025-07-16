package handler

import (
	"complain/internal/models"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"complain/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type ComplaintHandler struct {
	DB       *sqlx.DB
	Mailer   *services.Mailer
	Uploader *services.Uploader
}

func NewComplaintHandler(db *sqlx.DB, mailer *services.Mailer, uploader *services.Uploader) *ComplaintHandler {
	return &ComplaintHandler{
		DB:       db,
		Mailer:   mailer,
		Uploader: uploader,
	}
}

func (h *ComplaintHandler) Create(c *gin.Context) {

	userID_i, _ := c.Get("userID")
	userID := userID_i.(int64)
	var complaint models.CreateComplaintRequest
	var registeredComplaint models.Complaint

	// Handle multipart form data
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form", "details": err.Error()})
		return
	}

	// Get file if it exists
	evidenceURL := ""
	file, err := c.FormFile("evidence")
	if err == nil && file != nil {
		// If a file was provided, upload it using our uploader service
		url, uploadErr := h.Uploader.UploadFile(file)
		if uploadErr != nil {
			fmt.Printf("Failed to upload file: %v\n", uploadErr)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file", "details": uploadErr.Error()})
			return
		}
		evidenceURL = url
	}

	// Log form data for debugging
	fmt.Printf("Received form data: title=%s, description=%s, category=%s, lat=%s, lon=%s, is_public=%s\n",
		c.PostForm("title"),
		c.PostForm("description"),
		c.PostForm("category"),
		c.PostForm("latitude"),
		c.PostForm("longitude"),
		c.PostForm("is_public"))

	// Bind other form fields
	complaint.Title = c.PostForm("title")
	complaint.Description = c.PostForm("description")
	if categoryStr := c.PostForm("category"); categoryStr != "" {
		categoryInt, err := strconv.Atoi(categoryStr)
		if err != nil {
			fmt.Printf("Invalid category value: %s, error: %v\n", categoryStr, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category value"})
			return
		}
		complaint.Category = categoryInt
	}
	if latStr := c.PostForm("latitude"); latStr != "" {
		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			fmt.Printf("Invalid latitude value: %s, error: %v\n", latStr, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid latitude value"})
			return
		}
		complaint.Latitude = lat
	}
	if lonStr := c.PostForm("longitude"); lonStr != "" {
		lon, err := strconv.ParseFloat(lonStr, 64)
		if err != nil {
			fmt.Printf("Invalid longitude value: %s, error: %v\n", lonStr, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid longitude value"})
			return
		}
		complaint.Longitude = lon
	}
	if isPublicStr := c.PostForm("is_public"); isPublicStr != "" {
		isPublic, err := strconv.ParseBool(isPublicStr)
		if err != nil {
			fmt.Printf("Invalid is_public value: %s, error: %v\n", isPublicStr, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid is_public value"})
			return
		}
		complaint.IsPublic = isPublic
	}

	// Validate required fields
	if complaint.Title == "" || complaint.Description == "" || complaint.Category == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	// Set default status for new complaints
	status := "pending"

	query := `INSERT INTO complaints (
		user_id, title, description, catergory_id, evidence, location, is_public, status
	) VALUES (
		$1, $2, $3, $4, $5, ST_MakePoint($6, $7)::geography, $8, $9
	) RETURNING 
		id, user_id, title, description, catergory_id, status, 
		created_at, updated_at, evidence,
		ST_AsText(location) as location,
		ST_X(location::geometry) as longitude,
		ST_Y(location::geometry) as latitude,
		is_public`

	fmt.Printf("Executing query with values: userID=%d, title=%s, desc=%s, category=%d, evidence=%s, lon=%f, lat=%f, isPublic=%v\n",
		userID, complaint.Title, complaint.Description, complaint.Category, evidenceURL, complaint.Longitude, complaint.Latitude, complaint.IsPublic)

	err = h.DB.QueryRowx(query,
		userID,
		complaint.Title,
		complaint.Description,
		complaint.Category,
		evidenceURL,
		complaint.Longitude,
		complaint.Latitude,
		complaint.IsPublic,
		status,
	).StructScan(&registeredComplaint)

	if err != nil {
		fmt.Printf("Database error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating complaint", "details": err.Error()})
		return
	}

	go func() {
		fmt.Println("Starting email sending process...") // Add logging
		var userEmail string
		err := h.DB.Get(&userEmail, "SELECT email FROM users WHERE id = $1", userID)
		if err != nil {
			fmt.Printf("Failed to get user email for userID %d: %v\n", userID, err)
			return
		}

		fmt.Printf("Sending email to: %s\n", userEmail) // Add logging
		err = h.Mailer.SendComplaintConfirmation(userEmail, complaint.Title, registeredComplaint.ID)
		if err != nil {
			fmt.Printf("Failed to send confirmation email: %v\n", err)
		} else {
			fmt.Printf("Email sent successfully to %s\n", userEmail) // Add logging
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "complainted added succefully", "data": registeredComplaint})
}

func (h *ComplaintHandler) GetMyComplaints(c *gin.Context) {
	var complaints []models.Complaint
	user_id_i, exists := c.Get("userID")
	if !exists {
		fmt.Printf("Error: userID not found in context\n")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	user_id, ok := user_id_i.(int64)
	if !ok {
		fmt.Printf("Error: userID is not int64, got %T\n", user_id_i)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	query := `SELECT
        id, user_id, title, description,
        COALESCE(catergory_id, 0) as catergory_id, status, created_at, updated_at, evidence,
        ST_AsText(location) as location,
        COALESCE(ST_X(location::geometry), 0) as longitude,
        COALESCE(ST_Y(location::geometry), 0) as latitude,
        is_public
    	FROM
        complaints
    	WHERE user_id=$1 ORDER BY created_at DESC`

	fmt.Printf("Fetching complaints for user ID: %d\n", user_id)
	err := h.DB.Select(&complaints, query, user_id)
	if err != nil {
		fmt.Printf("Error fetching user complaints: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complaints", "details": err.Error()})
		return
	}

	fmt.Printf("Found %d complaints for user %d\n", len(complaints), user_id)
	c.JSON(http.StatusOK, gin.H{
		"message": "the complaints are",
		"data":    complaints,
	})
}

func (h *ComplaintHandler) GetAllComplaints(c *gin.Context) {
	var complaints []models.Complaint
	query := ` SELECT 
            id, user_id, title, description, COALESCE(catergory_id, 0) as catergory_id, status,
            created_at, updated_at, evidence,
            ST_AsText(location) as location,is_public
        FROM complaints
        ORDER BY created_at DESC`
	err := h.DB.Select(&complaints, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "complaints retrived sucessfully", "complaints": complaints})

}

func (h *ComplaintHandler) GetComplaintsBy(c *gin.Context) {
	var complaints []models.Complaint
	query := ` SELECT 
            id, user_id, title, description, COALESCE(catergory_id, 0) as catergory_id, status,
            created_at, updated_at, evidence,
            ST_AsText(location) as location,is_public
        FROM complaints
        ORDER BY created_at DESC`
	err := h.DB.Select(&complaints, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "complaints retrived sucessfully", "complaints": complaints})

}

func (h *ComplaintHandler) AddUpdate(c *gin.Context) {
	id := c.Param("id")

	var req models.AddUpdateComment
	user_id_i, _ := c.Get("userID")
	user_id := user_id_i.(int64)

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "error parsing rhe comment ", "error": err.Error()})
		return
	}
	var exists bool
	err = h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM complaints WHERE id = $1)", id).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Complaint not found"})
		return
	}

	var update models.ComplaintUpdate
	query := `INSERT INTO complaint_updates(complaint_id,user_id,comment)
			VALUES($1,$2,$3) RETURNING *`
	err = h.DB.QueryRowx(query, id, user_id, req.Comment).StructScan(&update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "error updating thecomplant db ", "error": err.Error()})
		return
	}
	query = `UPDATE complaints SET status=$1 WHERE id=$2`
	_, err = h.DB.Exec(query, "In_Progress", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "error updating the status  db ", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status updated",
		"details": update})

}

func (h *ComplaintHandler) GetByFilter(c *gin.Context) {
	districtname := c.Query("district")
	category := c.Query("category")
	status := c.Query("status")
	userID := c.Query("userid")
	var temp []models.Complaint
	var conditions []string
	var args []interface{}
	count := 1

	baseQuery := `SELECT
        c.id, c.user_id, c.title, c.description, COALESCE(c.catergory_id, 0) as catergory_id,
        COALESCE(c.status, 'pending') as status, 
        c.created_at, c.updated_at, c.evidence,
        ST_AsText(c.location) as location,
        COALESCE(ST_X(c.location::geometry), 0) as longitude,
        COALESCE(ST_Y(c.location::geometry), 0) as latitude,
        c.is_public
    FROM complaints c`

	// Only join with admin_boundaries if district filter is present
	if districtname != "" {
		baseQuery += " JOIN admin_boundaries b ON ST_Intersects(b.geom, c.location::geometry)"
		conditions = append(conditions, fmt.Sprintf("b.name_2 = $%d", count))
		args = append(args, districtname)
		count++
	}

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", count))
		args = append(args, status)
		count++
	}

	if userID != "" {
		conditions = append(conditions, fmt.Sprintf("c.user_id = $%d", count))
		args = append(args, userID)
		count++
	}

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("c.catergory_id = $%d", count))
		args = append(args, category)
		count++
	}

	// Add WHERE clause if there are conditions
	if len(conditions) > 0 {
		baseQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ORDER BY
	baseQuery += " ORDER BY c.created_at DESC"

	// Execute query with all arguments
	err := h.DB.Select(&temp, baseQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch complaints",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Complaints retrieved successfully",
		"data":    temp,
	})
}
