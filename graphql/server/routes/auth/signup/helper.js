const bcrypt = require('bcryptjs');

class SignupHelper {
  static validateInput(input) {
    const { name, email, password, userRole } = input;

    if (!name || !email || !password || !userRole) {
      throw new Error('Missing required fields');
    }
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static buildUserData(input, hashedPassword) {
    return {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      username: input.username,

    };
  }
}

module.exports = SignupHelper;
