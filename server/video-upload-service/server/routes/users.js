const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


// List all users info (Admin only)
router.route('/')
    .get(userController.authenticateToken, userController.getUsersInfo);

// User registration
router.route('/register')
    .post(userController.register);

// User login
router.route('/login')
    .post(userController.login);

// Forgot password
router.route('/forgot-password')
    .post(userController.forgotPassword);

// Reset password
router.route('/reset-password')
    .post(userController.resetPassword, userController.cleanupUsedPins);


module.exports = router;
