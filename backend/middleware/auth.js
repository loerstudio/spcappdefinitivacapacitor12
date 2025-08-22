const jwt = require('jsonwebtoken');
const Database = require('../config/database');

const db = new Database();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token di accesso richiesto'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    await db.connect();
    const user = await db.get(
      'SELECT id, email, name, surname, role, trainer_id FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non trovato o non attivo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token scaduto'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token non valido'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore di autenticazione'
    });
  }
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticazione richiesta'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Accesso riservato ai ${requiredRole === 'trainer' ? 'trainer' : 'clienti'}`
      });
    }

    next();
  };
};

const requireTrainer = requireRole('trainer');
const requireClient = requireRole('client');

// Check if user can access specific client data
const canAccessClient = async (req, res, next) => {
  const clientId = req.params.clientId || req.body.client_id;
  
  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'ID cliente richiesto'
    });
  }

  try {
    await db.connect();

    if (req.user.role === 'trainer') {
      // Trainer can access their own clients
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [clientId, req.user.id]
      );

      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato ad accedere a questo cliente'
        });
      }
    } else if (req.user.role === 'client') {
      // Client can only access their own data
      if (parseInt(clientId) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato ad accedere a questi dati'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Access control error:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore di controllo accessi'
    });
  }
};

// Check if user can access specific trainer data
const canAccessTrainer = async (req, res, next) => {
  const trainerId = req.params.trainerId || req.body.trainer_id;
  
  if (!trainerId) {
    return res.status(400).json({
      success: false,
      message: 'ID trainer richiesto'
    });
  }

  try {
    if (req.user.role === 'trainer') {
      // Trainer can only access their own data
      if (parseInt(trainerId) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato ad accedere a questi dati'
        });
      }
    } else if (req.user.role === 'client') {
      // Client can only access their trainer's data
      if (parseInt(trainerId) !== req.user.trainer_id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato ad accedere a questi dati'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Trainer access control error:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore di controllo accessi'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireTrainer,
  requireClient,
  canAccessClient,
  canAccessTrainer
};