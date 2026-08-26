const express = require('express');
const SignupHelper = require('./helper');
const { generateJWT } = require('../shared/jwt');
const Resolvers = require('../resolvers');

const router = express.Router();

class SignupController {
  static async signup(req, res) {
    try {
      // Support both Hasura Action format ({ input: { input: {...} } }) and direct REST format ({ ... })
      const input = req.body.input?.input || req.body;

      SignupHelper.validateInput(input);

      const userExists = await Resolvers.checkUserExists(input.email, input.username);
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email or username' });
      }

      const hashedPassword = await SignupHelper.hashPassword(input.password);
      const userData = SignupHelper.buildUserData(input, hashedPassword);
      const user = await Resolvers.createUser(userData);
      const userId = user.id;

      const tokenData = generateJWT({
        id: userId,
        email: user.email
      });

      res.status(200).json({
        token: tokenData.token,
        expires_in: tokenData.expires_in,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          username: user.username,
          imageUrl: user.image_url
        }
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
}

router.post('/', SignupController.signup);

module.exports = router;
