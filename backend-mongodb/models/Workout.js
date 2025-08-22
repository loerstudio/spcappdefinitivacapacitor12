const mongoose = require('mongoose');

// Exercise Set Schema
const exerciseSetSchema = new mongoose.Schema({
  setNumber: {
    type: Number,
    required: true,
    min: 1
  },
  reps: {
    type: Number,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  duration: {
    type: Number, // in seconds
    min: 0
  },
  distance: {
    type: Number, // in meters
    min: 0
  },
  restTime: {
    type: Number, // in seconds
    default: 60
  },
  notes: String,
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  actualReps: Number,
  actualWeight: Number,
  actualDuration: Number,
  actualDistance: Number
}, { _id: true });

// Exercise Schema
const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes',
      'abs', 'cardio', 'full_body', 'stretching', 'plyometric', 'isometric'
    ]
  },
  primaryMuscle: {
    type: String,
    enum: [
      'pectorals', 'latissimus', 'deltoids', 'biceps', 'triceps', 'quadriceps',
      'hamstrings', 'glutes', 'calves', 'abdominals', 'obliques', 'traps', 'rhomboids'
    ]
  },
  secondaryMuscles: [{
    type: String,
    enum: [
      'pectorals', 'latissimus', 'deltoids', 'biceps', 'triceps', 'quadriceps',
      'hamstrings', 'glutes', 'calves', 'abdominals', 'obliques', 'traps', 'rhomboids'
    ]
  }],
  equipment: [{
    type: String,
    enum: [
      'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight',
      'resistance_band', 'medicine_ball', 'pull_up_bar', 'bench', 'none'
    ]
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  instructions: [{
    step: Number,
    description: String,
    imageUrl: String
  }],
  imageUrl: String,
  videoUrl: String,
  gifUrl: String,
  exerciseOrder: {
    type: Number,
    default: 0
  },
  sets: [exerciseSetSchema],
  estimatedDuration: {
    type: Number, // in minutes
    default: 5
  },
  caloriesPerMinute: {
    type: Number,
    default: 5
  },
  tags: [String],
  isCustom: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  _id: true 
});

// Workout Day Schema
const workoutDaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workout day name is required'],
    trim: true
  },
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  exercises: [exerciseSchema],
  notes: String,
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  targetCalories: {
    type: Number,
    min: 0
  },
  restDayAfter: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  _id: true 
});

// Main Workout Program Schema
const workoutProgramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Program name is required'],
    trim: true,
    maxlength: [100, 'Program name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer ID is required'],
    index: true
  },
  
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  days: [workoutDaySchema],
  
  // Program Information
  programType: {
    type: String,
    enum: [
      'strength', 'hypertrophy', 'endurance', 'weight_loss', 'general_fitness',
      'rehabilitation', 'sport_specific', 'bodybuilding', 'powerlifting'
    ],
    default: 'general_fitness'
  },
  
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  
  duration: {
    weeks: {
      type: Number,
      min: 1,
      max: 52,
      default: 12
    },
    sessionsPerWeek: {
      type: Number,
      min: 1,
      max: 7,
      default: 3
    }
  },
  
  // Goals and Targets
  goals: [{
    type: String,
    enum: [
      'strength_gain', 'muscle_gain', 'fat_loss', 'endurance_improvement',
      'flexibility_improvement', 'power_development', 'rehabilitation'
    ]
  }],
  
  targetAudience: [{
    type: String,
    enum: ['beginners', 'intermediate', 'advanced', 'athletes', 'seniors', 'youth']
  }],
  
  // Equipment Requirements
  requiredEquipment: [{
    type: String,
    enum: [
      'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_bands',
      'pull_up_bar', 'bench', 'bodyweight_only', 'full_gym', 'home_gym'
    ]
  }],
  
  // Program Statistics
  stats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    completedSessions: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5
    },
    totalUsers: {
      type: Number,
      default: 0
    }
  },
  
  // Status and Visibility
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isTemplate: {
    type: Boolean,
    default: false
  },
  
  // Scheduling
  schedule: {
    startDate: Date,
    endDate: Date,
    timeSlots: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday, 6 = Saturday
      },
      startTime: String, // HH:mm format
      duration: Number // in minutes
    }]
  },
  
  // Progress Tracking
  progressMetrics: [{
    name: String,
    unit: String,
    targetValue: Number,
    currentValue: {
      type: Number,
      default: 0
    }
  }],
  
  // Nutrition Integration
  nutritionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NutritionPlan'
  },
  
  // Tags and Categories
  tags: [String],
  
  // Reviews and Ratings
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  
  previousVersions: [{
    versionNumber: Number,
    data: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changeNotes: String
  }]
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Workout Session Schema (for tracking completed workouts)
const workoutSessionSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutProgram',
    required: true
  },
  
  dayId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  sessionName: {
    type: String,
    required: true
  },
  
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endTime: Date,
  
  duration: Number, // in minutes, calculated from start/end time
  
  exercises: [{
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String,
    completedSets: [{
      setNumber: Number,
      reps: Number,
      weight: Number,
      duration: Number,
      distance: Number,
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    notes: String,
    skipped: {
      type: Boolean,
      default: false
    },
    skipReason: String
  }],
  
  // Session Statistics
  stats: {
    totalExercises: Number,
    completedExercises: Number,
    totalSets: Number,
    completedSets: Number,
    totalReps: Number,
    totalWeight: Number, // total weight lifted
    caloriesBurned: Number,
    averageHeartRate: Number,
    maxHeartRate: Number
  },
  
  // Session Quality
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  effort: {
    type: String,
    enum: ['very_easy', 'easy', 'moderate', 'hard', 'very_hard']
  },
  
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'tired', 'stressed']
  },
  
  notes: String,
  
  // Environment
  location: {
    type: String,
    enum: ['home', 'gym', 'outdoor', 'studio', 'other']
  },
  
  weather: {
    type: String,
    enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'indoor']
  },
  
  // Status
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Photos and Media
  photos: [String], // URLs to session photos
  
  // Sharing
  isShared: {
    type: Boolean,
    default: false
  },
  
  socialData: {
    likes: {
      type: Number,
      default: 0
    },
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
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
workoutProgramSchema.index({ trainerId: 1, isActive: 1 });
workoutProgramSchema.index({ clientId: 1, isActive: 1 });
workoutProgramSchema.index({ isPublic: 1, isActive: 1 });
workoutProgramSchema.index({ programType: 1, difficulty: 1 });
workoutProgramSchema.index({ tags: 1 });
workoutProgramSchema.index({ createdAt: -1 });

workoutSessionSchema.index({ clientId: 1, startTime: -1 });
workoutSessionSchema.index({ programId: 1, startTime: -1 });
workoutSessionSchema.index({ isCompleted: 1, startTime: -1 });

// Virtual for completion percentage
workoutProgramSchema.virtual('completionRate').get(function() {
  if (this.stats.totalSessions === 0) return 0;
  return Math.round((this.stats.completedSessions / this.stats.totalSessions) * 100);
});

// Virtual for estimated duration
workoutProgramSchema.virtual('estimatedDuration').get(function() {
  return this.days.reduce((total, day) => total + (day.estimatedDuration || 0), 0);
});

// Static methods
workoutProgramSchema.statics.findByTrainer = function(trainerId, options = {}) {
  return this.find({ 
    trainerId, 
    isActive: true, 
    ...options 
  }).populate('clientId', 'name surname email');
};

workoutProgramSchema.statics.findByClient = function(clientId, options = {}) {
  return this.find({ 
    clientId, 
    isActive: true, 
    ...options 
  }).populate('trainerId', 'name surname email');
};

workoutSessionSchema.statics.findClientSessions = function(clientId, limit = 50) {
  return this.find({ clientId })
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('programId', 'name');
};

// Instance methods
workoutSessionSchema.methods.calculateDuration = function() {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // minutes
  }
  return this.duration;
};

workoutSessionSchema.methods.calculateStats = function() {
  const stats = {
    totalExercises: this.exercises.length,
    completedExercises: this.exercises.filter(ex => !ex.skipped).length,
    totalSets: 0,
    completedSets: 0,
    totalReps: 0,
    totalWeight: 0
  };
  
  this.exercises.forEach(exercise => {
    stats.totalSets += exercise.completedSets.length;
    stats.completedSets += exercise.completedSets.length;
    
    exercise.completedSets.forEach(set => {
      stats.totalReps += set.reps || 0;
      stats.totalWeight += (set.weight || 0) * (set.reps || 0);
    });
  });
  
  this.stats = stats;
  this.completionPercentage = stats.totalExercises > 0 
    ? Math.round((stats.completedExercises / stats.totalExercises) * 100)
    : 0;
    
  return stats;
};

const WorkoutProgram = mongoose.model('WorkoutProgram', workoutProgramSchema);
const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);

module.exports = {
  WorkoutProgram,
  WorkoutSession
};