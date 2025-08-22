const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include in queries by default
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  surname: {
    type: String,
    trim: true,
    maxlength: [50, 'Surname cannot exceed 50 characters']
  },
  
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['trainer', 'client'],
      message: 'Role must be either trainer or client'
    },
    index: true
  },
  
  // Profile Information
  profileImageUrl: {
    type: String,
    validate: {
      validator: function(url) {
        return !url || /^https?:\/\/.+/.test(url);
      },
      message: 'Please enter a valid URL'
    }
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Trainer-specific fields
  specializations: [{
    type: String,
    enum: [
      'Strength Training', 'Weight Loss', 'Bodybuilding', 'Functional Training',
      'CrossFit', 'Yoga', 'Pilates', 'Cardio', 'Rehabilitation', 'Sports Specific',
      'Nutrition Coaching', 'Mental Health', 'Senior Fitness', 'Youth Training'
    ]
  }],
  
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    default: 5
  },
  
  totalClients: {
    type: Number,
    default: 0,
    min: [0, 'Total clients cannot be negative']
  },
  
  yearsExperience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience seems too high']
  },
  
  certifications: [{
    name: String,
    issuer: String,
    dateObtained: Date,
    expiryDate: Date,
    verificationUrl: String
  }],
  
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  
  // Client-specific fields
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    validate: {
      validator: function(trainerId) {
        // Only validate if user is a client
        return this.role !== 'client' || trainerId;
      },
      message: 'Client must have a trainer assigned'
    }
  },
  
  // Physical Stats
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
  
  age: {
    type: Number,
    min: [13, 'User must be at least 13 years old'],
    max: [120, 'Age seems too high']
  },
  
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  
  // Fitness Information
  fitnessGoal: {
    type: String,
    enum: [
      'lose_weight', 'gain_muscle', 'improve_strength', 'improve_endurance',
      'improve_flexibility', 'rehabilitation', 'maintenance', 'sports_performance',
      'general_fitness', 'body_recomposition'
    ]
  },
  
  fitnessLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate'
  },
  
  medicalConditions: [{
    condition: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    notes: String
  }],
  
  // Goal Tracking
  goals: [{
    type: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'custom']
    },
    target: Number,
    current: Number,
    unit: String,
    startDate: {
      type: Date,
      default: Date.now
    },
    targetDate: Date,
    isAchieved: {
      type: Boolean,
      default: false
    },
    description: String
  }],
  
  // Subscription & Billing
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'suspended', 'cancelled'],
    default: 'trial'
  },
  
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'elite', 'custom']
  },
  
  subscriptionExpiry: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: String,
  
  passwordResetToken: String,
  passwordResetExpiry: Date,
  
  // Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'it',
      enum: ['it', 'en', 'es', 'fr', 'de']
    },
    timezone: {
      type: String,
      default: 'Europe/Rome'
    },
    units: {
      weight: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      distance: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km'
      },
      temperature: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      showProfile: {
        type: Boolean,
        default: true
      },
      showProgress: {
        type: Boolean,
        default: false
      },
      allowMessages: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  loginCount: {
    type: Number,
    default: 0
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Device Information
  devices: [{
    deviceId: String,
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'smartwatch', 'other']
    },
    os: String,
    browser: String,
    lastUsed: Date,
    pushToken: String // For push notifications
  }],
  
  // Social Features
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Statistics
  stats: {
    totalWorkouts: {
      type: Number,
      default: 0
    },
    totalWorkoutTime: {
      type: Number,
      default: 0 // in minutes
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastWorkout: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ trainerId: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActivity: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.surname ? `${this.name} ${this.surname}` : this.name;
});

// Virtual for BMI calculation
userSchema.virtual('bmi').get(function() {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    return Math.round((this.weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return null;
});

// Virtual for age calculation from birthdate
userSchema.virtual('calculatedAge').get(function() {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  return this.age;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it was modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update activity
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to generate auth token
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: this._id, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Instance method to update last activity
userSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  this.loginCount += 1;
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method to find trainer's clients
userSchema.statics.findTrainerClients = function(trainerId) {
  return this.find({ 
    trainerId: trainerId, 
    role: 'client', 
    isActive: true 
  }).select('-password');
};

// Static method for search
userSchema.statics.search = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { name: searchRegex },
      { surname: searchRegex },
      { email: searchRegex }
    ],
    isActive: true,
    ...options
  };
  
  return this.find(filter).select('-password');
};

module.exports = mongoose.model('User', userSchema);