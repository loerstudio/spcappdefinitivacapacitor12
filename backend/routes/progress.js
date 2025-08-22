const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../config/database');
const { authenticateToken, canAccessClient } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get client progress entries
router.get('/client/:clientId', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 30, start_date, end_date } = req.query;

    await db.connect();

    let query = `
      SELECT * FROM progress_entries 
      WHERE client_id = ?
    `;
    const params = [clientId];

    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date DESC LIMIT ?';
    params.push(parseInt(limit));

    const entries = await db.all(query, params);

    // Parse JSON fields
    entries.forEach(entry => {
      if (entry.measurements) {
        entry.measurements = JSON.parse(entry.measurements);
      }
      if (entry.photos) {
        entry.photos = JSON.parse(entry.photos);
      }
    });

    res.json({
      success: true,
      entries
    });

  } catch (error) {
    console.error('Get progress entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei progressi'
    });
  }
});

// Add progress entry
router.post('/entries', [
  authenticateToken,
  body('date').isISO8601(),
  body('client_id').optional().isInt()
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
      date,
      weight,
      body_fat_percentage,
      muscle_mass,
      measurements,
      photos,
      notes,
      trainer_notes
    } = req.body;

    const clientId = req.user.role === 'client' ? req.user.id : req.body.client_id;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'ID cliente richiesto'
      });
    }

    // Check if user can add progress for this client
    if (req.user.role === 'client' && clientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    if (req.user.role === 'trainer') {
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [clientId, req.user.id]
      );
      
      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato'
        });
      }
    }

    await db.connect();

    const result = await db.run(`
      INSERT INTO progress_entries (
        client_id, date, weight, body_fat_percentage, muscle_mass,
        measurements, photos, notes, trainer_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clientId,
      date,
      weight || null,
      body_fat_percentage || null,
      muscle_mass || null,
      measurements ? JSON.stringify(measurements) : null,
      photos ? JSON.stringify(photos) : null,
      notes || null,
      trainer_notes || null
    ]);

    const entry = await db.get(
      'SELECT * FROM progress_entries WHERE id = ?',
      [result.id]
    );

    // Parse JSON fields
    if (entry.measurements) {
      entry.measurements = JSON.parse(entry.measurements);
    }
    if (entry.photos) {
      entry.photos = JSON.parse(entry.photos);
    }

    res.status(201).json({
      success: true,
      message: 'Progresso registrato con successo',
      entry
    });

  } catch (error) {
    console.error('Add progress entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella registrazione del progresso'
    });
  }
});

// Update progress entry
router.put('/entries/:entryId', [
  authenticateToken,
  body('date').optional().isISO8601()
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

    const { entryId } = req.params;

    await db.connect();

    // Check if entry exists and user has permission
    const entry = await db.get(
      'SELECT * FROM progress_entries WHERE id = ?',
      [entryId]
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Voce di progresso non trovata'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && entry.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    if (req.user.role === 'trainer') {
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [entry.client_id, req.user.id]
      );
      
      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato'
        });
      }
    }

    const updateFields = {};
    const updateValues = [];
    const allowedFields = [
      'date', 'weight', 'body_fat_percentage', 'muscle_mass',
      'measurements', 'photos', 'notes', 'trainer_notes'
    ];

    // Build dynamic update query
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'measurements' || field === 'photos') {
          updateFields[field] = '?';
          updateValues.push(req.body[field] ? JSON.stringify(req.body[field]) : null);
        } else {
          updateFields[field] = '?';
          updateValues.push(req.body[field]);
        }
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun campo da aggiornare'
      });
    }

    updateValues.push(entryId);

    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    
    await db.run(
      `UPDATE progress_entries SET ${setClause} WHERE id = ?`,
      updateValues
    );

    // Get updated entry
    const updatedEntry = await db.get(
      'SELECT * FROM progress_entries WHERE id = ?',
      [entryId]
    );

    // Parse JSON fields
    if (updatedEntry.measurements) {
      updatedEntry.measurements = JSON.parse(updatedEntry.measurements);
    }
    if (updatedEntry.photos) {
      updatedEntry.photos = JSON.parse(updatedEntry.photos);
    }

    res.json({
      success: true,
      message: 'Progresso aggiornato con successo',
      entry: updatedEntry
    });

  } catch (error) {
    console.error('Update progress entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del progresso'
    });
  }
});

// Delete progress entry
router.delete('/entries/:entryId', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;

    await db.connect();

    // Check if entry exists and user has permission
    const entry = await db.get(
      'SELECT * FROM progress_entries WHERE id = ?',
      [entryId]
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Voce di progresso non trovata'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && entry.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    if (req.user.role === 'trainer') {
      const client = await db.get(
        'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
        [entry.client_id, req.user.id]
      );
      
      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato'
        });
      }
    }

    await db.run('DELETE FROM progress_entries WHERE id = ?', [entryId]);

    res.json({
      success: true,
      message: 'Progresso eliminato con successo'
    });

  } catch (error) {
    console.error('Delete progress entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del progresso'
    });
  }
});

// Get progress statistics
router.get('/client/:clientId/stats', authenticateToken, canAccessClient, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { period = '30' } = req.query; // days

    await db.connect();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_entries,
        MIN(weight) as min_weight,
        MAX(weight) as max_weight,
        AVG(weight) as avg_weight,
        MIN(body_fat_percentage) as min_body_fat,
        MAX(body_fat_percentage) as max_body_fat,
        AVG(body_fat_percentage) as avg_body_fat
      FROM progress_entries 
      WHERE client_id = ? AND date >= ?
    `, [clientId, startDate.toISOString().split('T')[0]]);

    // Get weight progression (last 10 entries)
    const weightProgression = await db.all(`
      SELECT date, weight 
      FROM progress_entries 
      WHERE client_id = ? AND weight IS NOT NULL
      ORDER BY date DESC 
      LIMIT 10
    `, [clientId]);

    res.json({
      success: true,
      stats,
      weight_progression: weightProgression.reverse()
    });

  } catch (error) {
    console.error('Get progress stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche'
    });
  }
});

module.exports = router;