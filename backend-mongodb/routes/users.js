const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get trainer's clients
router.get('/trainer/:trainerId/clients', auth, authorize('trainer'), async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    // Verify trainer is requesting their own clients
    if (req.user.userId !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi clienti'
      });
    }

    const clients = await User.findTrainerClients(trainerId);
    
    res.json({
      success: true,
      clients,
      total: clients.length
    });

  } catch (error) {
    console.error('Get trainer clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i clienti'
    });
  }
});

// Add new client
router.post('/trainer/:trainerId/clients', auth, authorize('trainer'), async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { email, password, name, surname, phone, age, weight, height, fitnessGoal } = req.body;

    // Verify trainer is adding to their own client list
    if (req.user.userId !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi aggiungere clienti solo al tuo account'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Utente già registrato con questa email'
      });
    }

    // Create new client
    const client = new User({
      email,
      password,
      name,
      surname,
      phone,
      age,
      weight,
      height,
      fitnessGoal,
      role: 'client',
      trainerId: trainerId,
      isActive: true
    });

    await client.save();

    // Update trainer's total clients count
    await User.findByIdAndUpdate(trainerId, {
      $inc: { totalClients: 1 }
    });

    // Remove password from response
    const clientResponse = client.toObject();
    delete clientResponse.password;

    res.status(201).json({
      success: true,
      message: 'Cliente aggiunto con successo',
      client: clientResponse
    });

  } catch (error) {
    console.error('Add client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta del cliente'
    });
  }
});

// Update client
router.put('/clients/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.email;
    delete updates.role;

    // Check if user has permission
    if (req.user.role === 'client' && req.user.userId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi modificare solo il tuo profilo'
      });
    }

    if (req.user.role === 'trainer') {
      // Verify client belongs to trainer
      const client = await User.findById(clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Cliente non trovato o non autorizzato'
        });
      }
    }

    const updatedClient = await User.findByIdAndUpdate(
      clientId,
      { ...updates, lastActivity: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedClient) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato'
      });
    }

    res.json({
      success: true,
      message: 'Cliente aggiornato con successo',
      client: updatedClient
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del cliente'
    });
  }
});

// Delete client
router.delete('/clients/:clientId', auth, authorize('trainer'), async (req, res) => {
  try {
    const { clientId } = req.params;

    // Find client and verify ownership
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato o non autorizzato'
      });
    }

    // Soft delete (set isActive to false)
    await User.findByIdAndUpdate(clientId, { isActive: false });

    // Update trainer's total clients count
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { totalClients: -1 }
    });

    res.json({
      success: true,
      message: 'Cliente rimosso con successo'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la rimozione del cliente'
    });
  }
});

// Search users (trainers/clients)
router.get('/search', auth, async (req, res) => {
  try {
    const { query, role, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query di ricerca deve essere di almeno 2 caratteri'
      });
    }

    const searchOptions = {};
    if (role) {
      searchOptions.role = role;
    }

    const users = await User.search(query, searchOptions)
      .limit(parseInt(limit));

    res.json({
      success: true,
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la ricerca'
    });
  }
});

// Get user profile
router.get('/profile/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    // Check privacy settings
    if (userId !== req.user.userId && !user.preferences.privacy.showProfile) {
      return res.status(403).json({
        success: false,
        message: 'Profilo privato'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare il profilo'
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.isActive;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { ...updates, lastActivity: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del profilo'
    });
  }
});

// Get user statistics
router.get('/stats/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const user = await User.findById(userId).select('stats role totalClients');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    const stats = {
      ...user.stats,
      ...(user.role === 'trainer' && { totalClients: user.totalClients })
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le statistiche'
    });
  }
});

module.exports = router;