const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT with Hasura headers
 * @param {object} user - User object with id and email
 * @returns {object} JWT token object with token and expires_in
 */
function generateJWT(user) {
  // Create Hasura claims object
  const hasura_claims = {
    'x-hasura-user-id': user.id.toString()
  };

  // Create the JWT payload with proper Hasura structure
  const tokenContents = {
    id: user.id.toString(),
    'https://hasura.io/jwt/claims': hasura_claims
  };

  const token = jwt.sign(tokenContents, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token: token,
    expires_in: JWT_EXPIRES_IN
  };
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract user information from JWT token
 * @param {string} token - JWT token
 * @returns {object} User information extracted from token
 */
function extractUserFromToken(token) {
  const decoded = verifyJWT(token);

  // Check for nested Hasura claims first (standard format)
  let hasuraClaims = decoded['https://hasura.io/jwt/claims'];

  // If not found, check for flat Hasura claims (legacy format)
  if (!hasuraClaims) {
    hasuraClaims = decoded;
  }

  if (!hasuraClaims || !hasuraClaims['x-hasura-user-id']) {
    throw new Error('Invalid token: missing Hasura claims');
  }

  return {
    id: hasuraClaims['x-hasura-user-id'],
  };
}

/**
 * Express middleware to authenticate JWT tokens
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. Invalid token format.'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    // Verify and extract user information from token
    const userInfo = extractUserFromToken(token);

    // Attach user information to request object
    req.user = userInfo;

    // Continue to next middleware/route handler
    next();

  } catch (error) {
    console.error('Token authentication error:', error.message);
    return res.status(401).json({
      error: 'Access denied. Invalid or expired token.',
      details: error.message
    });
  }
}

module.exports = {
  generateJWT,
  verifyJWT,
  extractUserFromToken,
  authenticateToken
};

