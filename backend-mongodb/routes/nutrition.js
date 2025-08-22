const express = require('express');
const router = express.Router();
const { FoodItem, DailyNutrition, NutritionPlan } = require('../models/Nutrition');
const { auth, authorize } = require('../middleware/auth');

// Food Items Routes

// Search food items
router.get('/foods/search', auth, async (req, res) => {
  try {
    const { query, category, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query di ricerca deve essere di almeno 2 caratteri'
      });
    }

    const searchFilter = {
      $text: { $search: query }
    };

    if (category) {
      searchFilter.category = category;
    }

    const foods = await FoodItem.find(searchFilter)
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      foods
    });

  } catch (error) {
    console.error('Search foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella ricerca degli alimenti'
    });
  }
});

// Get food item by ID
router.get('/foods/:foodId', auth, async (req, res) => {
  try {
    const food = await FoodItem.findById(req.params.foodId);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Alimento non trovato'
      });
    }

    res.json({
      success: true,
      food
    });

  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare l\'alimento'
    });
  }
});

// Create food item (trainers only)
router.post('/foods', auth, authorize('trainer'), async (req, res) => {
  try {
    const foodData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const food = new FoodItem(foodData);
    await food.save();

    res.status(201).json({
      success: true,
      message: 'Alimento creato con successo',
      food
    });

  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione dell\'alimento'
    });
  }
});

// Daily Nutrition Routes

// Get daily nutrition log
router.get('/daily/:date?', auth, async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    let dailyLog = await DailyNutrition.findOne({
      userId: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('meals.foods.foodItem');

    if (!dailyLog) {
      // Create new daily log
      dailyLog = new DailyNutrition({
        userId: req.user.userId,
        date: startOfDay,
        meals: [],
        dailyGoals: {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fat: 65,
          water: 2000
        }
      });
      await dailyLog.save();
    }

    res.json({
      success: true,
      dailyLog
    });

  } catch (error) {
    console.error('Get daily nutrition error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare il log giornaliero'
    });
  }
});

// Add meal to daily log
router.post('/daily/:date/meals', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    let dailyLog = await DailyNutrition.findOne({
      userId: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!dailyLog) {
      dailyLog = new DailyNutrition({
        userId: req.user.userId,
        date: startOfDay,
        meals: [],
        dailyGoals: {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fat: 65,
          water: 2000
        }
      });
    }

    // Create meal
    const meal = {
      ...req.body
    };

    dailyLog.meals.push(meal);

    // Calculate nutrition for the new meal
    const newMeal = dailyLog.meals[dailyLog.meals.length - 1];
    await newMeal.calculateNutrition();
    
    // Recalculate daily totals
    dailyLog.calculateDailyTotals();
    
    await dailyLog.save();

    res.status(201).json({
      success: true,
      message: 'Pasto aggiunto con successo',
      meal: newMeal
    });

  } catch (error) {
    console.error('Add meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta del pasto'
    });
  }
});

// Update meal
router.put('/daily/:date/meals/:mealId', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const dailyLog = await DailyNutrition.findOne({
      userId: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Log giornaliero non trovato'
      });
    }

    const meal = dailyLog.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Pasto non trovato'
      });
    }

    Object.assign(meal, req.body);
    await meal.calculateNutrition();
    dailyLog.calculateDailyTotals();
    
    await dailyLog.save();

    res.json({
      success: true,
      message: 'Pasto aggiornato con successo',
      meal
    });

  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del pasto'
    });
  }
});

// Delete meal
router.delete('/daily/:date/meals/:mealId', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const dailyLog = await DailyNutrition.findOne({
      userId: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Log giornaliero non trovato'
      });
    }

    dailyLog.meals.id(req.params.mealId).remove();
    dailyLog.calculateDailyTotals();
    
    await dailyLog.save();

    res.json({
      success: true,
      message: 'Pasto eliminato con successo'
    });

  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del pasto'
    });
  }
});

// Update water intake
router.put('/daily/:date/water', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    let dailyLog = await DailyNutrition.findOne({
      userId: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!dailyLog) {
      dailyLog = new DailyNutrition({
        userId: req.user.userId,
        date: startOfDay
      });
    }

    dailyLog.waterIntake = amount;
    await dailyLog.save();

    res.json({
      success: true,
      message: 'Consumo di acqua aggiornato',
      waterIntake: dailyLog.waterIntake
    });

  } catch (error) {
    console.error('Update water error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del consumo di acqua'
    });
  }
});

// Nutrition Plans Routes

// Get trainer's nutrition plans
router.get('/plans/trainer/:trainerId', auth, authorize('trainer'), async (req, res) => {
  try {
    const { trainerId } = req.params;

    if (req.user.userId !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi piani'
      });
    }

    const plans = await NutritionPlan.find({
      trainerId,
      isActive: true
    }).populate('clientId', 'name surname');

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Get trainer plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i piani nutrizionali'
    });
  }
});

// Get client's nutrition plans
router.get('/plans/client/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;

    if (req.user.role === 'client' && req.user.userId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi piani'
      });
    }

    if (req.user.role === 'trainer') {
      const User = require('../models/User');
      const client = await User.findById(clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Cliente non autorizzato'
        });
      }
    }

    const plans = await NutritionPlan.find({
      clientId,
      isActive: true
    }).populate('trainerId', 'name surname');

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Get client plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i piani nutrizionali'
    });
  }
});

// Create nutrition plan
router.post('/plans', auth, authorize('trainer'), async (req, res) => {
  try {
    const planData = {
      ...req.body,
      trainerId: req.user.userId
    };

    // Validate client if provided
    if (planData.clientId) {
      const User = require('../models/User');
      const client = await User.findById(planData.clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cliente non valido'
        });
      }
    }

    const plan = new NutritionPlan(planData);
    await plan.save();

    res.status(201).json({
      success: true,
      message: 'Piano nutrizionale creato con successo',
      plan
    });

  } catch (error) {
    console.error('Create nutrition plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del piano nutrizionale'
    });
  }
});

// Get nutrition plan details
router.get('/plans/:planId', auth, async (req, res) => {
  try {
    const plan = await NutritionPlan.findById(req.params.planId)
      .populate('trainerId', 'name surname')
      .populate('clientId', 'name surname')
      .populate('mealPlan.meals.foods.foodItem');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Piano nutrizionale non trovato'
      });
    }

    // Check access
    const hasAccess = 
      plan.trainerId._id.toString() === req.user.userId ||
      (plan.clientId && plan.clientId._id.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato'
      });
    }

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get nutrition plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare il piano nutrizionale'
    });
  }
});

// Nutrition Analytics
router.get('/analytics/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify access
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato'
      });
    }

    if (req.user.role === 'trainer') {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user || user.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Utente non autorizzato'
        });
      }
    }

    const dateFilter = {
      userId,
      date: {
        $gte: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days default
        $lte: new Date(endDate || Date.now())
      }
    };

    // Get nutrition data
    const nutritionData = await DailyNutrition.find(dateFilter)
      .sort({ date: 1 });

    // Calculate analytics
    const analytics = {
      totalDays: nutritionData.length,
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFat: 0,
      adherenceRate: 0,
      dailyData: nutritionData.map(day => ({
        date: day.date,
        calories: day.dailyTotals.calories,
        protein: day.dailyTotals.protein,
        carbs: day.dailyTotals.carbs,
        fat: day.dailyTotals.fat,
        waterIntake: day.waterIntake,
        adherenceRate: day.adherenceRate
      }))
    };

    if (nutritionData.length > 0) {
      const totals = nutritionData.reduce((acc, day) => ({
        calories: acc.calories + day.dailyTotals.calories,
        protein: acc.protein + day.dailyTotals.protein,
        carbs: acc.carbs + day.dailyTotals.carbs,
        fat: acc.fat + day.dailyTotals.fat,
        adherence: acc.adherence + day.adherenceRate
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, adherence: 0 });

      analytics.averageCalories = Math.round(totals.calories / nutritionData.length);
      analytics.averageProtein = Math.round(totals.protein / nutritionData.length);
      analytics.averageCarbs = Math.round(totals.carbs / nutritionData.length);
      analytics.averageFat = Math.round(totals.fat / nutritionData.length);
      analytics.adherenceRate = Math.round(totals.adherence / nutritionData.length);
    }

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Nutrition analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolare le analitiche nutrizionali'
    });
  }
});

module.exports = router;