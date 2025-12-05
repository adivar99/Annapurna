const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const HASURA_ENDPOINT = `http://localhost:8080/v1/graphql` || process.env.HASURA_ENDPOINT || 'http://graphql-engine:8080/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

// Helper function to make GraphQL requests to Hasura
async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await axios.post(HASURA_ENDPOINT, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      }
    });
    
    // Check for GraphQL errors in the response
    if (response.data.errors) {
      console.error('GraphQL errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(response.data.errors[0].message || 'GraphQL query failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('GraphQL request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to generate JWT with Hasura headers
function generateJWT(user, patientId = null, doctorId = null) {
  const payload = {
    'x-hasura-user-id': user.id,
    'x-hasura-user-role': user.user_role,
    'x-hasura-default-role': user.user_role,
    'x-hasura-allowed-roles': [user.user_role]
  };

  // Add patient or doctor specific headers
  if (patientId) {
    payload['x-hasura-patient-id'] = patientId;
  }
  if (doctorId) {
    payload['x-hasura-doctor-id'] = doctorId;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Sign up endpoint
router.post('/signup', async (req, res) => {
  console.log('Signup endpoint hit');
  try {
    // Handle both GraphQL action format and direct REST format
    const requestData = req.body.input?.input || req.body;
    const { name, email, password, phone, userRole, dateOfBirth, speciality, licenseNumber, licenseYear, qualifications, medicalHistorySummary } = requestData;

    console.log('Signup request body:', requestData);
    // Validate required fields
    if (!name || !email || !password || !userRole) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('User role:', userRole);
    // Validate user role
    if (!['patient', 'doctor', 'admin', 'assistant'].includes(userRole)) {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    // Validate role-specific required fields
    if (userRole === 'doctor' && (!speciality || !licenseNumber)) {
      return res.status(400).json({ message: 'Doctors must provide speciality and license number' });
    }

    // Check if user already exists
    const checkUserQuery = `
      query CheckUser($email: String!) {
        users(where: {email: {_eq: $email}}) {
          id
        }
      }
    `;

    console.log('Check user query:', checkUserQuery);

    const checkResult = await makeGraphQLRequest(checkUserQuery, { email });
    console.log('Check user result:', checkResult);
    if (checkResult.data.users.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user directly in users table
    const createUserMutation = `
      mutation CreateUser($userData: users_insert_input!) {
        insert_users_one(object: $userData) {
          id
          name
          email
          user_role
          is_active
          created_at
        }
      }
    `;

    const userData = {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      user_role: userRole,
      is_active: true
    };

    console.log('Creating user with data:', userData);
    const userResult = await makeGraphQLRequest(createUserMutation, { userData });
    console.log('User result:', JSON.stringify(userResult, null, 2));
    const userId = userResult.data.insert_users_one.id;

    // Create patient or doctor record if applicable
    let patientId = null;
    let doctorId = null;

    if (userRole === 'patient') {
      const createPatientMutation = `
        mutation CreatePatient($patientData: patients_insert_input!) {
          insert_patients_one(object: $patientData) {
            id
          }
        }
      `;

      const patientData = {
        user_id: userId,
        date_of_birth: dateOfBirth
      };

      const patientResult = await makeGraphQLRequest(createPatientMutation, { patientData });
      patientId = patientResult.data.insert_patients_one.id;
    } else if (userRole === 'doctor') {
      const createDoctorMutation = `
        mutation CreateDoctor($doctorData: doctors_insert_input!) {
          insert_doctors_one(object: $doctorData) {
            id
          }
        }
      `;

      const doctorData = {
        user_id: userId,
        speciality,
        license_number: licenseNumber,
        license_year: licenseYear,
        qualifications: qualifications
      };

      console.log('Creating doctor with data:', doctorData);
      const doctorResult = await makeGraphQLRequest(createDoctorMutation, { doctorData });
      console.log('Doctor result:', JSON.stringify(doctorResult, null, 2));
      doctorId = doctorResult.data.insert_doctors_one.id;
    }

    // Generate JWT
    const token = generateJWT(
      { id: userId, user_role: userRole },
      patientId,
      doctorId
    );

    res.status(200).json({
      token,
      user: {
        id: userId,
        name,
        user_role: userRole
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Handle both GraphQL action format and direct REST format
    const requestData = req.body.input?.input || req.body;
    const { email, password } = requestData;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user with email and get related data
    const loginQuery = `
      query LoginUser($email: String!) {
        users(where: {email: {_eq: $email}}) {
          id
          name
          email
          password
          user_role
          is_active
        }
      }
    `;

    const result = await makeGraphQLRequest(loginQuery, { email });
    
    if (!result.data || !result.data.users || result.data.users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.data.users[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userId = user.id;

    // Get patient or doctor ID based on user role
    let patientId = null;
    let doctorId = null;
    let patientResult = null;

    if (user.user_role === 'patient') {
      const patientQuery = `
        query GetPatient($userId: uuid!) {
          patients(where: {user_id: {_eq: $userId}}) {
            id
            user_id
            date_of_birth
            sex
            medical_histories {
              id
              condition
              diagnosis_date
              notes
            }
            surgical_histories {
              id
              procedure_name
              procedure_date
              notes
            }
            medications {
              id
              medication_name
              dosage
              frequency
              notes
            }
            allergies {
              id
              allergen
              reaction
            }
            family_histories {
              id
              relative
              condition
              notes
            }
            functional_histories {
              id
              history_type
              question
              answer
            }
          }
        }
      `;
      try {
        patientResult = await makeGraphQLRequest(patientQuery, { userId });
        if (patientResult.data && patientResult.data.patients && patientResult.data.patients.length > 0) {
          patientId = patientResult.data.patients[0].id;
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
        patientResult = null;
      }
    } else if (user.user_role === 'doctor') {
      const doctorQuery = `
        query GetDoctor($userId: uuid!) {
          doctors(where: {user_id: {_eq: $userId}}) {
            id
          }
        }
      `;
      const doctorResult = await makeGraphQLRequest(doctorQuery, { userId });
      if (doctorResult.data && doctorResult.data.doctors && doctorResult.data.doctors.length > 0) {
        doctorId = doctorResult.data.doctors[0].id;
      }
    }

    // Generate JWT
    const token = generateJWT(user, patientId, doctorId);

    // Prepare response data
    const responseData = {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        user_role: user.user_role
      }
    };

    // Add patient data if user is a patient
    if (user.user_role === 'patient' && patientResult && patientResult.data && patientResult.data.patients && patientResult.data.patients.length > 0) {
      responseData.patientData = patientResult.data.patients[0];
    }

    res.json(responseData);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
