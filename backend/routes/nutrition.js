const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken, requireTrainer, canAccessClient } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get trainer's nutrition plans
router.get('/trainer/:trainerId/plans', authenticateToken, requireTrainer, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    if (parseInt(trainerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    await db.connect();

    const plans = await db.all(`
      SELECT np.*, u.name as client_name, u.surname as client_surname
      FROM nutrition_plans np
      LEFT JOIN users u ON np.client_id = u.id
      WHERE np.trainer_id = ? AND np.is_active = 1
      ORDER BY np.created_at DESC
    `, [trainerId]);

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Get nutrition plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei piani nutrizionali'
    });
  }
});

// Create nutrition plan
router.post('/plans', [
  authenticateToken,
  requireTrainer,
  body('name').trim().isLength({ min: 2 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      client_id,
      target_calories,
      target_protein,
      target_carbs,
      target_fats
    } = req.body;

    await db.connect();

    // If client_id provided, verify trainer owns this client
    if (client_id) {
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [client_id, req.user.id]
      );
      
      if (!client) {
        return res.status(400).json({
          success: false,
          message: 'Cliente non valido'
        });
      }
    }

    const result = await db.run(`
      INSERT INTO nutrition_plans (
        name, description, trainer_id, client_id,
        target_calories, target_protein, target_carbs, target_fats
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description,
      req.user.id,
      client_id || null,
      target_calories || null,
      target_protein || null,
      target_carbs || null,
      target_fats || null
    ]);

    const plan = await db.get(
      'SELECT * FROM nutrition_plans WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Piano nutrizionale creato con successo',
      plan
    });

  } catch (error) {
    console.error('Create nutrition plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del piano nutrizionale'
    });
  }
});

// Get nutrition plan with details
router.get('/plans/:planId', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.params;

    await db.connect();

    // Get plan
    const plan = await db.get(
      'SELECT * FROM nutrition_plans WHERE id = ? AND is_active = 1',
      [planId]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Piano nutrizionale non trovato'
      });
    }

    // Check access permissions
    if (req.user.role === 'trainer' && plan.trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    if (req.user.role === 'client' && plan.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    // Get nutrition days
    const days = await db.all(`
      SELECT * FROM nutrition_days 
      WHERE plan_id = ? 
      ORDER BY day_number
    `, [planId]);

    // Get meals for each day
    for (let day of days) {
      const meals = await db.all(`
        SELECT * FROM meals 
        WHERE day_id = ? 
        ORDER BY meal_order, type
      `, [day.id]);

      // Get food items for each meal
      for (let meal of meals) {
        const foods = await db.all(`
          SELECT * FROM food_items 
          WHERE meal_id = ?
        `, [meal.id]);

        meal.foods = foods;
      }

      day.meals = meals;
    }

    plan.days = days;

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get nutrition plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del piano nutrizionale'
    });
  }
});

// Add nutrition day to plan
router.post('/plans/:planId/days', [
  authenticateToken,
  requireTrainer,
  body('name').trim().isLength({ min: 2 }),
  body('day_number').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }

    const { planId } = req.params;
    const { name, day_number, notes } = req.body;

    await db.connect();

    // Verify trainer owns this plan
    const plan = await db.get(
      'SELECT id FROM nutrition_plans WHERE id = ? AND trainer_id = ?',
      [planId, req.user.id]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Piano nutrizionale non trovato'
      });
    }

    const result = await db.run(`
      INSERT INTO nutrition_days (plan_id, name, day_number, notes)
      VALUES (?, ?, ?, ?)
    `, [planId, name, day_number, notes || null]);

    const day = await db.get(
      'SELECT * FROM nutrition_days WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Giorno aggiunto con successo',
      day
    });

  } catch (error) {
    console.error('Add nutrition day error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta del giorno'
    });
  }
});

// Add meal to nutrition day
router.post('/days/:dayId/meals', [
  authenticateToken,
  requireTrainer,
  body('name').trim().isLength({ min: 2 }),
  body('type').isIn(['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3']),
  body('foods').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }

    const { dayId } = req.params;
    const { name, type, time, notes, foods } = req.body;

    await db.connect();

    // Verify trainer owns this nutrition day
    const dayCheck = await db.get(`
      SELECT nd.id 
      FROM nutrition_days nd
      JOIN nutrition_plans np ON nd.plan_id = np.id
      WHERE nd.id = ? AND np.trainer_id = ?
    `, [dayId, req.user.id]);

    if (!dayCheck) {
      return res.status(404).json({
        success: false,
        message: 'Giorno nutrizionale non trovato'
      });
    }

    // Get next meal order
    const lastMeal = await db.get(
      'SELECT MAX(meal_order) as max_order FROM meals WHERE day_id = ?',
      [dayId]
    );
    const mealOrder = (lastMeal.max_order || 0) + 1;

    // Insert meal
    const result = await db.run(`
      INSERT INTO meals (day_id, name, type, time, notes, meal_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [dayId, name, type, time || null, notes || null, mealOrder]);

    // Insert food items
    for (const food of foods) {
      await db.run(`
        INSERT INTO food_items (
          meal_id, name, brand, quantity, unit,
          calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g,
          image_url, barcode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        result.id,
        food.name,
        food.brand || null,
        food.quantity,
        food.unit || 'g',
        food.calories_per_100g,
        food.protein_per_100g,
        food.carbs_per_100g,
        food.fats_per_100g,
        food.image_url || null,
        food.barcode || null
      ]);
    }

    // Get created meal with foods
    const meal = await db.get('SELECT * FROM meals WHERE id = ?', [result.id]);
    const mealFoods = await db.all('SELECT * FROM food_items WHERE meal_id = ?', [result.id]);
    meal.foods = mealFoods;

    res.status(201).json({
      success: true,
      message: 'Pasto aggiunto con successo',
      meal
    });

  } catch (error) {
    console.error('Add meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta del pasto'
    });
  }
});

// Get client's active nutrition plan
router.get('/client/:clientId/active-plan', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.connect();

    const plan = await db.get(`
      SELECT np.* 
      FROM nutrition_plans np
      WHERE np.client_id = ? AND np.is_active = 1
      ORDER BY np.created_at DESC
      LIMIT 1
    `, [clientId]);

    if (!plan) {
      return res.json({
        success: true,
        plan: null
      });
    }

    // Get today's nutrition plan (simple rotation by day of week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const todaysNutrition = await db.get(`
      SELECT nd.*,
             COUNT(m.id) as meal_count
      FROM nutrition_days nd
      LEFT JOIN meals m ON nd.id = m.day_id
      WHERE nd.plan_id = ? AND nd.day_number = ?
      GROUP BY nd.id
    `, [plan.id, (dayOfWeek === 0 ? 7 : dayOfWeek)]); // Convert Sunday to 7

    plan.todays_nutrition = todaysNutrition;

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get active nutrition plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del piano nutrizionale attivo'
    });
  }
});

// Log food intake
router.post('/food-logs', [
  authenticateToken,
  body('date').isISO8601(),
  body('meal_type').isIn(['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3']),
  body('foods').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dati non validi',
        errors: errors.array()
      });
    }

    const { date, meal_type, foods, weight, notes, photo_urls } = req.body;
    const clientId = req.user.role === 'client' ? req.user.id : req.body.client_id;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'ID cliente richiesto'
      });
    }

    await db.connect();

    const result = await db.run(`
      INSERT INTO food_logs (client_id, date, meal_type, foods, weight, notes, photo_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      clientId,
      date,
      meal_type,
      JSON.stringify(foods),
      weight || null,
      notes || null,
      photo_urls ? JSON.stringify(photo_urls) : null
    ]);

    const log = await db.get('SELECT * FROM food_logs WHERE id = ?', [result.id]);
    
    // Parse JSON fields
    log.foods = JSON.parse(log.foods);
    if (log.photo_urls) {
      log.photo_urls = JSON.parse(log.photo_urls);
    }

    res.status(201).json({
      success: true,
      message: 'Consumo alimentare registrato',
      log
    });

  } catch (error) {
    console.error('Log food error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella registrazione del consumo'
    });
  }
});

// Get food logs for client
router.get('/client/:clientId/food-logs', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { date, limit = 30 } = req.query;

    await db.connect();

    let query = `
      SELECT * FROM food_logs 
      WHERE client_id = ?
    `;
    const params = [clientId];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY logged_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await db.all(query, params);

    // Parse JSON fields
    logs.forEach(log => {
      log.foods = JSON.parse(log.foods);
      if (log.photo_urls) {
        log.photo_urls = JSON.parse(log.photo_urls);
      }
    });

    res.json({
      success: true,
      logs
    });

  } catch (error) {
    console.error('Get food logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei log alimentari'
    });
  }
});

module.exports = router;