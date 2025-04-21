const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');

// Add food entry to log
router.post('/food', nutritionController.addFoodEntry);

// Update food entry
router.put('/food/:id', nutritionController.updateFoodEntry);

// Delete food entry
router.delete('/food/:id', nutritionController.deleteFoodEntry);

// Get food log for a date
router.get('/food', nutritionController.getFoodLog);

// Search food items
router.get('/food/search', nutritionController.searchFoodItems);

// Add new food item
router.post('/food/item', nutritionController.addFoodItem);

// Log weight
router.post('/weight', nutritionController.logWeight);

// Get weight history
router.get('/weight/history', nutritionController.getWeightHistory);

// Get nutrition summary
router.get('/summary', nutritionController.getNutritionSummary);

// Render food page
router.get('/', nutritionController.renderFoodPage);

module.exports = router;