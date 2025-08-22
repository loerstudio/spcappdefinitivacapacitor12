const express = require('express');
const router = express.Router();
const { WorkoutProgram, WorkoutSession } = require('../models/Workout');
const { auth, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get trainer's workout programs
router.get('/trainer/:trainerId/programs', auth, authorize('trainer'), async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { page = 1, limit = 20, isActive = true } = req.query;

    // Verify trainer is requesting their own programs
    if (req.user.userId !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi programmi'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const programs = await WorkoutProgram.find({
      trainerId,
      isActive: isActive === 'true'
    })
    .populate('clientId', 'name surname email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

    const total = await WorkoutProgram.countDocuments({
      trainerId,
      isActive: isActive === 'true'
    });

    res.json({
      success: true,
      programs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get trainer programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i programmi'
    });
  }
});

// Get client's workout programs
router.get('/client/:clientId/programs', auth, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Verify access (client can only see their own, trainer can see their clients')
    if (req.user.role === 'client' && req.user.userId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi programmi'
      });
    }

    if (req.user.role === 'trainer') {
      // Verify client belongs to trainer
      const User = require('../models/User');
      const client = await User.findById(clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Cliente non trovato o non autorizzato'
        });
      }
    }

    const programs = await WorkoutProgram.find({
      clientId,
      isActive: true
    })
    .populate('trainerId', 'name surname')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      programs
    });

  } catch (error) {
    console.error('Get client programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i programmi'
    });
  }
});

// Create workout program
router.post('/programs', auth, authorize('trainer'), async (req, res) => {
  try {
    const programData = {
      ...req.body,
      trainerId: req.user.userId
    };

    // Validate client if provided
    if (programData.clientId) {
      const User = require('../models/User');
      const client = await User.findById(programData.clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cliente non valido o non autorizzato'
        });
      }
    }

    const program = new WorkoutProgram(programData);
    await program.save();

    await program.populate('clientId', 'name surname email');

    res.status(201).json({
      success: true,
      message: 'Programma creato con successo',
      program
    });

  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del programma',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get workout program details
router.get('/programs/:programId', auth, async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await WorkoutProgram.findById(programId)
      .populate('trainerId', 'name surname email')
      .populate('clientId', 'name surname email');

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    // Check access permissions
    const hasAccess = 
      program.trainerId._id.toString() === req.user.userId ||
      (program.clientId && program.clientId._id.toString() === req.user.userId) ||
      program.isPublic;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato al programma'
      });
    }

    res.json({
      success: true,
      program
    });

  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare il programma'
    });
  }
});

// Update workout program
router.put('/programs/:programId', auth, authorize('trainer'), async (req, res) => {
  try {
    const { programId } = req.params;
    const updates = req.body;

    const program = await WorkoutProgram.findById(programId);
    
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    // Verify ownership
    if (program.trainerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi modificare solo i tuoi programmi'
      });
    }

    // Create new version for version control
    if (program.version) {
      program.previousVersions.push({
        versionNumber: program.version,
        data: program.toObject(),
        changedBy: req.user.userId,
        changedAt: new Date(),
        changeNotes: updates.changeNotes || 'Aggiornamento programma'
      });
      program.version += 1;
    }

    Object.assign(program, updates);
    await program.save();

    await program.populate('clientId', 'name surname email');

    res.json({
      success: true,
      message: 'Programma aggiornato con successo',
      program
    });

  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del programma'
    });
  }
});

// Delete workout program (soft delete)
router.delete('/programs/:programId', auth, authorize('trainer'), async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await WorkoutProgram.findById(programId);
    
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    // Verify ownership
    if (program.trainerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi eliminare solo i tuoi programmi'
      });
    }

    // Soft delete
    program.isActive = false;
    await program.save();

    res.json({
      success: true,
      message: 'Programma eliminato con successo'
    });

  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del programma'
    });
  }
});

// Start workout session
router.post('/sessions', auth, async (req, res) => {
  try {
    const { programId, dayId, sessionName } = req.body;

    // Verify program access
    const program = await WorkoutProgram.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Programma non trovato'
      });
    }

    // Find the workout day
    const workoutDay = program.days.id(dayId);
    if (!workoutDay) {
      return res.status(404).json({
        success: false,
        message: 'Giornata di allenamento non trovata'
      });
    }

    // Check access permissions
    const hasAccess = 
      program.trainerId.toString() === req.user.userId ||
      (program.clientId && program.clientId.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato al programma'
      });
    }

    // Create workout session
    const session = new WorkoutSession({
      clientId: req.user.role === 'client' ? req.user.userId : program.clientId,
      programId,
      dayId,
      sessionName: sessionName || workoutDay.name,
      startTime: new Date(),
      exercises: workoutDay.exercises.map(exercise => ({
        exerciseId: exercise._id,
        name: exercise.name,
        completedSets: [],
        skipped: false
      }))
    });

    await session.save();
    await session.populate('programId', 'name');

    // Update program stats
    await WorkoutProgram.findByIdAndUpdate(programId, {
      $inc: { 'stats.totalSessions': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Sessione di allenamento iniziata',
      session
    });

  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'avvio della sessione'
    });
  }
});

// Update workout session
router.put('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    const session = await WorkoutSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessione non trovata'
      });
    }

    // Verify ownership
    if (session.clientId.toString() !== req.user.userId && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato alla sessione'
      });
    }

    // If completing the session
    if (updates.isCompleted && !session.isCompleted) {
      session.endTime = new Date();
      session.calculateDuration();
      session.calculateStats();
      
      // Update program completion stats
      await WorkoutProgram.findByIdAndUpdate(session.programId, {
        $inc: { 'stats.completedSessions': 1 }
      });

      // Update user stats
      const User = require('../models/User');
      await User.findByIdAndUpdate(session.clientId, {
        $inc: { 
          'stats.totalWorkouts': 1,
          'stats.totalWorkoutTime': session.duration || 0
        },
        $set: { 'stats.lastWorkout': new Date() }
      });
    }

    Object.assign(session, updates);
    await session.save();

    res.json({
      success: true,
      message: 'Sessione aggiornata con successo',
      session
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento della sessione'
    });
  }
});

// Get client's workout sessions
router.get('/sessions/client/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Verify access
    if (req.user.role === 'client' && req.user.userId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo alle tue sessioni'
      });
    }

    if (req.user.role === 'trainer') {
      const User = require('../models/User');
      const client = await User.findById(clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Cliente non trovato o non autorizzato'
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const sessions = await WorkoutSession.find({ clientId })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('programId', 'name');

    const total = await WorkoutSession.countDocuments({ clientId });

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le sessioni'
    });
  }
});

// Get session details
router.get('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await WorkoutSession.findById(sessionId)
      .populate('programId', 'name trainerId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessione non trovata'
      });
    }

    // Verify access
    const hasAccess = 
      session.clientId.toString() === req.user.userId ||
      (session.programId.trainerId && session.programId.trainerId.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato alla sessione'
      });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare la sessione'
    });
  }
});

module.exports = router;