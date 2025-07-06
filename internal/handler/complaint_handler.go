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

	query:=`INSERT INTO complaints  (user_id,title,description,category,evidence,location,is_public ) VALUES($1,$2,$3,$4,$5,ST_MakePoint($6, $7)::geography,$8) 
	RETURNING id, user_id, title, description, category, status, 
            created_at, updated_at, evidence,
            ST_AsText(location) as location,
			ST_X(location::geometry) as longitude,
            ST_Y(location::geometry) as latitude,
			is_public`
	err=h.DB.QueryRowx(query,userID,complaint.Title,complaint.Description,complaint.Category,complaint.Evidence,complaint.Longitude,complaint.Latitude,complaint.IsPublic).StructScan(&registeredComplaint)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating complaint", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK,gin.H{"message":"complainted added succefully","data":registeredComplaint})
}

func(h *ComplaintHandler)GetMyComplaints(c *gin.Context){
	var complaints []models.Complaint
	 user_id_i,_:=c.Get("userID")
	 user_id:=user_id_i.(int64)
	query:=`SELECT
        id, user_id, title, description,
        category, status, created_at, updated_at, evidence,ST_AsText(location) as location,is_public
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

func (h *ComplaintHandler)GetAllComplaints(c *gin.Context)  {
	var complaints []models.Complaint
	query:=` SELECT 
            id, user_id, title, description, category, status,
            created_at, updated_at, evidence,
            ST_AsText(location) as location,is_public
        FROM complaints
        ORDER BY created_at DESC`
	err:=h.DB.Select(&complaints,query)
	if err!=nil{
		c.JSON(http.StatusInternalServerError,gin.H{"error":err.Error()})
		return
	}
	c.JSON(http.StatusOK,gin.H{"message":"complaints retrived sucessfully","complaints":complaints,})			


	
}

func (h *ComplaintHandler) AddUpdate( c *gin.Context){
	id:=c.Param("id")

	var req models.AddUpdateComment
	user_id_i,_:=c.Get("userID")
	user_id:=user_id_i.(int64)


	err:=c.ShouldBindJSON(&req)
	if err!=nil{
		c.JSON(http.StatusBadRequest,gin.H{"message":"error parsing rhe comment ","error":err.Error()})
		return
	}
  	var exists bool
    err = h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM complaints WHERE id = $1)", id).Scan(&exists)
    if err != nil || !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Complaint not found"})
        return
    }

	var update models.ComplaintUpdate
	query:=`INSERT INTO complaint_updates(complaint_id,user_id,comment)
			VALUES($1,$2,$3) RETURNING *`
    err = h.DB.QueryRowx(query, id, user_id, req.Comment).StructScan(&update)
	if err!=nil{
		c.JSON(http.StatusInternalServerError,gin.H{"message":"error updating thecomplant db ","error":err.Error()})
		return
	}
	query=`UPDATE complaints SET status=$1 WHERE id=$2`
	_,err=h.DB.Exec(query,"In_Progress",id)
	if err!=nil{
		c.JSON(http.StatusInternalServerError,gin.H{"message":"error updating the status  db ","error":err.Error()})
		return
	}
	c.JSON(http.StatusOK,gin.H{"message":"status updated",
								"details":update})	

}