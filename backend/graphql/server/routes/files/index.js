const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../auth/shared/jwt');
const { makeGraphQLRequest } = require('../auth/shared/graphql');
const { uploadUserFile, uploadPublicImage, getPresignedUrl, getPublicImageUrl, deleteFile } = require('../../lib/minio-client');
const queries = require('./queries');
const mutations = require('./mutations');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload file (private user file)
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { file_type_id } = req.body;
    let targetPatientId = req.body.patient_id; // The patient this file is for
    const { id: uploaderUserId, user_role: uploaderRole } = req.user;

    if (!file_type_id) {
      return res.status(400).json({
        error: 'file_type_id is required'
      });
    }

    // Upload to MinIO
    const uploadResult = await uploadUserFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      uploaderUserId,
      file_type_id
    );

    // Save to database with transactional integrity
    const fileData = {
      patient_id: targetPatientId,
      file_type_id,
      file_name: req.file.originalname,
      storage_path: uploadResult.objectName,
      metadata: {
        size: uploadResult.size,
        content_type: req.file.mimetype,
        user_folder: uploadResult.userFolder,
        uploaded_by: uploaderUserId,
        uploader_role: uploaderRole
      }
    };

    try {
      const dbResult = await makeGraphQLRequest(mutations.CREATE_PATIENT_FILE, { fileData });

      console.log(`AUDIT: File upload SUCCESS for user [${uploaderUserId}] - File ID: [${dbResult.data.insert_patient_files_one.id}]`);

      res.json({
        success: true,
        data: {
          id: dbResult.data.insert_patient_files_one.id,
          file_name: req.file.originalname,
          storage_path: uploadResult.objectName,
          size: uploadResult.size,
          content_type: req.file.mimetype
        }
      });

    } catch (dbError) {
      // If DB write fails, DELETE the file from MinIO to prevent orphan files
      console.error('Database insertion failed. Rolling back MinIO upload.');
      console.log(`AUDIT: File upload ROLLBACK for user [${uploaderUserId}] - MinIO object: [${uploadResult.objectName}]`);

      try {
        await deleteFile(uploadResult.objectName, false);
        console.log(`AUDIT: Orphan file cleanup SUCCESS for object [${uploadResult.objectName}]`);
      } catch (cleanupError) {
        console.error('Failed to cleanup orphan file:', cleanupError);
      }

      throw dbError; // re-throw the error to be caught by the outer catch
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'File upload failed',
      details: error.message
    });
  }
});

// Upload public image
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Only allow images
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only images are allowed' });
    }

    // Upload to public bucket
    const uploadResult = await uploadPublicImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      data: {
        file_name: req.file.originalname,
        public_url: uploadResult.publicUrl,
        object_name: uploadResult.objectName,
        size: uploadResult.size
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: 'Image upload failed',
      details: error.message
    });
  }
});

// Get file (returns presigned URL for private files)
router.get('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { user_role } = req.user;

    // Check access permissions
    const accessCheck = await canUserAccessFile(req.user.id, user_role, fileId);

    if (!accessCheck.canAccess) {
      console.log(`AUDIT: File Download DENIED - User [${req.user.id}] -> File [${fileId}] = ${accessCheck.reason}`);
      return res.status(403).json({
        error: 'Access denied',
        reason: accessCheck.reason
      });
    }

    // Get file info from database
    const dbResult = await makeGraphQLRequest(queries.GET_FILE_BY_ID, { fileId });
    const file = dbResult.data.patient_files_by_pk;

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate presigned URL for private file
    const presignedUrl = await getPresignedUrl(file.storage_path, 3600); // 1 hour expiry

    console.log(`AUDIT: File Download GRANTED - User [${req.user.id}] -> File [${fileId}] = Presigned URL generated`);

    res.json({
      success: true,
      data: {
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type.name,
        download_url: presignedUrl,
        expires_in: 3600,
        uploaded_at: file.uploaded_at
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      error: 'Failed to get file',
      details: error.message
    });
  }
});

// Get public image URL
router.get('/image/:objectName', (req, res) => {
  try {
    const { objectName } = req.params;
    const publicUrl = getPublicImageUrl(objectName);

    res.json({
      success: true,
      data: {
        image_url: publicUrl
      }
    });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      error: 'Failed to get image',
      details: error.message
    });
  }
});

// Get patient files (with access control)
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { user_role } = req.user;

    // Get accessible files based on user role and permissions
    const files = await getAccessibleFiles(req.user.id, user_role, patientId);

    res.json({
      success: true,
      data: files
    });

  } catch (error) {
    console.error('Get patient files error:', error);
    res.status(500).json({
      error: 'Failed to get patient files',
      details: error.message
    });
  }
});

// Get file types
router.get('/types/list', authenticateToken, async (req, res) => {
  try {
    const dbResult = await makeGraphQLRequest(queries.GET_FILE_TYPES);
    const fileTypes = dbResult.data.file_types;

    res.json({
      success: true,
      data: fileTypes
    });

  } catch (error) {
    console.error('Get file types error:', error);
    res.status(500).json({
      error: 'Failed to get file types',
      details: error.message
    });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { user_role } = req.user;

    // Check access permissions
    const accessCheck = await canUserAccessFile(req.user.id, user_role, fileId);

    if (!accessCheck.canAccess) {
      console.log(`AUDIT: File Delete DENIED - User [${req.user.id}] -> File [${fileId}] = ${accessCheck.reason}`);
      return res.status(403).json({
        error: 'Access denied',
        reason: accessCheck.reason
      });
    }

    // Get file info from database
    const dbResult = await makeGraphQLRequest(queries.GET_FILE_BY_ID, { fileId });
    const file = dbResult.data.patient_files_by_pk;

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from MinIO
    await deleteFile(file.storage_path, false);

    // Delete from database
    await makeGraphQLRequest(mutations.DELETE_PATIENT_FILE, { fileId });

    console.log(`AUDIT: File Delete SUCCESS - User [${req.user.id}] -> File [${fileId}] = File deleted from MinIO and database`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }

  res.status(500).json({ error: 'File upload error', details: error.message });
});

module.exports = router;