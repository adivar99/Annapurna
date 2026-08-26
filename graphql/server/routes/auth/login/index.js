const express = require('express');
const LoginHelper = require('./helper');
const { generateJWT } = require('../shared/jwt');
const Resolvers = require('../resolvers');

const router = express.Router();

class LoginController {
  static async login(req, res) {
    try {
      // Support both Hasura Action format ({ input: { input: {...} } }) and direct REST format ({ ... })
      const body = req.body.input?.input || req.body;
      const login = (body.login || body.email || body.username || '').toLowerCase().trim();
      const password = body.password;

      LoginHelper.validateInput(login, password);

      const user = await Resolvers.findUserByEmailOrUsername(login);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await LoginHelper.verifyPassword(password, user.hashed_password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const tokenData = generateJWT(user);

      res.json({
        message: 'Login successful',
        token: tokenData.token,
        expires_in: tokenData.expires_in,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          imageUrl: user.image_url
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
}

// Define route
router.post('/', LoginController.login);

module.exports = router;
