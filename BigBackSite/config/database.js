const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Database connection
const dbPath = path.join(dataDir, 'vytryx.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDb();
  }
});

// Initialize database with required tables
function initDb() {
  db.serialize(() => {
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
    
    console.log('Database tables created successfully');
  });
}

// Export the database connection
module.exports = db;
