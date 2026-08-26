const bcrypt = require('bcryptjs');

class LoginHelper {
  static validateInput(login, password) {
    if (!login || !password) {
      throw new Error('Email/Username and password are required');
    }
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = LoginHelper;
