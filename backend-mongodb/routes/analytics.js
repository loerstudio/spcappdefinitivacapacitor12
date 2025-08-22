const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { WorkoutProgram, WorkoutSession } = require('../models/Workout');
const { DailyNutrition } = require('../models/Nutrition');
const { ProgressPhoto, BodyMeasurement } = require('../models/Progress');
const { Message } = require('../models/Chat');

// Trainer Dashboard Analytics
router.get('/trainer/:trainerId/dashboard', auth, authorize('trainer'), async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    if (req.user.userId !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo alle tue analitiche'
      });
    }

    // Get date range (default last 30 days)
    const { startDate, endDate } = req.query;
    const end = new Date(endDate || Date.now());
    const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Basic stats
    const [
      totalClients,
      activePrograms,
      totalSessions,
      completedSessions,
      totalMessages
    ] = await Promise.all([
      User.countDocuments({ trainerId, role: 'client', isActive: true }),
      WorkoutProgram.countDocuments({ trainerId, isActive: true }),
      WorkoutSession.countDocuments({
        programId: { $in: await WorkoutProgram.find({ trainerId }).select('_id') },
        startTime: { $gte: start, $lte: end }
      }),
      WorkoutSession.countDocuments({
        programId: { $in: await WorkoutProgram.find({ trainerId }).select('_id') },
        startTime: { $gte: start, $lte: end },
        isCompleted: true
      }),
      Message.countDocuments({
        $or: [
          { senderId: trainerId },
          { receiverId: trainerId }
        ],
        createdAt: { $gte: start, $lte: end }
      })
    ]);

    // Client engagement metrics
    const clientEngagement = await User.aggregate([
      { $match: { trainerId: trainerId, role: 'client', isActive: true } },
      {
        $lookup: {
          from: 'workoutsessions',
          let: { clientId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clientId', '$$clientId'] },
                startTime: { $gte: start, $lte: end }
              }
            }
          ],
          as: 'sessions'
        }
      },
      {
        $addFields: {
          sessionsCount: { $size: '$sessions' },
          completedSessions: {
            $size: {
              $filter: {
                input: '$sessions',
                cond: { $eq: ['$$this.isCompleted', true] }
              }
            }
          },
          lastWorkout: { $max: '$sessions.startTime' }
        }
      },
      {
        $project: {
          name: 1,
          surname: 1,
          email: 1,
          lastActivity: 1,
          sessionsCount: 1,
          completedSessions: 1,
          lastWorkout: 1,
          engagementScore: {
            $multiply: [
              { $divide: ['$completedSessions', { $max: ['$sessionsCount', 1] }] },
              100
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } }
    ]);

    // Revenue analytics (if subscription data available)
    const revenueData = await User.aggregate([
      { $match: { trainerId: trainerId, role: 'client', subscriptionStatus: 'active' } },
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 },
          // Add revenue calculation based on plan pricing
        }
      }
    ]);

    // Program performance
    const programPerformance = await WorkoutProgram.aggregate([
      { $match: { trainerId: trainerId, isActive: true } },
      {
        $lookup: {
          from: 'workoutsessions',
          localField: '_id',
          foreignField: 'programId',
          as: 'sessions'
        }
      },
      {
        $addFields: {
          totalSessions: { $size: '$sessions' },
          completedSessions: {
            $size: {
              $filter: {
                input: '$sessions',
                cond: { $eq: ['$$this.isCompleted', true] }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          programType: 1,
          totalSessions: 1,
          completedSessions: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $multiply: [{ $divide: ['$completedSessions', '$totalSessions'] }, 100] },
              0
            ]
          },
          clientId: 1
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    const analytics = {
      overview: {
        totalClients,
        activePrograms,
        totalSessions,
        completedSessions,
        totalMessages,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
      },
      clientEngagement: clientEngagement.slice(0, 10), // Top 10 most engaged clients
      programPerformance: programPerformance.slice(0, 10), // Top 10 programs
      revenueData,
      period: { startDate: start, endDate: end }
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Trainer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolare le analitiche del trainer'
    });
  }
});

// Client Progress Analytics
router.get('/client/:clientId/progress', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check access permissions
    if (req.user.role === 'client' && req.user.userId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi accedere solo alle tue analitiche'
      });
    }

    if (req.user.role === 'trainer') {
      const client = await User.findById(clientId);
      if (!client || client.trainerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Cliente non autorizzato'
        });
      }
    }

    const { startDate, endDate } = req.query;
    const end = new Date(endDate || Date.now());
    const start = new Date(startDate || Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 months default

    // Workout analytics
    const workoutAnalytics = await WorkoutSession.aggregate([
      {
        $match: {
          clientId: clientId,
          startTime: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            week: { $week: '$startTime' }
          },
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: ['$isCompleted', 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    // Body measurement trends
    const measurementTrends = await BodyMeasurement.aggregate([
      {
        $match: {
          userId: clientId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          weight: { $avg: '$weight' },
          bodyFat: { $avg: '$bodyFatPercentage' },
          muscleMass: { $avg: '$muscleMass' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Nutrition adherence
    const nutritionAdherence = await DailyNutrition.aggregate([
      {
        $match: {
          userId: clientId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          averageCalories: { $avg: '$dailyTotals.calories' },
          averageProtein: { $avg: '$dailyTotals.protein' },
          adherenceRate: { $avg: '$adherenceRate' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Streak calculations
    const sessions = await WorkoutSession.find({
      clientId,
      isCompleted: true,
      startTime: { $gte: start, $lte: end }
    }).sort({ startTime: 1 }).select('startTime');

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sessions[i - 1].startTime);
        prevDate.setHours(0, 0, 0, 0);
        const daysDiff = (sessionDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 7) { // Within a week
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      // Check if this contributes to current streak
      const daysSinceToday = (today - sessionDate) / (1000 * 60 * 60 * 24);
      if (daysSinceToday <= 7) {
        currentStreak = Math.max(currentStreak, tempStreak);
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const analytics = {
      workoutAnalytics,
      measurementTrends,
      nutritionAdherence,
      streaks: {
        current: currentStreak,
        longest: longestStreak
      },
      summary: {
        totalWorkouts: sessions.length,
        averageWeeklyWorkouts: sessions.length / Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000))),
        totalProgressPhotos: await ProgressPhoto.countDocuments({
          userId: clientId,
          createdAt: { $gte: start, $lte: end },
          isDeleted: false
        })
      },
      period: { startDate: start, endDate: end }
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Client analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolare le analitiche del cliente'
    });
  }
});

// System-wide analytics (admin only - for monitoring)
router.get('/system/overview', auth, async (req, res) => {
  try {
    // This would typically require admin role
    // For now, allowing trainers to see limited system stats
    
    const { period = '30d' } = req.query;
    let startDate;
    
    switch (period) {
      case '7d': startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalUsers,
      totalTrainers,
      totalClients,
      activeUsers,
      totalSessions,
      totalMessages,
      totalPrograms
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'trainer', isActive: true }),
      User.countDocuments({ role: 'client', isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        lastActivity: { $gte: startDate }
      }),
      WorkoutSession.countDocuments({
        startTime: { $gte: startDate }
      }),
      Message.countDocuments({
        createdAt: { $gte: startDate }
      }),
      WorkoutProgram.countDocuments({
        isActive: true,
        createdAt: { $gte: startDate }
      })
    ]);

    // Growth metrics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          newUsers: { $sum: 1 },
          trainers: {
            $sum: { $cond: [{ $eq: ['$role', 'trainer'] }, 1, 0] }
          },
          clients: {
            $sum: { $cond: [{ $eq: ['$role', 'client'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const systemStats = {
      overview: {
        totalUsers,
        totalTrainers,
        totalClients,
        activeUsers,
        totalSessions,
        totalMessages,
        totalPrograms,
        userActivityRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
      },
      growth: userGrowth,
      period: { startDate, period }
    };

    res.json({
      success: true,
      analytics: systemStats
    });

  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel calcolare le analitiche di sistema'
    });
  }
});

// Real-time metrics endpoint
router.get('/realtime/metrics', auth, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeSessionsLastHour,
      messagesLastHour,
      newUsersToday,
      activeUsersToday
    ] = await Promise.all([
      WorkoutSession.countDocuments({
        startTime: { $gte: oneHourAgo },
        isCompleted: false
      }),
      Message.countDocuments({
        createdAt: { $gte: oneHourAgo }
      }),
      User.countDocuments({
        createdAt: { $gte: oneDayAgo }
      }),
      User.countDocuments({
        lastActivity: { $gte: oneDayAgo }
      })
    ]);

    const realtimeMetrics = {
      activeSessionsLastHour,
      messagesLastHour,
      newUsersToday,
      activeUsersToday,
      timestamp: now
    };

    res.json({
      success: true,
      metrics: realtimeMetrics
    });

  } catch (error) {
    console.error('Realtime metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le metriche in tempo reale'
    });
  }
});

module.exports = router;