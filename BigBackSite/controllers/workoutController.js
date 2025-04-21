const db = require('../config/database');
const WorkoutGenerator = require('../utils/workoutGenerator');

/**
 * Workout Controller - Handles workout related operations
 */
const workoutController = {
  /**
   * Get workout for a specific date
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getWorkout: async (req, res) => {
    try {
      const userId = req.session.user.id;
      let date = req.query.date ? new Date(req.query.date) : new Date();
      
      // Generate/retrieve workout for the date
      const workout = await WorkoutGenerator.generateWorkout(userId, date);
      
      res.json({ workout });
    } catch (error) {
      console.error('Error getting workout:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  
  /**
   * Update workout status
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateWorkoutStatus: (req, res) => {
    const userId = req.session.user.id;
    const workoutId = req.params.id;
    const { status } = req.body;
    
    if (!['complete', 'incomplete', 'skipped'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update workout status
    db.run(
      `UPDATE workouts 
       SET status = ? 
       WHERE id = ? AND user_id = ?`,
      [status, workoutId, userId],
      function(err) {
        if (err) {
          console.error('Error updating workout status:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Workout not found or not owned by user' });
        }
        
        res.json({ message: 'Workout status updated', status });
      }
    );
  },
  
  /**
   * Update exercise status and details
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateExercise: (req, res) => {
    const userId = req.session.user.id;
    const exerciseId = req.params.id;
    const { status, sets, reps, weight, replacementExerciseId, notes } = req.body;
    
    // Verify workout belongs to user
    db.get(
      `SELECT w.id 
       FROM workout_exercises we
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.id = ? AND w.user_id = ?`,
      [exerciseId, userId],
      (err, workout) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!workout) {
          return res.status(404).json({ error: 'Exercise not found or not owned by user' });
        }
        
        // Update exercise details
        db.run(
          `UPDATE workout_exercises 
           SET status = COALESCE(?, status),
               sets = COALESCE(?, sets),
               reps = COALESCE(?, reps),
               weight = COALESCE(?, weight),
               replacement_exercise_id = COALESCE(?, replacement_exercise_id),
               notes = COALESCE(?, notes)
           WHERE id = ?`,
          [status, sets, reps, weight, replacementExerciseId, notes, exerciseId],
          function(err) {
            if (err) {
              console.error('Error updating exercise:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            // If exercise is completed with weight, record in exercise history
            if (status === 'complete' && weight) {
              db.get(
                'SELECT exercise_id FROM workout_exercises WHERE id = ?',
                [exerciseId],
                (err, exercise) => {
                  if (err || !exercise) {
                    console.error('Error getting exercise:', err);
                    // Continue with response even if history update fails
                  } else {
                    // Record in exercise history
                    const currentDate = new Date().toISOString().split('T')[0];
                    db.run(
                      `INSERT INTO exercise_history (user_id, exercise_id, date, sets, reps, weight)
                       VALUES (?, ?, ?, ?, ?, ?)`,
                      [userId, exercise.exercise_id, currentDate, sets, reps, weight]
                    );
                  }
                }
              );
            }
            
            res.json({ message: 'Exercise updated', exerciseId });
          }
        );
      }
    );
  },
  
  /**
   * Get alternative exercises for a specific exercise
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getAlternativeExercises: (req, res) => {
    const exerciseId = req.params.id;
    
    // Get exercise details
    db.get(
      'SELECT category, muscle_group FROM exercises WHERE id = ?',
      [exerciseId],
      (err, exercise) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!exercise) {
          return res.status(404).json({ error: 'Exercise not found' });
        }
        
        // Get alternative exercises
        db.all(
          `SELECT id, name, category, muscle_group 
           FROM exercises 
           WHERE id != ? AND category = ? AND muscle_group = ?
           ORDER BY name`,
          [exerciseId, exercise.category, exercise.muscle_group],
          (err, alternatives) => {
            if (err) {
              console.error('Error getting alternative exercises:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            res.json({ alternatives });
          }
        );
      }
    );
  },
  
  /**
   * Get workout history
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getWorkoutHistory: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit) : 30;
      
      const history = await WorkoutGenerator.getWorkoutHistory(userId, limit);
      
      res.json({ history });
    } catch (error) {
      console.error('Error getting workout history:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  
  /**
   * Get exercise history
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getExerciseHistory: (req, res) => {
    const userId = req.session.user.id;
    const exerciseId = req.params.id;
    
    db.all(
      `SELECT eh.id, eh.date, eh.sets, eh.reps, eh.weight, e.name
       FROM exercise_history eh
       JOIN exercises e ON eh.exercise_id = e.id
       WHERE eh.user_id = ? AND eh.exercise_id = ?
       ORDER BY eh.date DESC`,
      [userId, exerciseId],
      (err, history) => {
        if (err) {
          console.error('Error getting exercise history:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ history });
      }
    );
  },
  
  /**
   * Get all exercises
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getAllExercises: (req, res) => {
    db.all(
      `SELECT id, name, category, muscle_group 
       FROM exercises 
       ORDER BY category, muscle_group, name`,
      (err, exercises) => {
        if (err) {
          console.error('Error getting exercises:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ exercises });
      }
    );
  },
  
  /**
   * Get exercises by category
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  getExercisesByCategory: (req, res) => {
    const category = req.params.category;
    
    if (!['push', 'pull', 'legs'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    db.all(
      `SELECT id, name, category, muscle_group 
       FROM exercises 
       WHERE category = ?
       ORDER BY muscle_group, name`,
      [category],
      (err, exercises) => {
        if (err) {
          console.error('Error getting exercises by category:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        
        res.json({ exercises });
      }
    );
  },
  
  /**
   * Render workout page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  renderWorkoutPage: (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    res.render('workout', { 
      user: req.session.user,
      date: date
    });
  },
  
  /**
   * Render strength page
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  renderStrengthPage: (req, res) => {
    res.render('strength', { 
      user: req.session.user
    });
  }
};

module.exports = workoutController;