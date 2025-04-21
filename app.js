const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const workoutRoutes = require('./routes/workout');
const nutritionRoutes = require('./routes/nutrition');
const friendsRoutes = require('./routes/friends');

// Import database connection
const db = require('./config/database');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  res.status(403).send('Access denied');
};

// Routes
app.use('/', authRoutes);
app.use('/admin', isAdmin, adminRoutes);
app.use('/workout', isAuthenticated, workoutRoutes);
app.use('/nutrition', isAuthenticated, nutritionRoutes);
app.use('/friends', isAuthenticated, friendsRoutes);

// Home route - redirect to dashboard if logged in
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Dashboard route
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

// Strength page
app.get('/strength', isAuthenticated, (req, res) => {
  res.render('strength', { user: req.session.user });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;