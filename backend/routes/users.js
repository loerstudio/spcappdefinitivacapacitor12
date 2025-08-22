const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken, requireTrainer, canAccessClient } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get trainer's clients
router.get('/trainer/:trainerId/clients', authenticateToken, requireTrainer, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    // Check if requesting trainer's own clients
    if (parseInt(trainerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    await db.connect();

    const clients = await db.all(`
      SELECT id, email, name, surname, phone, weight, height, age, 
             fitness_goal, profile_image_url, is_active, created_at
      FROM users 
      WHERE trainer_id = ? AND role = 'client'
      ORDER BY created_at DESC
    `, [trainerId]);

    res.json({
      success: true,
      clients
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei clienti'
    });
  }
});

// Add new client
router.post('/trainer/:trainerId/clients', [
  authenticateToken,
  requireTrainer,
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }),
  body('surname').trim().isLength({ min: 2 })
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

    const { trainerId } = req.params;
    const {
      email,
      name,
      surname,
      phone,
      weight,
      height,
      age,
      fitness_goal
    } = req.body;

    // Check if requesting trainer's own clients
    if (parseInt(trainerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    await db.connect();

    // Check if email already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email già registrata'
      });
    }

    // Create default password (client should change it)
    const defaultPassword = 'TempPass123!';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Insert client
    const result = await db.run(`
      INSERT INTO users (
        email, password, name, surname, phone, role, trainer_id,
        weight, height, age, fitness_goal
      ) VALUES (?, ?, ?, ?, ?, 'client', ?, ?, ?, ?, ?)
    `, [
      email,
      hashedPassword,
      name,
      surname,
      phone || null,
      trainerId,
      weight || null,
      height || null,
      age || null,
      fitness_goal || null
    ]);

    // Get created client
    const client = await db.get(`
      SELECT id, email, name, surname, phone, weight, height, age, 
             fitness_goal, created_at
      FROM users WHERE id = ?
    `, [result.id]);

    // Update trainer's total clients count
    await db.run(
      'UPDATE users SET total_clients = (SELECT COUNT(*) FROM users WHERE trainer_id = ? AND role = "client") WHERE id = ?',
      [trainerId, trainerId]
    );

    res.status(201).json({
      success: true,
      message: 'Cliente aggiunto con successo',
      client,
      temporary_password: defaultPassword
    });

  } catch (error) {
    console.error('Add client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta del cliente'
    });
  }
});

// Update client
router.put('/clients/:clientId', [
  authenticateToken,
  canAccessClient,
  body('name').optional().trim().isLength({ min: 2 }),
  body('surname').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail()
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

    const { clientId } = req.params;
    const updateFields = {};
    const updateValues = [];
    const allowedFields = [
      'name', 'surname', 'phone', 'weight', 'height', 
      'age', 'fitness_goal', 'bio'
    ];

    // Build dynamic update query
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateFields[field] = '?';
        updateValues.push(req.body[field]);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun campo da aggiornare'
      });
    }

    await db.connect();

    // Check if email is being updated and if it's already taken
    if (req.body.email) {
      const existingUser = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [req.body.email, clientId]
      );
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso'
        });
      }
      updateFields['email'] = '?';
      updateValues.push(req.body.email);
    }

    updateValues.push(clientId);

    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    
    await db.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    // Get updated client
    const client = await db.get(`
      SELECT id, email, name, surname, phone, weight, height, age, 
             fitness_goal, bio, updated_at
      FROM users WHERE id = ?
    `, [clientId]);

    res.json({
      success: true,
      message: 'Cliente aggiornato con successo',
      client
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del cliente'
    });
  }
});

// Delete client
router.delete('/clients/:clientId', authenticateToken, requireTrainer, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.connect();

    // Soft delete - set is_active to false
    await db.run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [clientId]
    );

    // Update trainer's total clients count
    await db.run(
      'UPDATE users SET total_clients = (SELECT COUNT(*) FROM users WHERE trainer_id = ? AND role = "client" AND is_active = 1) WHERE id = ?',
      [req.user.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Cliente eliminato con successo'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del cliente'
    });
  }
});

// Get client profile
router.get('/clients/:clientId', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.connect();

    const client = await db.get(`
      SELECT u.id, u.email, u.name, u.surname, u.phone, u.weight, u.height, 
             u.age, u.fitness_goal, u.bio, u.profile_image_url, u.created_at,
             t.name as trainer_name, t.surname as trainer_surname, t.email as trainer_email
      FROM users u
      LEFT JOIN users t ON u.trainer_id = t.id
      WHERE u.id = ? AND u.role = 'client'
    `, [clientId]);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato'
      });
    }

    res.json({
      success: true,
      client
    });

  } catch (error) {
    console.error('Get client profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del profilo cliente'
    });
  }
});

// Search users (for trainer to find potential clients)
router.get('/search', authenticateToken, requireTrainer, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query di ricerca troppo corta'
      });
    }

    await db.connect();

    const users = await db.all(`
      SELECT id, email, name, surname, role, trainer_id
      FROM users 
      WHERE (name LIKE ? OR surname LIKE ? OR email LIKE ?) 
        AND is_active = 1
      LIMIT 20
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella ricerca utenti'
    });
  }
});

// Get trainer profile
router.get('/trainers/:trainerId', authenticateToken, async (req, res) => {
  try {
    const { trainerId } = req.params;

    await db.connect();

    const trainer = await db.get(`
      SELECT id, email, name, surname, phone, bio, specializations, 
             rating, total_clients, profile_image_url, created_at
      FROM users 
      WHERE id = ? AND role = 'trainer' AND is_active = 1
    `, [trainerId]);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer non trovato'
      });
    }

    // Parse specializations
    if (trainer.specializations) {
      trainer.specializations = JSON.parse(trainer.specializations);
    }

    res.json({
      success: true,
      trainer
    });

  } catch (error) {
    console.error('Get trainer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del profilo trainer'
    });
  }
});

module.exports = router;