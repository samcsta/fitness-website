const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');

// Get all users
router.get('/users', friendsController.getAllUsers);

// Get user profile
router.get('/users/:id', friendsController.getUserProfile);

// Get messages
router.get('/messages', friendsController.getMessages);

// Post message
router.post('/messages', friendsController.postMessage);

// Delete message
router.delete('/messages/:id', friendsController.deleteMessage);

// Render friends page
router.get('/', friendsController.renderFriendsPage);

module.exports = router;