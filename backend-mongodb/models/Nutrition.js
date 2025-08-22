const mongoose = require('mongoose');

// Food Item Schema
const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'proteins', 'carbohydrates', 'vegetables', 'fruits', 'dairy', 
      'fats', 'beverages', 'snacks', 'supplements', 'spices'
    ]
  },
  // Nutritional values per 100g
  nutrition: {
    calories: {
      type: Number,
      required: true,
      min: 0
    },
    protein: {
      type: Number,
      default: 0,
      min: 0
    },
    carbs: {
      type: Number,
      default: 0,
      min: 0
    },
    fat: {
      type: Number,
      default: 0,
      min: 0
    },
    fiber: {
      type: Number,
      default: 0,
      min: 0
    },
    sugar: {
      type: Number,
      default: 0,
      min: 0
    },
    sodium: {
      type: Number,
      default: 0,
      min: 0
    },
    // Micronutrients (mg)
    calcium: Number,
    iron: Number,
    vitaminC: Number,
    vitaminD: Number
  },
  servingSize: {
    amount: {
      type: Number,
      default: 100
    },
    unit: {
      type: String,
      enum: ['g', 'ml', 'cup', 'piece', 'slice', 'tbsp', 'tsp'],
      default: 'g'
    }
  },
  barcode: String,
  imageUrl: String,
  verified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Meal Schema
const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'],
    required: true
  },
  foods: [{
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['g', 'ml', 'cup', 'piece', 'slice', 'tbsp', 'tsp'],
      default: 'g'
    }
  }],
  totalNutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  notes: String,
  prepTime: Number, // in minutes
  imageUrl: String
}, {
  timestamps: true,
  _id: true
});

// Daily Nutrition Log Schema
const dailyNutritionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  meals: [mealSchema],
  waterIntake: {
    type: Number, // in ml
    default: 0
  },
  dailyTotals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  dailyGoals: {
    calories: { type: Number, default: 2000 },
    protein: { type: Number, default: 150 },
    carbs: { type: Number, default: 250 },
    fat: { type: Number, default: 65 },
    water: { type: Number, default: 2000 }
  },
  notes: String,
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'low_energy', 'stressed']
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  weight: Number,
  photos: [String] // URLs to meal photos
}, {
  timestamps: true
});

// Nutrition Plan Schema
const nutritionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  planType: {
    type: String,
    enum: [
      'weight_loss', 'muscle_gain', 'maintenance', 'cutting', 'bulking',
      'athletic_performance', 'medical_diet', 'general_health'
    ],
    default: 'general_health'
  },
  duration: {
    weeks: {
      type: Number,
      min: 1,
      max: 52,
      default: 4
    }
  },
  dailyGoals: {
    calories: {
      type: Number,
      required: true
    },
    protein: {
      type: Number,
      required: true
    },
    carbs: {
      type: Number,
      required: true
    },
    fat: {
      type: Number,
      required: true
    },
    fiber: {
      type: Number,
      default: 25
    },
    water: {
      type: Number,
      default: 2000
    }
  },
  mealPlan: [{
    day: {
      type: Number,
      min: 1,
      max: 7
    },
    meals: [mealSchema]
  }],
  guidelines: [String],
  restrictions: [{
    type: String,
    enum: [
      'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free',
      'low_sodium', 'low_sugar', 'keto', 'paleo', 'mediterranean'
    ]
  }],
  supplements: [{
    name: String,
    dosage: String,
    timing: String,
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  stats: {
    adherenceRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    averageCalories: Number,
    daysFollowed: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
dailyNutritionSchema.index({ userId: 1, date: -1 });
nutritionPlanSchema.index({ trainerId: 1, isActive: 1 });
nutritionPlanSchema.index({ clientId: 1, isActive: 1 });
foodItemSchema.index({ name: 'text', brand: 'text' });

// Methods for calculating nutrition
mealSchema.methods.calculateNutrition = async function() {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  };

  for (const food of this.foods) {
    await food.populate('foodItem');
    const quantity = food.quantity / 100; // Convert to per 100g ratio
    
    totals.calories += (food.foodItem.nutrition.calories || 0) * quantity;
    totals.protein += (food.foodItem.nutrition.protein || 0) * quantity;
    totals.carbs += (food.foodItem.nutrition.carbs || 0) * quantity;
    totals.fat += (food.foodItem.nutrition.fat || 0) * quantity;
    totals.fiber += (food.foodItem.nutrition.fiber || 0) * quantity;
  }

  this.totalNutrition = totals;
  return totals;
};

dailyNutritionSchema.methods.calculateDailyTotals = function() {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  };

  this.meals.forEach(meal => {
    totals.calories += meal.totalNutrition.calories || 0;
    totals.protein += meal.totalNutrition.protein || 0;
    totals.carbs += meal.totalNutrition.carbs || 0;
    totals.fat += meal.totalNutrition.fat || 0;
    totals.fiber += meal.totalNutrition.fiber || 0;
  });

  this.dailyTotals = totals;
  return totals;
};

// Virtuals
dailyNutritionSchema.virtual('adherenceRate').get(function() {
  if (!this.dailyGoals.calories) return 0;
  const calorieAdherence = Math.min(100, (this.dailyTotals.calories / this.dailyGoals.calories) * 100);
  return Math.round(calorieAdherence);
});

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
const DailyNutrition = mongoose.model('DailyNutrition', dailyNutritionSchema);
const NutritionPlan = mongoose.model('NutritionPlan', nutritionPlanSchema);

module.exports = {
  FoodItem,
  DailyNutrition,
  NutritionPlan
};