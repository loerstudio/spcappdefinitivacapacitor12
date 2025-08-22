const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['trainer', 'client'])
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
      email,
      password,
      name,
      surname,
      phone,
      role,
      bio,
      specializations,
      weight,
      height,
      age,
      fitness_goal
    } = req.body;

    await db.connect();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email già registrata'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.run(`
      INSERT INTO users (
        email, password, name, surname, phone, role, bio, specializations,
        weight, height, age, fitness_goal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email,
      hashedPassword,
      name,
      surname || null,
      phone || null,
      role,
      bio || null,
      specializations ? JSON.stringify(specializations) : null,
      weight || null,
      height || null,
      age || null,
      fitness_goal || null
    ]);

    // Get created user
    const user = await db.get(`
      SELECT id, email, name, surname, phone, role, bio, specializations,
             weight, height, age, fitness_goal, created_at
      FROM users WHERE id = ?
    `, [result.id]);

    // Parse JSON fields
    if (user.specializations) {
      user.specializations = JSON.parse(user.specializations);
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registrazione completata',
      user,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione'
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Email e password richiesti'
      });
    }

    const { email, password } = req.body;

    await db.connect();

    // Get user
    const user = await db.get(`
      SELECT id, email, password, name, surname, phone, role, bio, 
             specializations, rating, total_clients, trainer_id,
             weight, height, age, fitness_goal, is_active, created_at
      FROM users WHERE email = ?
    `, [email]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account disattivato'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Remove password from response
    delete user.password;

    // Parse JSON fields
    if (user.specializations) {
      user.specializations = JSON.parse(user.specializations);
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login effettuato',
      user,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login'
    });
  }
});

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    await db.connect();

    const user = await db.get(`
      SELECT id, email, name, surname, phone, role, bio, 
             specializations, rating, total_clients, trainer_id,
             weight, height, age, fitness_goal, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (user.specializations) {
      user.specializations = JSON.parse(user.specializations);
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la verifica del token'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout effettuato'
  });
});

// Change password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
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

    const { currentPassword, newPassword } = req.body;

    await db.connect();

    // Get current user with password
    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password attuale non corretta'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password aggiornata con successo'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il cambio password'
    });
  }
});

module.exports = router;