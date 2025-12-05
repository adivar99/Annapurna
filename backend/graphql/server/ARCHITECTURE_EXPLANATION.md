# File Upload System Architecture Explanation

## 🏗️ **Why This Architecture?**

### **The Problem with Direct Hasura URLs**

- **Hasura** can only query database data, not generate MinIO presigned URLs
- **MinIO presigned URLs** require MinIO SDK calls (not possible in Hasura)
- **Security** requires access control logic that's complex for GraphQL

### **The Solution: Express API Layer**

- **Hasura** → Database operations only
- **Express API** → File operations + URL generation + Access control
- **MinIO** → File storage

## 🔄 **Complete Data Flow**

### **1. File Upload Flow**

```
Frontend → Express API → MinIO (upload) → Database (metadata) → Response
```

### **2. File Access Flow**

```
Frontend → Express API → Access Control Check → Database Query → Presigned URL → Response
```

### **3. Doctor Accessing Patient Files**

```
Doctor → Express API → Check Doctor-Patient Relationship → Get Patient Files → Presigned URLs
```

## 🔐 **Access Control Logic**

### **File Access Rules:**

1. **Patients**: Can only access their own files
2. **Doctors**: Can access files of patients they have appointments with
3. **Appointment Status**: Only "confirmed" or "completed" appointments grant access

### **Implementation:**

- `canUserAccessFile()` - Checks if user can access specific file
- `getAccessibleFiles()` - Returns files user can access
- `canDoctorAccessPatient()` - Checks doctor-patient relationship

## 📁 **Storage Structure**

### **Public Bucket (`public-images`)**

```
public-images/
└── images/
    ├── uuid1.jpg  ← Direct URL: http://localhost:9000/public-images/images/uuid1.jpg
    └── uuid2.png
```

### **Private Bucket (`user-files`)**

```
user-files/
├── a1b2c3d4e5f6/  ← Hashed patient ID
│   ├── uuid1.pdf
│   └── uuid2.doc
└── f6e5d4c3b2a1/  ← Hashed doctor ID
    └── uuid3.pdf
```

## 🚀 **API Endpoints & Usage**

### **1. Upload Private File**

```http
POST /api/files/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

Body:
- file: (file)
- file_type_id: (string)
- patient_id: (string)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "file_name": "medical-report.pdf",
    "storage_path": "a1b2c3d4/uuid.pdf",
    "size": 1024000,
    "content_type": "application/pdf"
  }
}
```

### **2. Get File (Presigned URL)**

```http
GET /api/files/{fileId}
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "file_name": "medical-report.pdf",
    "file_type": "Blood Test",
    "download_url": "https://minio-presigned-url...",
    "expires_in": 3600,
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
}
```

### **3. Get Patient Files (with Access Control)**

```http
GET /api/files/patient/{patientId}
Authorization: Bearer <jwt_token>
```

**Access Rules:**

- **Patient**: Gets their own files
- **Doctor**: Gets files only if they have appointments with this patient

## 🔒 **Security Features**

### **Authentication & Authorization**

- JWT tokens required for all endpoints
- Role-based access (patient/doctor)
- File-level access control

### **File Security**

- Private files: Presigned URLs (1-hour expiry)
- Public images: Direct URLs (no expiry)
- Hashed user folders for privacy

### **Access Control Matrix**

| User Type | Own Files | Other Patient Files | Public Images |
| --------- | --------- | ------------------- | ------------- |
| Patient   | ✅ Full   | ❌ No Access        | ✅ Read       |
| Doctor    | ❌ N/A    | ✅ If Appointed     | ✅ Read       |

## 🎯 **Why Not Direct Hasura URLs?**

### **Technical Limitations:**

1. **MinIO SDK**: Hasura can't call MinIO SDK for presigned URLs
2. **Complex Logic**: Access control logic is too complex for GraphQL
3. **Security**: File access needs real-time permission checks

### **Benefits of Express Layer:**

1. **Flexibility**: Complex business logic
2. **Security**: Real-time access control
3. **Performance**: Cached presigned URLs
4. **Maintainability**: Clear separation of concerns

## 🔄 **Alternative Approaches (Not Recommended)**

### **1. Hasura Actions (Complex)**

- Would require custom serverless functions
- More complex deployment
- Harder to maintain

### **2. Direct MinIO URLs (Insecure)**

- No access control
- Security vulnerabilities
- No audit trail

### **3. Database-Only URLs (Not Possible)**

- Can't generate presigned URLs
- Would require public file access

## 📊 **Performance Considerations**

### **Caching Strategy:**

- Presigned URLs cached for 1 hour
- Database queries optimized with indexes
- MinIO bucket policies for public access

### **Scalability:**

- MinIO scales horizontally
- Express API can be load balanced
- Database queries optimized

## 🛠️ **Development Workflow**

### **1. Frontend Integration:**

```javascript
// Upload file
const formData = new FormData();
formData.append("file", file);
formData.append("file_type_id", "1");
formData.append("patient_id", patientId);

const response = await fetch("/api/files/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

// Get file URL
const fileResponse = await fetch(`/api/files/${fileId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { download_url } = await fileResponse.json();
```

### **2. Hasura Integration:**

```graphql
# Get file metadata (no URLs)
query GetPatientFiles($patientId: uuid!) {
  patient_files(where: { patient_id: { _eq: $patientId } }) {
    id
    file_name
    file_type {
      name
    }
    uploaded_at
  }
}
```

This architecture provides the perfect balance of security, performance, and maintainability for your medical file management system!
