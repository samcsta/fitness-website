const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user
router.get('/logout', authController.logout);

// Get current user
router.get('/me', authController.getCurrentUser);

// Update profile
router.put('/profile', authController.updateProfile);

// Change password
router.put('/password', authController.changePassword);

// Login page - render login view
router.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', { error: null });
});

// Register page - render register view
router.get('/register', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('register', { error: null });
});

module.exports = router;