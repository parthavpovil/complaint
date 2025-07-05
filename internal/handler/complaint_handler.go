package handler

import (
	"complain/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type ComplaintHandler struct{
	DB *sqlx.DB
}

func NewComplaintHandler(db *sqlx.DB)*ComplaintHandler{
	return&ComplaintHandler{DB:db}
} 

func(h *ComplaintHandler)Create(c *gin.Context){

	userID_i,_:=c.Get("userID")
	userID:=userID_i.(int64)
	var complaint models.CreateComplaintRequest
	var registeredComplaint models.Complaint
	err:=c.BindJSON(&complaint)
	if err!=nil{
		c.JSON(http.StatusBadRequest,gin.H{"error":err.Error()})
	}

	query:=`INSERT INTO complaints  (user_id,title,description,category,evidence ) VALUES($1,$2,$3,$4,$5) 
	RETURNING *`
	h.DB.QueryRowx(query,userID,complaint.Title,complaint.Description,complaint.Category,complaint.Evidence).StructScan(&registeredComplaint)
	
	c.JSON(http.StatusOK,gin.H{"message":"complainted added succefully","data":registeredComplaint})
}

func(h *ComplaintHandler)GetMyComplaints(c *gin.Context){
	var complaints []models.Complaint
	 user_id_i,_:=c.Get("userID")
	 user_id:=user_id_i.(int64)
	query:=`SELECT
        id, user_id, title, description,
        category, status, created_at, updated_at, evidence
    	FROM
        complaints
    	WHERE user_id=$1 ORDER BY created_at DESC`
	err:=h.DB.Select(&complaints,query,user_id)
	if err!=nil{
		c.JSON(http.StatusInternalServerError,gin.H{"error":err.Error()})
		return
	}
	c.JSON(http.StatusOK,gin.H{
		"message":"the complaints are",
		"data":complaints,
	})
}