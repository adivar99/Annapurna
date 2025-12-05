const bcrypt = require('bcryptjs');
const Resolvers = require('../resolvers');

class LoginHelper {
  static validateInput(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
  }


  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

 
  static async getRoleSpecificIds(user) {
    let patientId = null;
    let doctorId = null;

    if (user.user_role === 'patient') {
      patientId = await Resolvers.getPatientByUserId(user.id);
    } else if (user.user_role === 'doctor') {
      doctorId = await Resolvers.getDoctorByUserId(user.id);
    }

    return { patientId, doctorId };
  }
}

module.exports = LoginHelper;
