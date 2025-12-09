const express = require('express');
const signupRouter = require('./signup');
const loginRouter = require('./login');

const router = express.Router();

// Mount auth routes
router.use('/signup', signupRouter);
router.use('/login', loginRouter);

module.exports = router;

