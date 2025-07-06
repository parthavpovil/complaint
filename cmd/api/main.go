package main

import (
	"log"
	"complain/internal/handler"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	//"net/http"
)

const jwtSecret = "secretkey" // The same secret

func main(){
	r:=gin.Default()


	conStr:="postgres://complaint_user:complaint_password@localhost:5432/complaints_db?sslmode=disable"
	db,err:=sqlx.Connect("pgx",conStr)
	if err!=nil{
		log.Fatalf("failed to connect to database %v",err)
	}
	defer db.Close()

	authService := handler.NewAuthService(jwtSecret)
	userHandler:=handler.NewUserHandler(db,authService)
	complaintHandler:=handler.NewComplaintHandler(db)

	r.GET("/ping",func(ctx *gin.Context) {

		err:=db.Ping()
		if err!=nil{
			ctx.JSON(500,gin.H{
				"message":"db not connected",
				"error":err.Error(),
			})
			return
		}
		ctx.JSON(200,gin.H{
			"message":"db connected",
		})
	})
	api:=r.Group("/api/v1")
	{
		api.POST("/register",userHandler.Register)
		api.POST("/login",userHandler.Login)
		api.GET("/allcomplaints",authService.AuthMiddleware(),authService.RoleAuthMiddleware("admin","official"),complaintHandler.GetAllComplaints)

		protected:=api.Group("/").Use(authService.AuthMiddleware())
		{
			protected.POST("/complaints",authService.RoleAuthMiddleware("user"),complaintHandler.Create)
			protected.GET("/complaints/my",authService.RoleAuthMiddleware("user"),complaintHandler.GetMyComplaints)

		}
		adminroutes:=api.Group("/admin").Use(authService.AuthMiddleware())
		{
			adminroutes.POST("users/:id/role",authService.RoleAuthMiddleware("admin"),userHandler.UpdateUser)
		}
		officialroutes:=api.Group("/official").Use(authService.AuthMiddleware(),authService.RoleAuthMiddleware("official"))
		{
			officialroutes.POST("/complaints/:id/updates",complaintHandler.AddUpdate)
		}
	}
	r.Run()
}