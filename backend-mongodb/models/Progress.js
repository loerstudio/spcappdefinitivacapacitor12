const mongoose = require('mongoose');

// Progress Photo Schema
const progressPhotoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  caption: {
    type: String,
    maxlength: [500, 'Caption cannot exceed 500 characters']
  },
  photoType: {
    type: String,
    enum: ['front', 'side', 'back', 'progress', 'exercise_form', 'meal', 'other'],
    default: 'progress'
  },
  tags: [String],
  bodyPart: {
    type: String,
    enum: ['full_body', 'upper_body', 'lower_body', 'arms', 'legs', 'abs', 'back', 'chest']
  },
  visibility: {
    type: String,
    enum: ['private', 'trainer_only', 'public'],
    default: 'trainer_only'
  },
  metadata: {
    weight: Number,
    bodyFatPercentage: Number,
    muscleMass: Number,
    location: String,
    lighting: String,
    time: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Body Measurement Schema
const bodyMeasurementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  weight: {
    type: Number,
    min: [20, 'Weight seems too low'],
    max: [500, 'Weight seems too high']
  },
  height: {
    type: Number,
    min: [50, 'Height seems too low'],
    max: [250, 'Height seems too high']
  },
  bodyFatPercentage: {
    type: Number,
    min: [3, 'Body fat percentage seems too low'],
    max: [50, 'Body fat percentage seems too high']
  },
  muscleMass: {
    type: Number,
    min: [10, 'Muscle mass seems too low'],
    max: [200, 'Muscle mass seems too high']
  },
  measurements: {
    chest: Number,      // cm
    waist: Number,      // cm
    hips: Number,       // cm
    bicep: Number,      // cm
    thigh: Number,      // cm
    neck: Number,       // cm
    forearm: Number,    // cm
    calf: Number,       // cm
    shoulders: Number   // cm
  },
  vitals: {
    restingHeartRate: {
      type: Number,
      min: [40, 'Heart rate seems too low'],
      max: [200, 'Heart rate seems too high']
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: [70, 'Systolic pressure seems too low'],
        max: [250, 'Systolic pressure seems too high']
      },
      diastolic: {
        type: Number,
        min: [40, 'Diastolic pressure seems too low'],
        max: [150, 'Diastolic pressure seems too high']
      }
    },
    vo2Max: Number,
    sleepHours: {
      type: Number,
      min: [0, 'Sleep hours cannot be negative'],
      max: [24, 'Sleep hours cannot exceed 24']
    },
    stressLevel: {
      type: Number,
      min: [1, 'Stress level must be between 1-10'],
      max: [10, 'Stress level must be between 1-10']
    },
    energyLevel: {
      type: Number,
      min: [1, 'Energy level must be between 1-10'],
      max: [10, 'Energy level must be between 1-10']
    }
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'low', 'stressed', 'motivated', 'tired']
  },
  takenBy: {
    type: String,
    enum: ['self', 'trainer', 'automatic'],
    default: 'self'
  },
  source: {
    type: String,
    enum: ['manual', 'smart_scale', 'app_measurement', 'trainer_assessment'],
    default: 'manual'
  },
  photos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgressPhoto'
  }]
}, {
  timestamps: true
});

// Performance Record Schema
const performanceRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  exerciseName: {
    type: String,
    required: true,
    trim: true
  },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId
  },
  recordType: {
    type: String,
    enum: ['1rm', 'max_reps', 'max_time', 'max_distance', 'best_form', 'volume_pr'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'lbs', 'reps', 'seconds', 'minutes', 'meters', 'km', 'miles'],
    required: true
  },
  previousRecord: {
    value: Number,
    date: Date
  },
  improvement: {
    value: Number,
    percentage: Number
  },
  workoutSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  videoProof: String // URL to video
}, {
  timestamps: true
});

// Goal Progress Schema
const goalProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  goalType: {
    type: String,
    enum: [
      'weight_loss', 'weight_gain', 'muscle_gain', 'strength_gain', 
      'endurance_improvement', 'flexibility_improvement', 'body_composition',
      'performance_goal', 'health_metric', 'habit_formation'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Goal title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Goal description cannot exceed 500 characters']
  },
  targetValue: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    default: 0
  },
  startValue: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  completedDate: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  milestones: [{
    value: Number,
    description: String,
    targetDate: Date,
    completedDate: Date,
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  progressHistory: [{
    value: Number,
    date: {
      type: Date,
      default: Date.now
    },
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  reminders: [{
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    time: String, // HH:mm format
    message: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Trainer who assigned the goal
  },
  category: String,
  tags: [String]
}, {
  timestamps: true
});

// Achievement Schema
const achievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'first_workout', 'streak_7_days', 'streak_30_days', 'streak_100_days',
      'weight_milestone', 'strength_milestone', 'consistency_master',
      'early_bird', 'night_owl', 'social_butterfly', 'goal_crusher',
      'transformation', 'dedication', 'improvement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  points: {
    type: Number,
    default: 10
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  earnedDate: {
    type: Date,
    default: Date.now
  },
  metadata: mongoose.Schema.Types.Mixed, // Additional data related to achievement
  isVisible: {
    type: Boolean,
    default: true
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
progressPhotoSchema.index({ userId: 1, createdAt: -1 });
progressPhotoSchema.index({ photoType: 1, visibility: 1 });

bodyMeasurementSchema.index({ userId: 1, date: -1 });
bodyMeasurementSchema.index({ date: -1 });

performanceRecordSchema.index({ userId: 1, exerciseName: 1, recordType: 1 });
performanceRecordSchema.index({ date: -1 });

goalProgressSchema.index({ userId: 1, status: 1 });
goalProgressSchema.index({ targetDate: 1, status: 1 });

achievementSchema.index({ userId: 1, earnedDate: -1 });
achievementSchema.index({ type: 1 });

// Virtual for goal completion percentage
goalProgressSchema.virtual('completionPercentage').get(function() {
  if (this.targetValue === this.startValue) return 100;
  const progress = ((this.currentValue - this.startValue) / (this.targetValue - this.startValue)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
});

// Virtual for BMI from body measurements
bodyMeasurementSchema.virtual('bmi').get(function() {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    return Math.round((this.weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return null;
});

// Methods
goalProgressSchema.methods.updateProgress = function(newValue, notes, recordedBy) {
  this.currentValue = newValue;
  this.progressHistory.push({
    value: newValue,
    date: new Date(),
    notes,
    recordedBy
  });

  // Check if goal is completed
  if (newValue >= this.targetValue && this.status === 'active') {
    this.status = 'completed';
    this.completedDate = new Date();
  }

  return this.save();
};

const ProgressPhoto = mongoose.model('ProgressPhoto', progressPhotoSchema);
const BodyMeasurement = mongoose.model('BodyMeasurement', bodyMeasurementSchema);
const PerformanceRecord = mongoose.model('PerformanceRecord', performanceRecordSchema);
const GoalProgress = mongoose.model('GoalProgress', goalProgressSchema);
const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = {
  ProgressPhoto,
  BodyMeasurement,
  PerformanceRecord,
  GoalProgress,
  Achievement
};