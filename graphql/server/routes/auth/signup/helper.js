const bcrypt = require('bcryptjs');

class SignupHelper {
  static validateInput(input) {
    const { name, email, password } = input;

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static buildUserData(input, hashedPassword) {
    return {
      name: input.name,
      email: input.email.toLowerCase().trim(),
      username: input.username ? input.username.trim() : input.email.split('@')[0],
      hashed_password: hashedPassword,
      image_url: input.imageUrl || null
    };
  }
}

module.exports = SignupHelper;
