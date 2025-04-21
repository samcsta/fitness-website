const db = require('../config/database');

/**
 * Nutrition Controller - Handles food tracking and weight logging
 */
const nutritionController = {
  /**
   * Add food item to user's log
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  addFoodEntry: (req, res) => {
    const userId = req.session.user.id;
    const { foodItemId, date, time, servings, calories, protein, notes } = req.body;
    
    // Validate required fields
    if (!foodItemId || !date || !time) {
      return res.status(400).json({ error: 'Food item, date, and time are required' });
    }
    
    // Insert food log entry
    db.run(
      `INSERT INTO food_log 
       (user_id, food_item_id, date, time, servings, calories, protein, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, foodItemId, date, time, servings || 1, calories, protein, notes],
      function(err) {
        if (err) {
          console.error('Error adding food entry:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.status(201).json({
          message: 'Food entry added',
          id: this.lastID
        });
      }
    );
  },
  
  /**
   * Update food log entry
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateFoodEntry: (req, res) => {
    const userId = req.session.user.id;
    const entryId = req.params.id;
    const { servings, calories, protein, notes } = req.body;
    
    // Update food log entry
    db.run(
      `UPDATE food_log
       SET servings = COALESCE(?, servings),
           calories = COALESCE(?, calories),
           protein = COALESCE(?, protein),
           notes = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`,
      [servings, calories, protein, notes, entryId, userId],
      function(err) {
        if (err) {
          console.error('Error updating food entry:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Entry not found or not owned by user' });
        }
        
        res.json({ message: 'Food entry updated' });
      }
    );
  },
  
  /**
   * Delete food log entry
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  deleteFoodEntry: (req, res) => {
    const userId = req.session.user.id;
    const entryId = req.params.id;
    
    db.run(
      'DELETE FROM food_log WHERE id = ? AND user_id = ?',
      [entryId, userId],
      function(err) {
        if (err) {
          console.error('Error deleting food entry:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Entry not found or not owned by user' });
        }
        
        res.json({ message: 'Food entry deleted' });
      }
    );
  },
  
  /**
   * Get food log for a specific date
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getFoodLog: (req, res) => {
    const userId = req.session.user.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    db.all(
      `SELECT fl.id, fl.date, fl.time, fl.servings, fl.calories, fl.protein, fl.notes,
              fi.id as food_item_id, fi.name, fi.serving_size, fi.added_sugar
       FROM food_log fl
       JOIN food_items fi ON fl.food_item_id = fi.id
       WHERE fl.user_id = ? AND fl.date = ?
       ORDER BY fl.time`,
      [userId, date],
      (err, entries) => {
        if (err) {
          console.error('Error getting food log:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ entries });
      }
    );
  },
  
  /**
   * Search food items
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  searchFoodItems: (req, res) => {
    const query = req.query.q || '';
    
    if (query.length < 3) {
      return res.json({ items: [] });
    }
    
    db.all(
      `SELECT id, name, calories, protein, carbs, fat, added_sugar, serving_size
       FROM food_items
       WHERE name LIKE ?
       ORDER BY name
       LIMIT 20`,
      [`%${query}%`],
      (err, items) => {
        if (err) {
          console.error('Error searching food items:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ items });
      }
    );
  },
  
  /**
   * Add new food item to database
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  addFoodItem: (req, res) => {
    const { name, calories, protein, carbs, fat, addedSugar, servingSize } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Food name is required' });
    }
    
    db.run(
      `INSERT INTO food_items (name, calories, protein, carbs, fat, added_sugar, serving_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, calories, protein, carbs, fat, addedSugar, servingSize],
      function(err) {
        if (err) {
          console.error('Error adding food item:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.status(201).json({
          message: 'Food item added',
          id: this.lastID,
          name
        });
      }
    );
  },
  
  /**
   * Log user weight
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  logWeight: (req, res) => {
    const userId = req.session.user.id;
    const { weight, date } = req.body;
    
    if (!weight) {
      return res.status(400).json({ error: 'Weight is required' });
    }
    
    const entryDate = date || new Date().toISOString().split('T')[0];
    
    // First, check if there's already a weight entry for this date
    db.get(
      'SELECT id FROM weights WHERE user_id = ? AND date = ?',
      [userId, entryDate],
      (err, existingEntry) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (existingEntry) {
          // Update existing entry
          db.run(
            'UPDATE weights SET weight = ? WHERE id = ?',
            [weight, existingEntry.id],
            function(err) {
              if (err) {
                console.error('Error updating weight:', err);
                return res.status(500).json({ error: 'Server error' });
              }
              
              // Also update current weight in user profile
              db.run(
                'UPDATE users SET current_weight = ? WHERE id = ?',
                [weight, userId]
              );
              
              res.json({ message: 'Weight updated', id: existingEntry.id });
            }
          );
        } else {
          // Insert new entry
          db.run(
            'INSERT INTO weights (user_id, weight, date) VALUES (?, ?, ?)',
            [userId, weight, entryDate],
            function(err) {
              if (err) {
                console.error('Error logging weight:', err);
                return res.status(500).json({ error: 'Server error' });
              }
              
              // Also update current weight in user profile
              db.run(
                'UPDATE users SET current_weight = ? WHERE id = ?',
                [weight, userId]
              );
              
              res.status(201).json({
                message: 'Weight logged',
                id: this.lastID
              });
            }
          );
        }
      }
    );
  },
  
  /**
   * Get weight history
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getWeightHistory: (req, res) => {
    const userId = req.session.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 90; // Default to 90 days
    
    db.all(
      `SELECT id, weight, date
       FROM weights
       WHERE user_id = ?
       ORDER BY date DESC
       LIMIT ?`,
      [userId, limit],
      (err, history) => {
        if (err) {
          console.error('Error getting weight history:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ history });
      }
    );
  },
  
  /**
   * Get nutrition summary for a date range
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getNutritionSummary: (req, res) => {
    const userId = req.session.user.id;
    const startDate = req.query.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end || new Date().toISOString().split('T')[0];
    
    db.all(
      `SELECT fl.date,
              SUM(fl.calories) as total_calories,
              SUM(fl.protein) as total_protein,
              SUM(fi.added_sugar * fl.servings) as total_added_sugar
       FROM food_log fl
       JOIN food_items fi ON fl.food_item_id = fi.id
       WHERE fl.user_id = ? AND fl.date BETWEEN ? AND ?
       GROUP BY fl.date
       ORDER BY fl.date`,
      [userId, startDate, endDate],
      (err, summary) => {
        if (err) {
          console.error('Error getting nutrition summary:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ summary });
      }
    );
  },
  
  /**
   * Render food page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  renderFoodPage: (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    res.render('food', { 
      user: req.session.user,
      date: date
    });
  }
};

module.exports = nutritionController;