const express = require('express');
const SignupHelper = require('./helper');
const { generateJWT } = require('../shared/jwt');
const Resolvers = require('../resolvers');

const router = express.Router();

class SignupController {
  static async signup(req, res) {
    console.log('Signup endpoint hit');
    try {
      const input = req.body.input.input;
      console.log('Signup request body:', input);

      SignupHelper.validateInput(input);

      const userExists = await Resolvers.checkUserExists(input.email);
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const hashedPassword = await SignupHelper.hashPassword(input.password);
      const userData = SignupHelper.buildUserData(input, hashedPassword);
      const user = await Resolvers.createUser(userData);
      const userId = user.id;

      const tokenData = generateJWT(
        { id: userId, email: input.email },
      );

      res.status(200).json({
        token: tokenData.token,
        expires_in: tokenData.expires_in,
        user: {
          id: userId,
          name: input.name,
          email: input.email,
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
