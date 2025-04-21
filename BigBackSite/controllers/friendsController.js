const db = require('../config/database');

/**
 * Friends Controller - Handles social features and messaging
 */
const friendsController = {
  /**
   * Get all users for friends page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getAllUsers: (req, res) => {
    const userId = req.session.user.id;
    
    db.all(
      `SELECT id, username, first_name, last_name, current_weight
       FROM users
       WHERE id != ?
       ORDER BY username`,
      [userId],
      (err, users) => {
        if (err) {
          console.error('Error getting users:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ users });
      }
    );
  },
  
  /**
   * Get user profile data
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getUserProfile: (req, res) => {
    const profileId = req.params.id;
    
    db.get(
      `SELECT id, username, first_name, last_name, current_weight, target_weight
       FROM users
       WHERE id = ?`,
      [profileId],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Get workout stats
        db.all(
          `SELECT date, status, workout_type
           FROM workouts
           WHERE user_id = ?
           ORDER BY date DESC
           LIMIT 30`,
          [profileId],
          (err, workouts) => {
            if (err) {
              console.error('Error getting workout stats:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            // Get weight history
            db.all(
              `SELECT date, weight
               FROM weights
               WHERE user_id = ?
               ORDER BY date DESC
               LIMIT 30`,
              [profileId],
              (err, weights) => {
                if (err) {
                  console.error('Error getting weight history:', err);
                  return res.status(500).json({ error: 'Server error' });
                }
                
                res.json({
                  user,
                  workouts,
                  weights
                });
              }
            );
          }
        );
      }
    );
  },
  
  /**
   * Get messages for group chat
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getMessages: (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    db.all(
      `SELECT m.id, m.message, m.created_at, 
              m.user_id, u.username, u.first_name, u.last_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit],
      (err, messages) => {
        if (err) {
          console.error('Error getting messages:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ messages: messages.reverse() }); // Return in chronological order
      }
    );
  },
  
  /**
   * Post message to group chat
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  postMessage: (req, res) => {
    const userId = req.session.user.id;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    db.run(
      'INSERT INTO messages (user_id, message) VALUES (?, ?)',
      [userId, message.trim()],
      function(err) {
        if (err) {
          console.error('Error posting message:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        // Get the newly created message with user info
        db.get(
          `SELECT m.id, m.message, m.created_at, 
                  m.user_id, u.username, u.first_name, u.last_name
           FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.id = ?`,
          [this.lastID],
          (err, newMessage) => {
            if (err) {
              console.error('Error retrieving new message:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            res.status(201).json({
              message: 'Message posted',
              data: newMessage
            });
          }
        );
      }
    );
  },
  
  /**
   * Delete message from group chat
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  deleteMessage: (req, res) => {
    const userId = req.session.user.id;
    const messageId = req.params.id;
    
    // Check if message belongs to user
    db.get(
      'SELECT user_id FROM messages WHERE id = ?',
      [messageId],
      (err, message) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!message) {
          return res.status(404).json({ error: 'Message not found' });
        }
        
        if (message.user_id !== userId) {
          return res.status(403).json({ error: 'Cannot delete messages from other users' });
        }
        
        // Delete message
        db.run(
          'DELETE FROM messages WHERE id = ?',
          [messageId],
          function(err) {
            if (err) {
              console.error('Error deleting message:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            res.json({ message: 'Message deleted' });
          }
        );
      }
    );
  },
  
  /**
   * Render friends page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  renderFriendsPage: (req, res) => {
    res.render('friends', { 
      user: req.session.user
    });
  }
};

module.exports = friendsController;