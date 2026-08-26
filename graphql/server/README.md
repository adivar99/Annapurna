# Capstone Server

Express server with authentication for the capstone project.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the server directory with the following variables:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=postgres

# Hasura Configuration
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey
HASURA_GRAPHQL_METADATA_DATABASE_URL=postgres://postgres:postgrespassword@postgres:5432/postgres
PG_DATABASE_URL=postgres://postgres:postgrespassword@postgres:5432/postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
HASURA_ENDPOINT=http://localhost:8080/v1/graphql
```

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

#### POST /api/auth/signup

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "userRole": "patient", // or "doctor", "admin", "assistant"
  "dateOfBirth": "1990-01-01", // required for patients
  "speciality": "Cardiology", // required for doctors
  "licenseNumber": "MD123456", // required for doctors
  "licenseYear": 2015 // required for doctors
}
```

**Response:**

```json
{
  "message": "User created successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "user_role": "patient"
  }
}
```

#### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "user_role": "patient"
  }
}
```

### GraphQL

#### POST /graphql

GraphQL endpoint with schema definitions for Hasura actions.

**Available Types:**

- `Session` - Contains token and user information
- `User` - User profile information
- `LoginInput` - Input for login mutation
- `SignupInput` - Input for signup mutation

## JWT Token Structure

The JWT token includes the following Hasura-compatible headers:

```json
{
  "x-hasura-user-id": "user-uuid",
  "x-hasura-user-role": "patient|doctor|admin|assistant",
  "x-hasura-default-role": "patient|doctor|admin|assistant",
  "x-hasura-allowed-roles": ["patient|doctor|admin|assistant"],
  "x-hasura-patient-id": "patient-uuid", // only for patients
  "x-hasura-doctor-id": "doctor-uuid" // only for doctors
}
```

## Health Check

#### GET /health

Returns server status and timestamp.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
