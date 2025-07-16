package services

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

// Uploader holds the configuration for our S3-compatible client (like MinIO).
type Uploader struct {
	s3Client   *s3.S3
	bucketName string
	publicURL  string
}

// NewUploader creates a new service for uploading files.
// It takes all the necessary configuration to connect to the storage service.
func NewUploader(accessKey, secretKey, endpoint, region, bucketName, publicURL string) (*Uploader, error) {
	// Create the configuration for the S3 client.
	s3Config := &aws.Config{
		// Provide the credentials for authentication.
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		// The endpoint is the address of our storage server (e.g., http://localhost:9000 for MinIO).
		Endpoint:         aws.String(endpoint),
		// The region is required, but for MinIO, it can be a default value.
		Region:           aws.String(region),
		// This setting is required for MinIO and other non-AWS S3 services.
		S3ForcePathStyle: aws.Bool(true),
	}

	// Create a new session with the configuration.
	newSession, err := session.NewSession(s3Config)
	if err != nil {
		return nil, err
	}

	// Create an S3 client from the session. This is the object we use to interact with the service.
	s3Client := s3.New(newSession)

	// Return a new Uploader instance with all the necessary components.
	return &Uploader{
		s3Client:   s3Client,
		bucketName: bucketName,
		publicURL:  publicURL,
	}, nil
}

// UploadFile takes a file from a request, uploads it to the bucket, and returns its public URL.
func (u *Uploader) UploadFile(file *multipart.FileHeader) (string, error) {
	// Open the file to access its content.
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	// 'defer' ensures the file is closed when the function finishes, even if an error occurs.
	defer src.Close()

	// Create a unique filename to prevent files with the same name from overwriting each other.
	// We combine the current time in nanoseconds with the original file's extension.
	// Example: 1678886400123456789.jpg
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))

	// Use the S3 client to upload the file.
	_, err = u.s3Client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(u.bucketName), // The name of the bucket to upload to.
		Key:    aws.String(filename),    // The unique name for the file in the bucket.
		Body:   src,                     // The actual content of the file.
		ACL:    aws.String("public-read"), // Access Control List: makes the file viewable by anyone with the link.
	})
	if err != nil {
		return "", err
	}

	// Construct the full, public URL for the newly uploaded file.
	// Example: "http://localhost:9000/complaints/1678886400123456789.jpg"
	fileURL := fmt.Sprintf("%s/%s", u.publicURL, filename)
	return fileURL, nil
}
