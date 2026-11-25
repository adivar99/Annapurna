package httpapi

import (
	"mime/multipart"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/adivar99/annapurna-server/internal/objectstore"
	"github.com/go-chi/chi/v5"
)

// maxUploadBytes matches the multer limit.
const maxUploadBytes = 10 << 20

// allowedUploadTypes mirrors the multer file filter.
var allowedUploadTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"application/pdf": true,
	"text/plain":      true,
}

// fileIDPattern restricts :fileId to a safe single path segment (basename of
// an object inside the caller's folder).
var fileIDPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,512}$`)

// uploadFile stores a private per-user file. Ownership needs no table: every
// object lives under sha256(userID)[:16], so callers can only address their
// own folder by construction (the Node patient_files domain this replaces had
// no working access control at all).
func (h *Handlers) uploadFile(w http.ResponseWriter, r *http.Request) {
	file, fileHeader, ok := h.receiveUpload(w, r, "file")
	if !ok {
		return
	}
	defer file.Close()
	contentType := fileHeader.Header.Get("Content-Type")
	if !allowedUploadTypes[contentType] {
		Fail(w, http.StatusBadRequest, "Invalid file type")
		return
	}

	objectName, err := h.Files.UploadUserFile(
		r.Context(), file, fileHeader.Size,
		contentType, userID(r), fileHeader.Filename,
	)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "File upload failed")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"id":           objectName,
			"file_name":    fileHeader.Filename,
			"storage_path": objectName,
			"size":         fileHeader.Size,
			"content_type": contentType,
		},
	})
}

func (h *Handlers) uploadImage(w http.ResponseWriter, r *http.Request) {
	file, fileHeader, ok := h.receiveUpload(w, r, "image")
	if !ok {
		return
	}
	defer file.Close()
	contentType := fileHeader.Header.Get("Content-Type")
	if !allowedUploadTypes[contentType] {
		Fail(w, http.StatusBadRequest, "Invalid file type")
		return
	}
	if !strings.HasPrefix(contentType, "image/") {
		Fail(w, http.StatusBadRequest, "Only images are allowed")
		return
	}
	if fileHeader.Size > maxUploadBytes {
		Fail(w, http.StatusBadRequest, "File too large. Maximum size is 10MB.")
		return
	}

	objectName, publicURL, err := h.Files.UploadPublicImage(
		r.Context(), file, fileHeader.Size,
		contentType, fileHeader.Filename,
	)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Image upload failed")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"file_name":   fileHeader.Filename,
			"public_url":  publicURL,
			"object_name": objectName,
			"size":        fileHeader.Size,
		},
	})
}

// receiveUpload parses the multipart form and fetches the named field with
// its open file handle, writing the error response itself when something is
// off.
func (h *Handlers) receiveUpload(w http.ResponseWriter, r *http.Request, field string) (multipart.File, *multipart.FileHeader, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20) // envelope slack around the 10MB payload
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		Fail(w, http.StatusBadRequest, "File too large. Maximum size is 10MB.")
		return nil, nil, false
	}
	file, header, err := r.FormFile(field)
	if err != nil {
		Fail(w, http.StatusBadRequest, "No file uploaded")
		return nil, nil, false
	}
	if header.Size > maxUploadBytes {
		Fail(w, http.StatusBadRequest, "File too large. Maximum size is 10MB.")
		return nil, nil, false
	}
	return file, header, true
}

func (h *Handlers) getFile(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	objectName, ok := privateObjectName(r, fileID)
	if !ok {
		Fail(w, http.StatusNotFound, "File not found")
		return
	}

	lastModified, exists, err := h.Files.StatPrivate(r.Context(), objectName)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to get file")
		return
	}
	if !exists {
		Fail(w, http.StatusNotFound, "File not found")
		return
	}

	downloadURL, err := h.Files.PresignPrivate(r.Context(), objectName, objectstore.PresignExpiry)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to get file")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"id":           fileID,
			"file_name":    fileID,
			"download_url": downloadURL,
			"expires_in":   int(objectstore.PresignExpiry.Seconds()),
			"uploaded_at":  lastModified.UTC().Format(time.RFC3339),
		},
	})
}

func (h *Handlers) deleteFile(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "fileId")
	objectName, ok := privateObjectName(r, fileID)
	if !ok {
		Fail(w, http.StatusNotFound, "File not found")
		return
	}

	if _, exists, err := h.Files.StatPrivate(r.Context(), objectName); err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to delete file")
		return
	} else if !exists {
		Fail(w, http.StatusNotFound, "File not found")
		return
	}

	if err := h.Files.RemovePrivate(r.Context(), objectName); err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to delete file")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"success": true, "message": "File deleted successfully"})
}

// privateObjectName maps an authenticated caller plus a validated basename
// onto an object key inside their own folder. Foreign ids are structurally
// unreachable — the strongest possible access rule.
func privateObjectName(r *http.Request, fileID string) (string, bool) {
	if fileID == ".." || !fileIDPattern.MatchString(fileID) {
		return "", false
	}
	return objectstore.UserFolder(userID(r)) + "/" + fileID, true
}
