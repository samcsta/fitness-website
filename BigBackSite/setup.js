/**
 * Vytryx Fitness Tracker - Initial Setup
 * This script sets up the database and creates an admin user
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir);
}

// Database connection
const dbPath = path.join(dataDir, 'vytryx.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Vytryx Fitness Tracker - Initial Setup ===');
console.log('This script will set up the database and create an admin user.');
console.log('');

// Run setup
runSetup();

/**
 * Main setup function
 */
async function runSetup() {
  try {
    // Initialize database tables
    await initDatabase();
    
    // Create admin user
    await createAdminUser();
    
    console.log('');
    console.log('Setup completed successfully! ✅');
    console.log('You can now start the application with: npm start');
    rl.close();
  } catch (error) {
    console.error('Error during setup:', error.message);
    rl.close();
    process.exit(1);
  }
}

/**
 * Initialize database tables
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Creating database tables...');
    
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
      
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        is_admin INTEGER DEFAULT 0,
        current_weight REAL,
        target_weight REAL,
        height REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Weights table for tracking weight progress
      db.run(`CREATE TABLE IF NOT EXISTS weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Exercises table
      db.run(`CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        muscle_group TEXT
      )`);

      // Workouts table
      db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        workout_type TEXT NOT NULL,
        status TEXT DEFAULT 'incomplete',
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Workout exercises table
      db.run(`CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        sets INTEGER DEFAULT 3,
        reps INTEGER DEFAULT 10,
        weight REAL,
        status TEXT DEFAULT 'incomplete',
        replacement_exercise_id INTEGER,
        notes TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id),
        FOREIGN KEY (replacement_exercise_id) REFERENCES exercises(id)
      )`);

      // Exercise history for tracking progress
      db.run(`CREATE TABLE IF NOT EXISTS exercise_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        date DATE NOT NULL,
        sets INTEGER,
        reps INTEGER,
        weight REAL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      )`);

      // Food items table
      db.run(`CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calories INTEGER,
        protein REAL,
        carbs REAL,
        fat REAL,
        added_sugar REAL,
        serving_size TEXT
      )`);

      // Food log table
      db.run(`CREATE TABLE IF NOT EXISTS food_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        food_item_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        servings REAL NOT NULL,
        calories INTEGER,
        protein REAL,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (food_item_id) REFERENCES food_items(id)
      )`);

      // Messages for group chat
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
    });
    
    // Insert default exercises
    insertDefaultExercises()
      .then(() => {
        console.log('Database tables created successfully');
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Insert default exercises from the provided list
 */
function insertDefaultExercises() {
  return new Promise((resolve, reject) => {
    console.log('Adding default exercises...');
    
    const pushExercises = [
      'Flat Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Dips',
      'Cable Chest Flyes', 'Lateral Raises', 'Tricep Pushdowns', 'Skull Crushers',
      'Machine Chest Press', 'Decline Bench Press', 'Close-Grip Bench Press', 'Front Raises',
      'Cable Crossovers', 'Landmine Press', 'Overhead Tricep Extensions', 'Pec Deck Machine',
      'Push-Ups', 'Diamond Push-Ups', 'Arnold Press', 'Tricep Kickbacks'
    ];
    
    const pullExercises = [
      'Deadlifts', 'Pull-Ups', 'Bent-Over Barbell Rows', 'Lat Pulldowns',
      'T-Bar Rows', 'Face Pulls', 'Seated Cable Rows', 'Shrugs',
      'Barbell Bicep Curls', 'Preacher Curls', 'Hammer Curls', 'Reverse Flyes',
      'Single-Arm Dumbbell Rows', 'Chin-Ups', 'Cable Pullovers', 'Meadows Rows',
      'Rack Pulls', 'Incline Dumbbell Curls', 'Straight-Arm Pulldowns', 'Concentration Curls'
    ];
    
    const legExercises = [
      'Back Squats', 'Front Squats', 'Romanian Deadlifts', 'Leg Press',
      'Hip Thrusts', 'Leg Extensions', 'Leg Curls', 'Standing Calf Raises',
      'Seated Calf Raises', 'Bulgarian Split Squats', 'Walking Lunges', 'Hack Squats',
      'Goblet Squats', 'Good Mornings', 'Sumo Deadlifts', 'Adductor Machine',
      'Abductor Machine', 'Glute Bridges', 'Reverse Hyperextensions', 'Step-Ups'
    ];
    
    const stmt = db.prepare('INSERT OR IGNORE INTO exercises (name, category, muscle_group) VALUES (?, ?, ?)');
    
    pushExercises.forEach(exercise => {
      stmt.run(exercise, 'push', getMuscleGroup(exercise, 'push'));
    });
    
    pullExercises.forEach(exercise => {
      stmt.run(exercise, 'pull', getMuscleGroup(exercise, 'pull'));
    });
    
    legExercises.forEach(exercise => {
      stmt.run(exercise, 'legs', getMuscleGroup(exercise, 'legs'));
    });
    
    stmt.finalize(err => {
      if (err) {
        reject(err);
      } else {
        console.log(`Added ${pushExercises.length + pullExercises.length + legExercises.length} default exercises`);
        resolve();
      }
    });
  });
}

/**
 * Helper function to assign muscle groups based on exercise names
 */
function getMuscleGroup(exercise, category) {
  const exerciseLower = exercise.toLowerCase();
  
  if (category === 'push') {
    if (exerciseLower.includes('bench') || exerciseLower.includes('chest') || exerciseLower.includes('pec') || exerciseLower.includes('flye')) {
      return 'chest';
    } else if (exerciseLower.includes('shoulder') || exerciseLower.includes('press') || exerciseLower.includes('raise') || exerciseLower.includes('arnold')) {
      return 'shoulders';
    } else if (exerciseLower.includes('tricep') || exerciseLower.includes('skull') || exerciseLower.includes('extension') || exerciseLower.includes('close-grip') || exerciseLower.includes('diamond')) {
      return 'triceps';
    }
    return 'chest';
  } else if (category === 'pull') {
    if (exerciseLower.includes('bicep') || exerciseLower.includes('curl')) {
      return 'biceps';
    } else if (exerciseLower.includes('row') || exerciseLower.includes('pull') || exerciseLower.includes('deadlift')) {
      return 'back';
    } else if (exerciseLower.includes('shrug')) {
      return 'traps';
    }
    return 'back';
  } else if (category === 'legs') {
    if (exerciseLower.includes('squat') || exerciseLower.includes('leg press')) {
      return 'quads';
    } else if (exerciseLower.includes('calf')) {
      return 'calves';
    } else if (exerciseLower.includes('ham') || exerciseLower.includes('curl')) {
      return 'hamstrings';
    } else if (exerciseLower.includes('glute') || exerciseLower.includes('hip thrust')) {
      return 'glutes';
    }
    return 'legs';
  }
  
  return 'other';
}

/**
 * Create admin user
 */
async function createAdminUser() {
  console.log('');
  console.log('Creating admin user...');
  
  const adminInfo = await promptAdminInfo();
  
  return new Promise((resolve, reject) => {
    // Check if username or email already exists
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [adminInfo.username, adminInfo.email],
      async (err, user) => {
        if (err) {
          return reject(err);
        }
        
        if (user) {
          return reject(new Error('Username or email already in use'));
        }
        
        try {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminInfo.password, salt);
          
          // Insert admin user
          db.run(
            `INSERT INTO users (username, password, email, first_name, last_name, is_admin) 
             VALUES (?, ?, ?, ?, ?, 1)`,
            [adminInfo.username, hashedPassword, adminInfo.email, adminInfo.firstName, adminInfo.lastName],
            function(err) {
              if (err) {
                return reject(err);
              }
              
              console.log(`Admin user '${adminInfo.username}' created successfully`);
              resolve();
            }
          );
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Prompt for admin user information
 */
function promptAdminInfo() {
  return new Promise(async (resolve) => {
    const adminInfo = {};
    
    adminInfo.username = await askQuestion('Admin username: ');
    adminInfo.password = await askQuestion('Admin password: ');
    adminInfo.email = await askQuestion('Admin email: ');
    adminInfo.firstName = await askQuestion('First name (optional): ');
    adminInfo.lastName = await askQuestion('Last name (optional): ');
    
    resolve(adminInfo);
  });
}

/**
 * Ask a question and return the answer
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}
