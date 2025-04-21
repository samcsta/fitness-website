const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

// Get workout for specific date
router.get('/get', workoutController.getWorkout);

// Update workout status
router.put('/:id/status', workoutController.updateWorkoutStatus);

// Update exercise details
router.put('/exercise/:id', workoutController.updateExercise);

// Get alternative exercises
router.get('/exercise/:id/alternatives', workoutController.getAlternativeExercises);

// Get workout history
router.get('/history', workoutController.getWorkoutHistory);

// Get exercise history
router.get('/exercise/:id/history', workoutController.getExerciseHistory);

// Get all exercises
router.get('/exercises', workoutController.getAllExercises);

// Get exercises by category
router.get('/exercises/:category', workoutController.getExercisesByCategory);

// Render workout page
router.get('/', workoutController.renderWorkoutPage);

module.exports = router;