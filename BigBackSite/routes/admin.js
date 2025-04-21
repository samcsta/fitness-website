const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Get all users
router.get('/users', adminController.getAllUsers);

// Create user
router.post('/users', adminController.createUser);

// Update user
router.put('/users/:id', adminController.updateUser);

// Delete user
router.delete('/users/:id', adminController.deleteUser);

// Render admin page
router.get('/', adminController.renderAdminPage);

module.exports = router;