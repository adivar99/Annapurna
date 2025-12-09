const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://annapurna_hasura:8080/v1/graphql';
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
function generateJWT(user) {
  const payload = {
    'x-hasura-user-id': user.id,
    'x-hasura-username': user.username
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Sign up endpoint
router.post('/signup', async (req, res) => {
  console.log('Signup endpoint hit');
  try {
    // Handle both GraphQL action format and direct REST format
    const requestData = req.body.input?.input || req.body;
    const { name, email, password, username} = requestData;

    console.log('Signup request body:', requestData);
    // Validate required fields
    if (!name || !email || !password || !username) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
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
          username
          hashed_password
        }
      }
    `;

    const userData = {
      name,
      email,
      hashed_password: hashedPassword,
      username
    };

    console.log('Creating user with data:', userData);
    const userResult = await makeGraphQLRequest(createUserMutation, { userData });
    console.log('User result:', JSON.stringify(userResult, null, 2));
    const userId = userResult.data.insert_users_one.id;

    // Generate JWT
    const token = generateJWT(
      { id: userId, username },
    );

    res.status(200).json({
      token,
      user: {
        id: userId,
        name,
        username
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
          username
          hashed_password
        }
      }
    `;

    const result = await makeGraphQLRequest(loginQuery, { email });
    
    if (!result.data || !result.data.users || result.data.users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.data.users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashed_password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = generateJWT({ id: user.id, username: user.username });

    // Prepare response data
    const responseData = {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
