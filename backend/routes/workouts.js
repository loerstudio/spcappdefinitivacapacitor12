const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken, requireTrainer, canAccessClient } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get trainer's workout programs
router.get('/trainer/:trainerId/programs', authenticateToken, requireTrainer, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    if (parseInt(trainerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    await db.connect();

    const programs = await db.all(`
      SELECT wp.*, u.name as client_name, u.surname as client_surname
      FROM workout_programs wp
      LEFT JOIN users u ON wp.client_id = u.id
      WHERE wp.trainer_id = ? AND wp.is_active = 1
      ORDER BY wp.created_at DESC
    `, [trainerId]);

    res.json({
      success: true,
      programs
    });

  } catch (error) {
    console.error('Get workout programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei programmi'
    });
  }
});

// Create workout program
router.post('/programs', [
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

    const { name, description, client_id } = req.body;

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
      INSERT INTO workout_programs (name, description, trainer_id, client_id)
      VALUES (?, ?, ?, ?)
    `, [name, description, req.user.id, client_id || null]);

    const program = await db.get(
      'SELECT * FROM workout_programs WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Programma creato con successo',
      program
    });

  } catch (error) {
    console.error('Create workout program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del programma'
    });
  }
});

// Get workout program with days and exercises
router.get('/programs/:programId', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;

    await db.connect();

    // Get program
    const program = await db.get(
      'SELECT * FROM workout_programs WHERE id = ? AND is_active = 1',
      [programId]
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    // Check access permissions
    if (req.user.role === 'trainer' && program.trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    if (req.user.role === 'client' && program.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    // Get workout days
    const days = await db.all(`
      SELECT * FROM workout_days 
      WHERE program_id = ? 
      ORDER BY day_number
    `, [programId]);

    // Get exercises for each day
    for (let day of days) {
      const exercises = await db.all(`
        SELECT e.*, 
               GROUP_CONCAT(
                 json_object(
                   'set_number', es.set_number,
                   'reps', es.reps,
                   'weight', es.weight,
                   'duration_seconds', es.duration_seconds,
                   'distance', es.distance,
                   'notes', es.notes
                 )
               ) as sets
        FROM exercises e
        LEFT JOIN exercise_sets es ON e.id = es.exercise_id
        WHERE e.day_id = ?
        GROUP BY e.id
        ORDER BY e.exercise_order
      `, [day.id]);

      // Parse sets JSON
      exercises.forEach(exercise => {
        if (exercise.sets) {
          exercise.sets = exercise.sets.split(',').map(set => JSON.parse(set));
        } else {
          exercise.sets = [];
        }
        
        if (exercise.secondary_muscles) {
          exercise.secondary_muscles = JSON.parse(exercise.secondary_muscles);
        }
      });

      day.exercises = exercises;
    }

    program.days = days;

    res.json({
      success: true,
      program
    });

  } catch (error) {
    console.error('Get workout program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del programma'
    });
  }
});

// Add workout day to program
router.post('/programs/:programId/days', [
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

    const { programId } = req.params;
    const { name, day_number, notes } = req.body;

    await db.connect();

    // Verify trainer owns this program
    const program = await db.get(
      'SELECT id FROM workout_programs WHERE id = ? AND trainer_id = ?',
      [programId, req.user.id]
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    const result = await db.run(`
      INSERT INTO workout_days (program_id, name, day_number, notes)
      VALUES (?, ?, ?, ?)
    `, [programId, name, day_number, notes || null]);

    const day = await db.get(
      'SELECT * FROM workout_days WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Giorno aggiunto con successo',
      day
    });

  } catch (error) {
    console.error('Add workout day error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta del giorno'
    });
  }
});

// Add exercise to workout day
router.post('/days/:dayId/exercises', [
  authenticateToken,
  requireTrainer,
  body('name').trim().isLength({ min: 2 }),
  body('sets').isArray({ min: 1 })
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
    const {
      name,
      description,
      category,
      primary_muscle,
      secondary_muscles,
      image_url,
      video_url,
      rest_time_seconds,
      notes,
      sets
    } = req.body;

    await db.connect();

    // Verify trainer owns this workout day
    const dayCheck = await db.get(`
      SELECT wd.id 
      FROM workout_days wd
      JOIN workout_programs wp ON wd.program_id = wp.id
      WHERE wd.id = ? AND wp.trainer_id = ?
    `, [dayId, req.user.id]);

    if (!dayCheck) {
      return res.status(404).json({
        success: false,
        message: 'Giorno di allenamento non trovato'
      });
    }

    // Get next exercise order
    const lastExercise = await db.get(
      'SELECT MAX(exercise_order) as max_order FROM exercises WHERE day_id = ?',
      [dayId]
    );
    const exerciseOrder = (lastExercise.max_order || 0) + 1;

    // Insert exercise
    const result = await db.run(`
      INSERT INTO exercises (
        day_id, name, description, category, primary_muscle, 
        secondary_muscles, image_url, video_url, exercise_order,
        rest_time_seconds, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dayId,
      name,
      description || null,
      category || null,
      primary_muscle || null,
      secondary_muscles ? JSON.stringify(secondary_muscles) : null,
      image_url || null,
      video_url || null,
      exerciseOrder,
      rest_time_seconds || null,
      notes || null
    ]);

    // Insert sets
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      await db.run(`
        INSERT INTO exercise_sets (
          exercise_id, set_number, reps, weight, duration_seconds, distance, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        result.id,
        i + 1,
        set.reps || null,
        set.weight || null,
        set.duration_seconds || null,
        set.distance || null,
        set.notes || null
      ]);
    }

    // Get created exercise with sets
    const exercise = await db.get(
      'SELECT * FROM exercises WHERE id = ?',
      [result.id]
    );

    const exerciseSets = await db.all(
      'SELECT * FROM exercise_sets WHERE exercise_id = ? ORDER BY set_number',
      [result.id]
    );

    exercise.sets = exerciseSets;

    res.status(201).json({
      success: true,
      message: 'Esercizio aggiunto con successo',
      exercise
    });

  } catch (error) {
    console.error('Add exercise error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta dell\'esercizio'
    });
  }
});

// Get client's active workout program
router.get('/client/:clientId/active-program', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.connect();

    const program = await db.get(`
      SELECT wp.* 
      FROM workout_programs wp
      WHERE wp.client_id = ? AND wp.is_active = 1
      ORDER BY wp.created_at DESC
      LIMIT 1
    `, [clientId]);

    if (!program) {
      return res.json({
        success: true,
        program: null
      });
    }

    // Get today's workout (simple rotation by day of week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const todaysWorkout = await db.get(`
      SELECT wd.*, 
             COUNT(e.id) as exercise_count
      FROM workout_days wd
      LEFT JOIN exercises e ON wd.id = e.day_id
      WHERE wd.program_id = ? AND wd.day_number = ?
      GROUP BY wd.id
    `, [program.id, (dayOfWeek === 0 ? 7 : dayOfWeek)]); // Convert Sunday to 7

    program.todays_workout = todaysWorkout;

    res.json({
      success: true,
      program
    });

  } catch (error) {
    console.error('Get active program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del programma attivo'
    });
  }
});

// Start workout session
router.post('/sessions', [
  authenticateToken,
  body('program_id').isInt(),
  body('day_id').isInt()
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

    const { program_id, day_id } = req.body;
    const clientId = req.user.role === 'client' ? req.user.id : req.body.client_id;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'ID cliente richiesto'
      });
    }

    await db.connect();

    // Verify access to program
    if (req.user.role === 'client') {
      const program = await db.get(
        'SELECT id FROM workout_programs WHERE id = ? AND client_id = ?',
        [program_id, req.user.id]
      );
      
      if (!program) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato'
        });
      }
    }

    const result = await db.run(`
      INSERT INTO workout_sessions (client_id, program_id, day_id, start_time)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [clientId, program_id, day_id]);

    const session = await db.get(
      'SELECT * FROM workout_sessions WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Sessione iniziata',
      session
    });

  } catch (error) {
    console.error('Start workout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'avvio della sessione'
    });
  }
});

module.exports = router;