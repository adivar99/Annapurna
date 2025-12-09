const Minio = require('minio');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// MinIO client configuration

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// Bucket configurations
const PUBLIC_BUCKET = 'public-images';
const PRIVATE_BUCKET = 'user-files';

// Generate hashed folder name for user
const generateUserFolder = (userId) => {
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
};

// Initialize buckets
const initializeBuckets = async () => {
  try {
    // Create public bucket for images
    const publicExists = await minioClient.bucketExists(PUBLIC_BUCKET);
    if (!publicExists) {
      await minioClient.makeBucket(PUBLIC_BUCKET);
      // Set public read policy for images using MinIO-compatible format
      const publicPolicy = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${PUBLIC_BUCKET}/*`]
        }]
      };
      await minioClient.setBucketPolicy(PUBLIC_BUCKET, JSON.stringify(publicPolicy));
      console.log(`✅ Public bucket '${PUBLIC_BUCKET}' created with public read access`);
    }

    // Create private bucket for user files
    const privateExists = await minioClient.bucketExists(PRIVATE_BUCKET);
    if (!privateExists) {
      await minioClient.makeBucket(PRIVATE_BUCKET);
      console.log(`✅ Private bucket '${PRIVATE_BUCKET}' created`);
    }

    console.log('✅ MinIO buckets initialized successfully');
  } catch (error) {
    let minio_endpoint=`MinIO endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
    console.error(`❌ Error initializing MinIO buckets at ${minio_endpoint}:`, error);
    throw error;
  }
};

// Upload file to user's private folder
const uploadUserFile = async (fileBuffer, fileName, contentType, userId, fileTypeId) => {
  try {
    const userFolder = generateUserFolder(userId);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const objectName = `${userFolder}/${uniqueFileName}`;
    
    const result = await minioClient.putObject(
      PRIVATE_BUCKET,
      objectName,
      fileBuffer,
      fileBuffer.length,
      {
        'Content-Type': contentType,
        'x-user-id': userId,
        'x-file-type-id': fileTypeId,
        'x-original-name': fileName
      }
    );
    
    return {
      objectName,
      bucket: PRIVATE_BUCKET,
      size: fileBuffer.length,
      etag: result.etag,
      userFolder
    };
  } catch (error) {
    console.error('❌ Error uploading user file:', error);
    throw error;
  }
};

// Upload image to public bucket
const uploadPublicImage = async (fileBuffer, fileName, contentType) => {
  try {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const objectName = `images/${uniqueFileName}`;
    
    const result = await minioClient.putObject(
      PUBLIC_BUCKET,
      objectName,
      fileBuffer,
      fileBuffer.length,
      {
        'Content-Type': contentType,
        'x-original-name': fileName
      }
    );
    
    return {
      objectName,
      bucket: PUBLIC_BUCKET,
      size: fileBuffer.length,
      etag: result.etag,
      publicUrl: `http://localhost:9000/${PUBLIC_BUCKET}/${objectName}`
    };
  } catch (error) {
    console.error('❌ Error uploading public image:', error);
    throw error;
  }
};

// Get presigned URL for private file
const getPresignedUrl = async (objectName, expiry = 3600) => {
  try {
    const url = await minioClient.presignedGetObject(PRIVATE_BUCKET, objectName, expiry);
    return url;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    throw error;
  }
};

// Get public image URL
const getPublicImageUrl = (objectName) => {
  const publicUrl = process.env.MINIO_PUBLIC_URL || 
    `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;
  return `${publicUrl}/${PUBLIC_BUCKET}/${objectName}`;
};

// Delete file
const deleteFile = async (objectName, isPublic = false) => {
  try {
    const bucket = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
    await minioClient.removeObject(bucket, objectName);
    return true;
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw error;
  }
};

module.exports = {
  minioClient,
  PUBLIC_BUCKET,
  PRIVATE_BUCKET,
  initializeBuckets,
  uploadUserFile,
  uploadPublicImage,
  getPresignedUrl,
  getPublicImageUrl,
  deleteFile,
  generateUserFolder
};