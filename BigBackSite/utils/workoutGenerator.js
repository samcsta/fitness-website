const db = require('../config/database');

/**
 * Workout Generator - Generates PPL (Push Pull Legs) workouts
 * Follows a 6-day split: Push, Pull, Legs, Push, Pull, Legs, Rest
 */
class WorkoutGenerator {
  /**
   * Generate a workout for a specific user and date
   * @param {number} userId - User ID
   * @param {Date} date - Date of the workout
   * @returns {Promise} - Promise that resolves to workout object
   */
  static async generateWorkout(userId, date) {
    try {
      // Determine workout type based on day in cycle
      const workoutType = await this.determineWorkoutType(userId, date);
      
      if (!workoutType) {
        return { type: 'rest', exercises: [] }; // Rest day
      }
      
      // Check if workout already exists for this date and user
      const existingWorkout = await this.getExistingWorkout(userId, date);
      if (existingWorkout) {
        return existingWorkout;
      }
      
      // Create new workout
      const exercises = await this.selectExercisesForWorkout(workoutType);
      const workoutId = await this.saveWorkout(userId, date, workoutType, exercises);
      
      return {
        id: workoutId,
        type: workoutType,
        date: date,
        exercises: exercises
      };
    } catch (error) {
      console.error('Error generating workout:', error);
      throw error;
    }
  }
  
  /**
   * Determine the type of workout for a specific date based on user's history
   * @param {number} userId - User ID
   * @param {Date} date - Date of the workout
   * @returns {Promise<string>} - Promise that resolves to workout type (push, pull, legs, or null for rest)
   */
  static async determineWorkoutType(userId, date) {
    return new Promise((resolve, reject) => {
      // Get the most recent workout to determine cycle position
      db.get(
        `SELECT workout_type, date FROM workouts 
         WHERE user_id = ? 
         ORDER BY date DESC LIMIT 1`,
        [userId],
        (err, lastWorkout) => {
          if (err) {
            return reject(err);
          }
          
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // If Sunday, it's a rest day
          if (dayOfWeek === 0) {
            return resolve(null);
          }
          
          // If no previous workouts, start with push
          if (!lastWorkout) {
            return resolve('push');
          }
          
          // Calculate days since last workout
          const lastWorkoutDate = new Date(lastWorkout.date);
          const dayDifference = Math.floor((dateObj - lastWorkoutDate) / (1000 * 60 * 60 * 24));
          
          // If it's the same day, return the same workout type
          if (dayDifference === 0) {
            return resolve(lastWorkout.workout_type);
          }
          
          // Handle gaps in workouts or determine next in sequence
          let nextWorkout;
          switch (lastWorkout.workout_type) {
            case 'push':
              nextWorkout = 'pull';
              break;
            case 'pull':
              nextWorkout = 'legs';
              break;
            case 'legs':
              nextWorkout = 'push';
              break;
            default:
              nextWorkout = 'push';
          }
          
          resolve(nextWorkout);
        }
      );
    });
  }
  
  /**
   * Check if a workout already exists for a specific date and user
   * @param {number} userId - User ID
   * @param {Date} date - Date to check
   * @returns {Promise} - Promise that resolves to workout or null
   */
  static async getExistingWorkout(userId, date) {
    return new Promise((resolve, reject) => {
      const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      db.get(
        `SELECT w.id, w.workout_type, w.date, w.status
         FROM workouts w
         WHERE w.user_id = ? AND w.date = ?`,
        [userId, dateString],
        (err, workout) => {
          if (err) {
            return reject(err);
          }
          
          if (!workout) {
            return resolve(null);
          }
          
          // Get exercises for this workout
          db.all(
            `SELECT we.id, e.name, e.category, e.muscle_group, we.sets, we.reps, we.weight,
             we.status, r.name as replacement_name, we.notes
             FROM workout_exercises we
             JOIN exercises e ON we.exercise_id = e.id
             LEFT JOIN exercises r ON we.replacement_exercise_id = r.id
             WHERE we.workout_id = ?`,
            [workout.id],
            (err, exercises) => {
              if (err) {
                return reject(err);
              }
              
              resolve({
                id: workout.id,
                type: workout.workout_type,
                date: workout.date,
                status: workout.status,
                exercises: exercises
              });
            }
          );
        }
      );
    });
  }
  
  /**
   * Select exercises for a specific workout type
   * @param {string} workoutType - Type of workout (push, pull, legs)
   * @returns {Promise<Array>} - Promise that resolves to array of exercises
   */
  static async selectExercisesForWorkout(workoutType) {
    return new Promise((resolve, reject) => {
      // Select exercises for the workout type
      db.all(
        `SELECT id, name, category, muscle_group 
         FROM exercises 
         WHERE category = ?`,
        [workoutType],
        (err, allExercises) => {
          if (err) {
            return reject(err);
          }
          
          // Organize exercises by muscle group
          const exercisesByMuscle = {};
          allExercises.forEach(exercise => {
            if (!exercisesByMuscle[exercise.muscle_group]) {
              exercisesByMuscle[exercise.muscle_group] = [];
            }
            exercisesByMuscle[exercise.muscle_group].push(exercise);
          });
          
          // Select a balanced workout with 5-7 exercises
          const selectedExercises = [];
          const muscleGroups = Object.keys(exercisesByMuscle);
          
          // Ensure at least one exercise per muscle group
          muscleGroups.forEach(muscleGroup => {
            const randomIndex = Math.floor(Math.random() * exercisesByMuscle[muscleGroup].length);
            selectedExercises.push({
              ...exercisesByMuscle[muscleGroup][randomIndex],
              sets: 3, // Default values
              reps: 10,
              weight: null,
              status: 'incomplete'
            });
          });
          
          // Add a few more exercises to reach 5-7 total
          const targetExerciseCount = Math.floor(Math.random() * 3) + 5; // 5-7 exercises
          
          while (selectedExercises.length < targetExerciseCount && selectedExercises.length < allExercises.length) {
            // Pick a random muscle group
            const randomMuscleIndex = Math.floor(Math.random() * muscleGroups.length);
            const muscleGroup = muscleGroups[randomMuscleIndex];
            
            // Pick a random exercise from that muscle group that's not already selected
            const availableExercises = exercisesByMuscle[muscleGroup].filter(
              ex => !selectedExercises.some(selected => selected.id === ex.id)
            );
            
            if (availableExercises.length > 0) {
              const randomIndex = Math.floor(Math.random() * availableExercises.length);
              selectedExercises.push({
                ...availableExercises[randomIndex],
                sets: 3,
                reps: 10,
                weight: null,
                status: 'incomplete'
              });
            }
          }
          
          resolve(selectedExercises);
        }
      );
    });
  }
  
  /**
   * Save a new workout to the database
   * @param {number} userId - User ID
   * @param {Date} date - Workout date
   * @param {string} workoutType - Workout type (push, pull, legs)
   * @param {Array} exercises - Array of exercises
   * @returns {Promise<number>} - Promise that resolves to new workout ID
   */
  static async saveWorkout(userId, date, workoutType, exercises) {
    return new Promise((resolve, reject) => {
      const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      db.run(
        `INSERT INTO workouts (user_id, date, workout_type) VALUES (?, ?, ?)`,
        [userId, dateString, workoutType],
        function(err) {
          if (err) {
            return reject(err);
          }
          
          const workoutId = this.lastID;
          
          // Insert workout exercises
          const stmt = db.prepare(
            `INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps) 
             VALUES (?, ?, ?, ?)`
          );
          
          exercises.forEach(exercise => {
            stmt.run(workoutId, exercise.id, exercise.sets, exercise.reps);
          });
          
          stmt.finalize(err => {
            if (err) {
              return reject(err);
            }
            resolve(workoutId);
          });
        }
      );
    });
  }
  
  /**
   * Get a user's workout history
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of workouts to return
   * @returns {Promise<Array>} - Promise that resolves to array of workouts
   */
  static async getWorkoutHistory(userId, limit = 30) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT w.id, w.date, w.workout_type, w.status
         FROM workouts w
         WHERE w.user_id = ?
         ORDER BY w.date DESC
         LIMIT ?`,
        [userId, limit],
        (err, workouts) => {
          if (err) {
            return reject(err);
          }
          resolve(workouts);
        }
      );
    });
  }
}

module.exports = WorkoutGenerator;