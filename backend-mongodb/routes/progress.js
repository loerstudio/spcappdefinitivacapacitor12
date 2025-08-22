const express = require('express');
const router = express.Router();
const { ProgressPhoto, BodyMeasurement, PerformanceRecord, GoalProgress, Achievement } = require('../models/Progress');
const { auth, authorize } = require('../middleware/auth');

// Progress Photos Routes

// Upload progress photo
router.post('/photos', auth, async (req, res) => {
  try {
    const photoData = {
      ...req.body,
      userId: req.user.userId
    };

    const photo = new ProgressPhoto(photoData);
    await photo.save();

    res.status(201).json({
      success: true,
      message: 'Foto caricata con successo',
      photo
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il caricamento della foto'
    });
  }
});

// Get user progress photos
router.get('/photos/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { photoType, limit = 20, page = 1 } = req.query;

    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo alle tue foto'
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

    const filter = { userId, isDeleted: false };
    if (photoType) filter.photoType = photoType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const photos = await ProgressPhoto.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name surname')
      .populate('likes.userId', 'name surname')
      .populate('comments.userId', 'name surname');

    const total = await ProgressPhoto.countDocuments(filter);

    res.json({
      success: true,
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le foto'
    });
  }
});

// Body Measurements Routes

// Add body measurement
router.post('/measurements', auth, async (req, res) => {
  try {
    const measurementData = {
      ...req.body,
      userId: req.user.userId
    };

    const measurement = new BodyMeasurement(measurementData);
    await measurement.save();

    // Update user's current stats
    const User = require('../models/User');
    const updateData = {};
    if (measurement.weight) updateData.weight = measurement.weight;
    if (measurement.height) updateData.height = measurement.height;
    
    await User.findByIdAndUpdate(req.user.userId, updateData);

    res.status(201).json({
      success: true,
      message: 'Misurazione registrata con successo',
      measurement
    });

  } catch (error) {
    console.error('Add measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione della misurazione'
    });
  }
});

// Get body measurements
router.get('/measurements/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { startDate, endDate, limit = 50 } = req.query;

    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo alle tue misurazioni'
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

    const filter = { userId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const measurements = await BodyMeasurement.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate('photos');

    res.json({
      success: true,
      measurements
    });

  } catch (error) {
    console.error('Get measurements error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le misurazioni'
    });
  }
});

// Performance Records Routes

// Add performance record
router.post('/records', auth, async (req, res) => {
  try {
    const recordData = {
      ...req.body,
      userId: req.user.userId
    };

    // Check if there's a previous record for improvement calculation
    const previousRecord = await PerformanceRecord.findOne({
      userId: req.user.userId,
      exerciseName: recordData.exerciseName,
      recordType: recordData.recordType
    }).sort({ date: -1 });

    if (previousRecord) {
      recordData.previousRecord = {
        value: previousRecord.value,
        date: previousRecord.date
      };
      recordData.improvement = {
        value: recordData.value - previousRecord.value,
        percentage: ((recordData.value - previousRecord.value) / previousRecord.value) * 100
      };
    }

    const record = new PerformanceRecord(recordData);
    await record.save();

    res.status(201).json({
      success: true,
      message: 'Record registrato con successo',
      record
    });

  } catch (error) {
    console.error('Add record error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione del record'
    });
  }
});

// Get performance records
router.get('/records/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { exerciseName, recordType, limit = 50 } = req.query;

    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi record'
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

    const filter = { userId };
    if (exerciseName) filter.exerciseName = exerciseName;
    if (recordType) filter.recordType = recordType;

    const records = await PerformanceRecord.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate('workoutSessionId', 'sessionName startTime');

    res.json({
      success: true,
      records
    });

  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i record'
    });
  }
});

// Goals Routes

// Create goal
router.post('/goals', auth, async (req, res) => {
  try {
    const goalData = {
      ...req.body,
      userId: req.user.userId,
      startValue: req.body.currentValue || 0
    };

    const goal = new GoalProgress(goalData);
    await goal.save();

    res.status(201).json({
      success: true,
      message: 'Obiettivo creato con successo',
      goal
    });

  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione dell\'obiettivo'
    });
  }
});

// Get user goals
router.get('/goals/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { status = 'active' } = req.query;

    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi obiettivi'
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

    const filter = { userId };
    if (status !== 'all') filter.status = status;

    const goals = await GoalProgress.find(filter)
      .sort({ createdAt: -1 })
      .populate('assignedBy', 'name surname');

    res.json({
      success: true,
      goals
    });

  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare gli obiettivi'
    });
  }
});

// Update goal progress
router.put('/goals/:goalId/progress', auth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { value, notes } = req.body;

    const goal = await GoalProgress.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Obiettivo non trovato'
      });
    }

    // Check permissions
    const hasAccess = goal.userId.toString() === req.user.userId ||
                     (goal.assignedBy && goal.assignedBy.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accesso negato'
      });
    }

    await goal.updateProgress(value, notes, req.user.userId);

    res.json({
      success: true,
      message: 'Progresso aggiornato con successo',
      goal
    });

  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del progresso'
    });
  }
});

// Achievements Routes

// Get user achievements
router.get('/achievements/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo ai tuoi riconoscimenti'
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

    const achievements = await Achievement.find({
      userId,
      isVisible: true
    }).sort({ earnedDate: -1 });

    res.json({
      success: true,
      achievements,
      totalPoints: achievements.reduce((sum, ach) => sum + ach.points, 0)
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i riconoscimenti'
    });
  }
});

// Progress Analytics
router.get('/analytics/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access permissions
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
      $gte: new Date(startDate || Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days default
      $lte: new Date(endDate || Date.now())
    };

    // Get measurements trend
    const measurements = await BodyMeasurement.find({
      userId,
      date: dateFilter
    }).sort({ date: 1 });

    // Get performance records
    const records = await PerformanceRecord.find({
      userId,
      date: dateFilter
    }).sort({ date: -1 });

    // Get active goals progress
    const goals = await GoalProgress.find({
      userId,
      status: 'active'
    });

    // Calculate analytics
    const analytics = {
      measurementsTrend: {
        weight: measurements.map(m => ({ date: m.date, value: m.weight })).filter(m => m.value),
        bodyFat: measurements.map(m => ({ date: m.date, value: m.bodyFatPercentage })).filter(m => m.value),
        muscleMass: measurements.map(m => ({ date: m.date, value: m.muscleMass })).filter(m => m.value)
      },
      performanceTrend: records.slice(0, 10), // Latest 10 records
      goalsProgress: goals.map(goal => ({
        title: goal.title,
        completionPercentage: goal.completionPercentage,
        status: goal.status,
        targetDate: goal.targetDate
      })),
      achievements: await Achievement.countDocuments({ userId }),
      totalPhotos: await ProgressPhoto.countDocuments({ userId, isDeleted: false })
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Progress analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolare le analitiche dei progressi'
    });
  }
});

module.exports = router;