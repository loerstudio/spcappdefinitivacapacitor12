const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get conversations for user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    await db.connect();

    const conversations = await db.all(`
      SELECT DISTINCT
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        u.name,
        u.surname,
        u.profile_image_url,
        u.role,
        MAX(m.created_at) as last_message_time,
        (SELECT content FROM messages m2 
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id) 
            OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message,
        COUNT(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 END) as unread_count
      FROM messages m
      JOIN users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id 
        ELSE m.sender_id 
      END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle conversazioni'
    });
  }
});

// Get messages between two users
router.get('/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { limit = 50, before_id } = req.query;

    await db.connect();

    // Verify user can chat with this person
    let canChat = false;
    
    if (req.user.role === 'trainer') {
      // Trainer can chat with their clients
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [otherUserId, req.user.id]
      );
      canChat = !!client;
    } else if (req.user.role === 'client') {
      // Client can chat with their trainer
      canChat = parseInt(otherUserId) === req.user.trainer_id;
    }

    if (!canChat) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a chattare con questo utente'
      });
    }

    let query = `
      SELECT m.*, 
             s.name as sender_name, s.surname as sender_surname,
             r.name as receiver_name, r.surname as receiver_surname
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?)
    `;
    
    const params = [req.user.id, otherUserId, otherUserId, req.user.id];

    if (before_id) {
      query += ' AND m.id < ?';
      params.push(before_id);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = await db.all(query, params);

    // Mark messages as read
    await db.run(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, req.user.id]
    );

    res.json({
      success: true,
      messages: messages.reverse() // Return in chronological order
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei messaggi'
    });
  }
});

// Send message
router.post('/messages', [
  authenticateToken,
  body('receiver_id').isInt(),
  body('content').trim().isLength({ min: 1 })
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

    const { receiver_id, content, message_type = 'text', file_url } = req.body;

    await db.connect();

    // Verify user can send message to this person
    let canSend = false;
    
    if (req.user.role === 'trainer') {
      // Trainer can send to their clients
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [receiver_id, req.user.id]
      );
      canSend = !!client;
    } else if (req.user.role === 'client') {
      // Client can send to their trainer
      canSend = parseInt(receiver_id) === req.user.trainer_id;
    }

    if (!canSend) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a inviare messaggi a questo utente'
      });
    }

    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, content, message_type, file_url)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, receiver_id, content, message_type, file_url || null]);

    const message = await db.get(`
      SELECT m.*, 
             s.name as sender_name, s.surname as sender_surname,
             r.name as receiver_name, r.surname as receiver_surname
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE m.id = ?
    `, [result.id]);

    // Emit to Socket.IO for real-time delivery
    const io = req.app.locals.io;
    if (io) {
      io.to(`user_${receiver_id}`).emit('new_message', message);
    }

    res.status(201).json({
      success: true,
      message: 'Messaggio inviato',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio del messaggio'
    });
  }
});

// Mark messages as read
router.put('/messages/read/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;

    await db.connect();

    await db.run(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, req.user.id]
    );

    res.json({
      success: true,
      message: 'Messaggi segnati come letti'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento dei messaggi'
    });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    await db.connect();

    const result = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      unread_count: result.count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel conteggio messaggi non letti'
    });
  }
});

module.exports = router;