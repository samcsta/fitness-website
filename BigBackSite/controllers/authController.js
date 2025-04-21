const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Auth Controller - Handles user authentication
 */
const authController = {
  /**
   * Register a new user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  register: (req, res) => {
    const { username, password, email, firstName, lastName } = req.body;
    
    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }
    
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
        
        try {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Insert new user
          db.run(
            `INSERT INTO users (username, password, email, first_name, last_name) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, firstName, lastName],
            function(err) {
              if (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ error: 'Error creating user' });
              }
              
              const userId = this.lastID;
              
              // Create user session
              req.session.user = {
                id: userId,
                username,
                email,
                firstName,
                lastName,
                isAdmin: 0
              };
              
              res.status(201).json({
                message: 'User registered successfully',
                user: {
                  id: userId,
                  username,
                  email
                }
              });
            }
          );
        } catch (error) {
          console.error('Error hashing password:', error);
          res.status(500).json({ error: 'Server error' });
        }
      }
    );
  },
  
  /**
   * Login a user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  login: (req, res) => {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    db.get(
      `SELECT id, username, password, email, first_name, last_name, is_admin, current_weight
       FROM users 
       WHERE username = ?`,
      [username],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        try {
          // Check password
          const isMatch = await bcrypt.compare(password, user.password);
          
          if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          
          // Create user session
          req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isAdmin: user.is_admin === 1,
            currentWeight: user.current_weight
          };
          
          res.json({
            message: 'Login successful',
            user: {
              id: user.id,
              username: user.username,
              email: user.email
            }
          });
        } catch (error) {
          console.error('Error comparing passwords:', error);
          res.status(500).json({ error: 'Server error' });
        }
      }
    );
  },
  
  /**
   * Logout a user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  logout: (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Error logging out' });
      }
      
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  },
  
  /**
   * Get current user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getCurrentUser: (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        isAdmin: req.session.user.isAdmin,
        currentWeight: req.session.user.currentWeight
      }
    });
  },
  
  /**
   * Update user profile
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateProfile: (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.session.user.id;
    const { email, firstName, lastName, currentWeight, targetWeight, height } = req.body;
    
    db.run(
      `UPDATE users SET 
       email = COALESCE(?, email),
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       current_weight = COALESCE(?, current_weight),
       target_weight = COALESCE(?, target_weight),
       height = COALESCE(?, height)
       WHERE id = ?`,
      [email, firstName, lastName, currentWeight, targetWeight, height, userId],
      function(err) {
        if (err) {
          console.error('Error updating profile:', err);
          return res.status(500).json({ error: 'Error updating profile' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Update session
        if (email) req.session.user.email = email;
        if (firstName) req.session.user.firstName = firstName;
        if (lastName) req.session.user.lastName = lastName;
        if (currentWeight) req.session.user.currentWeight = currentWeight;
        
        res.json({
          message: 'Profile updated successfully',
          user: {
            id: userId,
            username: req.session.user.username,
            email: req.session.user.email,
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName,
            currentWeight
          }
        });
      }
    );
  },
  
  /**
   * Change password
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  changePassword: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.session.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Get current user data
    db.get(
      'SELECT password FROM users WHERE id = ?',
      [userId],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        try {
          // Verify current password
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          
          if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
          }
          
          // Hash new password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);
          
          // Update password
          db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId],
            function(err) {
              if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ error: 'Error updating password' });
              }
              
              res.json({ message: 'Password updated successfully' });
            }
          );
        } catch (error) {
          console.error('Error processing password change:', error);
          res.status(500).json({ error: 'Server error' });
        }
      }
    );
  }
};

module.exports = authController;
