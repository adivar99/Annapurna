const express = require('express');
const LoginHelper = require('./helper');
const { generateJWT } = require('../shared/jwt');
const Resolvers = require('../resolvers');

const router = express.Router();

class LoginController {
  static async login(req, res) {
    try {
      const { email, password } = req.body.input.input;
      LoginHelper.validateInput(email, password);

      const user = await Resolvers.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.is_active) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      const isValidPassword = await LoginHelper.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get patient or doctor ID based on user role
      const { patientId, doctorId } = await LoginHelper.getRoleSpecificIds(user);

      // Generate JWT
      const tokenData = generateJWT(user, patientId, doctorId);

      res.json({
        message: 'Login successful',
        token: tokenData.token,
        expires_in: tokenData.expires_in,
        user: {
          id: user.id,
          name: user.name,
          user_role: user.user_role
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

