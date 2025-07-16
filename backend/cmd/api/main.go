package main

import (
	"complain/internal/handler"
	"complain/internal/services"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"

	//"net/http"
	"github.com/gin-contrib/cors"
)

const jwtSecret = "secretkey"

func main() {
	r := gin.Default()
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	uploader, err := services.NewUploader(
		os.Getenv("MINIO_ACCESS_KEY"),
		os.Getenv("MINIO_SECRET_KEY"),
		"http://"+os.Getenv("MINIO_ENDPOINT"), // Add http:// prefix
		"us-east-1",                           // Default region
		os.Getenv("MINIO_BUCKET"),             // Get bucket name from env
		"http://"+os.Getenv("MINIO_ENDPOINT")+"/"+os.Getenv("MINIO_BUCKET"), // Construct public URL
	)
	if err != nil {
		log.Fatalf("Failed to create uploader: %v", err)
	}

	mailer := services.NewMailer(
		os.Getenv("SMTP_FROM"),
		os.Getenv("SMTP_PASSWORD"),
		os.Getenv("SMTP_HOST"),
		os.Getenv("SMTP_PORT"),
	)

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	conStr := "postgres://complaint_user:complaint_password@localhost:5432/complaints_db?sslmode=disable"
	db, err := sqlx.Connect("pgx", conStr)
	if err != nil {
		log.Fatalf("failed to connect to database %v", err)
	}
	defer db.Close()

	authService := handler.NewAuthService(jwtSecret)
	userHandler := handler.NewUserHandler(db, authService)
	complaintHandler := handler.NewComplaintHandler(db, mailer, uploader)
	categoryHandler := handler.NewCategoryHandler(db)

	r.GET("/ping", func(ctx *gin.Context) {

		err := db.Ping()
		if err != nil {
			ctx.JSON(500, gin.H{
				"message": "db not connected",
				"error":   err.Error(),
			})
			return
		}
		ctx.JSON(200, gin.H{
			"message": "db connected",
		})
	})

	api := r.Group("/api/v1")
	{
		api.POST("/register", userHandler.Register)
		api.POST("/login", userHandler.Login)
		api.GET("/categories", categoryHandler.GetCategories)
		officialandadmin := api.Group("/").Use(authService.AuthMiddleware(), authService.RoleAuthMiddleware("admin", "official"))
		{
			officialandadmin.GET("/allcomplaints", complaintHandler.GetAllComplaints)
			officialandadmin.GET("/complaints", complaintHandler.GetByFilter)
		}
		protected := api.Group("/").Use(authService.AuthMiddleware())
		{
			protected.POST("/complaints", authService.RoleAuthMiddleware("user"), complaintHandler.Create)
			protected.GET("/complaints/my", authService.RoleAuthMiddleware("user"), complaintHandler.GetMyComplaints)

		}
		adminroutes := api.Group("/admin").Use(authService.AuthMiddleware())
		{
			adminroutes.GET("/users", authService.RoleAuthMiddleware("admin"), userHandler.GetAllUsers)
			adminroutes.POST("/users/:id/role", authService.RoleAuthMiddleware("admin"), userHandler.UpdateUser)
			adminroutes.GET("/officials", authService.RoleAuthMiddleware("admin"), userHandler.GetAllOfficials)
		}
		officialroutes := api.Group("/official").Use(authService.AuthMiddleware(), authService.RoleAuthMiddleware("official"))
		{
			officialroutes.POST("/complaints/:id/updates", complaintHandler.AddUpdate)
		}
	}
	r.Run()
}
