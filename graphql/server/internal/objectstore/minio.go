// Package objectstore wraps MinIO: bucket bootstrap, uploads to the public
// and private buckets, presigned download URLs, and deletes.
//
// Two clients are used on purpose. S3 request signatures cover the Host
// header, so a URL presigned against the container-internal endpoint
// (minio:9000) fails in a browser that reaches MinIO via localhost. All data-
// plane calls go through the internal client; the second client exists only
// to mint signatures against the host browsers actually use (MINIO_PUBLIC_URL,
// falling back to the internal endpoint). Presigning performs no network I/O.
package objectstore

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const (
	PublicBucket  = "public-images"
	PrivateBucket = "user-files"

	// PresignExpiry matches the Node server's one-hour download links.
	PresignExpiry = time.Hour

	// userFolderLen is the number of hex chars in the per-user folder prefix;
	// must match the JS generateUserFolder so existing keys stay resolvable.
	userFolderLen = 16
)

// Store is the MinIO-backed file store.
type Store struct {
	api     *minio.Client // data-plane operations (uploads, stats, deletes)
	presign *minio.Client // signs URLs against the browser-facing host

	publicBase string // e.g. http://localhost:9000 (no trailing slash)
}

// New builds the store from config values. publicBase may be empty to reuse
// the internal endpoint (parity with the Node fallback chain).
func New(endpoint string, port int, useSSL bool, accessKey, secretKey, publicBase string) (*Store, error) {
	api, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("build minio client: %w", err)
	}

	signEndpoint := fmt.Sprintf("%s:%d", endpoint, port)
	if publicBase == "" {
		publicBase = publicURLFromParts(endpoint, port, useSSL)
	} else if parsed, err := url.Parse(publicBase); err == nil && parsed.Host != "" {
		signEndpoint = parsed.Host
	}

	presignClient, err := minio.New(signEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("build minio presign client: %w", err)
	}

	return &Store{api: api, presign: presignClient, publicBase: strings.TrimRight(publicBase, "/")}, nil
}

func publicURLFromParts(endpoint string, port int, useSSL bool) string {
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s:%d", scheme, endpoint, port)
}

// EnsureBuckets creates both buckets when missing and applies the public-read
// policy to public-images. The policy JSON is byte-identical to the Node
// server's so bucket behavior does not change across the migration.
func (s *Store) EnsureBuckets(ctx context.Context) error {
	exists, err := s.api.BucketExists(ctx, PublicBucket)
	if err != nil {
		return err
	}
	if !exists {
		if err := s.api.MakeBucket(ctx, PublicBucket, minio.MakeBucketOptions{}); err != nil {
			return err
		}
		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, PublicBucket)
		if err := s.api.SetBucketPolicy(ctx, PublicBucket, policy); err != nil {
			return err
		}
	}

	exists, err = s.api.BucketExists(ctx, PrivateBucket)
	if err != nil {
		return err
	}
	if !exists {
		if err := s.api.MakeBucket(ctx, PrivateBucket, minio.MakeBucketOptions{}); err != nil {
			return err
		}
	}
	return nil
}

// UserFolder derives the private-bucket folder for a user:
// hex(sha256(userID))[:16]. Kept identical to the Node implementation.
func UserFolder(userID string) string {
	sum := sha256.Sum256([]byte(userID))
	return hex.EncodeToString(sum[:])[:userFolderLen]
}

// UploadUserFile stores a private file under <userFolder>/<uuid>.<ext> and
// returns the object name.
func (s *Store) UploadUserFile(ctx context.Context, r io.Reader, size int64, contentType, userID, originalName string) (string, error) {
	objectName := fmt.Sprintf("%s/%s.%s", UserFolder(userID), newUUID(), sanitizedExt(originalName))
	_, err := s.api.PutObject(ctx, PrivateBucket, objectName, r, size, minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"x-user-id":       userID,
			"x-original-name": originalName,
		},
	})
	return objectName, err
}

// UploadPublicImage stores an image as images/<uuid>.<ext> and returns its
// object name and browser-reachable URL.
func (s *Store) UploadPublicImage(ctx context.Context, r io.Reader, size int64, contentType, originalName string) (objectName, publicURL string, err error) {
	objectName = fmt.Sprintf("images/%s.%s", newUUID(), sanitizedExt(originalName))
	if _, err = s.api.PutObject(ctx, PublicBucket, objectName, r, size, minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"x-original-name": originalName,
		},
	}); err != nil {
		return "", "", err
	}
	return objectName, s.PublicImageURL(objectName), nil
}

// PublicImageURL builds the plain (unsigned) URL for a public-bucket object.
func (s *Store) PublicImageURL(objectName string) string {
	return fmt.Sprintf("%s/%s/%s", s.publicBase, PublicBucket, objectName)
}

// StatPrivate reports whether a private object exists and when it was last
// modified (used as uploaded_at).
func (s *Store) StatPrivate(ctx context.Context, objectName string) (time.Time, bool, error) {
	info, err := s.api.StatObject(ctx, PrivateBucket, objectName, minio.StatObjectOptions{})
	if err != nil {
		resp := minio.ToErrorResponse(err)
		if resp.Code == "NoSuchKey" {
			return time.Time{}, false, nil
		}
		return time.Time{}, false, err
	}
	return info.LastModified, true, nil
}

// PresignPrivate mints a GET URL valid for expiry against the public host.
func (s *Store) PresignPrivate(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	u, err := s.presign.PresignedGetObject(ctx, PrivateBucket, objectName, expiry, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// RemovePrivate deletes a private-bucket object.
func (s *Store) RemovePrivate(ctx context.Context, objectName string) error {
	return s.api.RemoveObject(ctx, PrivateBucket, objectName, minio.RemoveObjectOptions{})
}

var extPattern = regexp.MustCompile(`[^A-Za-z0-9]`)

// sanitizedExt extracts a safe extension from an upload's filename, mirroring
// the JS `fileName.split('.').pop()` but clamped to alphanumerics so hostile
// names can't shape object keys. No extension yields "bin".
func sanitizedExt(fileName string) string {
	ext := fileName
	if i := strings.LastIndex(fileName, "."); i >= 0 {
		ext = fileName[i+1:]
	}
	ext = extPattern.ReplaceAllString(ext, "")
	if len(ext) > 8 {
		ext = ext[:8]
	}
	if ext == "" {
		return "bin"
	}
	return ext
}

func newUUID() string {
	return uuid.NewString()
}
