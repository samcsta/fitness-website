const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Admin Controller - Handles admin operations
 */
const adminController = {
  /**
   * Get all users
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getAllUsers: (req, res) => {
    db.all(
      `SELECT id, username, email, first_name, last_name, is_admin, 
              current_weight, target_weight, created_at
       FROM users
       ORDER BY username`,
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
   * Create a new user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  createUser: async (req, res) => {
    const { username, password, email, firstName, lastName, isAdmin } = req.body;
    
    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }
    
    try {
      // Check if username or email already exists
      db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email],
        async (err, user) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (user) {
            return res.status(400).json({ error: 'Username or email already in use' });
          }
          
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Insert new user
          db.run(
            `INSERT INTO users 
             (username, password, email, first_name, last_name, is_admin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, firstName, lastName, isAdmin ? 1 : 0],
            function(err) {
              if (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ error: 'Error creating user' });
              }
              
              res.status(201).json({
                message: 'User created successfully',
                id: this.lastID,
                username
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  
  /**
   * Update user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateUser: async (req, res) => {
    const userId = req.params.id;
    const { email, firstName, lastName, isAdmin, password } = req.body;
    
    try {
      let hashedPassword = null;
      
      // Hash password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }
      
      // Update user
      let query = `
        UPDATE users SET 
        email = COALESCE(?, email),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name)
      `;
      
      let params = [email, firstName, lastName];
      
      // Include password and admin status if provided
      if (hashedPassword) {
        query += `, password = ?`;
        params.push(hashedPassword);
      }
      
      if (isAdmin !== undefined) {
        query += `, is_admin = ?`;
        params.push(isAdmin ? 1 : 0);
      }
      
      query += ` WHERE id = ?`;
      params.push(userId);
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('Error updating user:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
          message: 'User updated successfully',
          id: userId
        });
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  
  /**
   * Delete user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  deleteUser: (req, res) => {
    const userId = req.params.id;
    
    // Don't allow admin to delete themselves
    if (userId == req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    db.run(
      'DELETE FROM users WHERE id = ?',
      [userId],
      function(err) {
        if (err) {
          console.error('Error deleting user:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Delete related data
        db.run('DELETE FROM workouts WHERE user_id = ?', [userId]);
        db.run('DELETE FROM food_log WHERE user_id = ?', [userId]);
        db.run('DELETE FROM weights WHERE user_id = ?', [userId]);
        db.run('DELETE FROM exercise_history WHERE user_id = ?', [userId]);
        db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
        
        res.json({ message: 'User deleted successfully' });
      }
    );
  },
  
  /**
   * Render admin page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  renderAdminPage: (req, res) => {
    res.render('admin', { 
      user: req.session.user
    });
  }
};

module.exports = adminController;
