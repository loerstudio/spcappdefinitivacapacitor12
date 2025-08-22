#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

// Import models
const User = require('../models/User');
const { WorkoutProgram, WorkoutSession } = require('../models/Workout');
const { FoodItem, DailyNutrition, NutritionPlan } = require('../models/Nutrition');
const { ProgressPhoto, BodyMeasurement, GoalProgress, Achievement } = require('../models/Progress');
const { Message, Conversation } = require('../models/Chat');

console.log('🌱 MongoDB Enterprise Data Seeding');
console.log('=' .repeat(50));

// Set Italian locale for faker
faker.setDefaultRefDate('2024-01-01T00:00:00.000Z');

// Sample data generators
const generateUsers = async () => {
  console.log('👥 Creating users...');
  
  const users = [];
  
  // Create 5 trainers
  for (let i = 0; i < 5; i++) {
    const trainer = {
      email: faker.internet.email(),
      password: 'password123',
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      role: 'trainer',
      specializations: faker.helpers.arrayElements([
        'Strength Training', 'Weight Loss', 'Bodybuilding', 'Functional Training',
        'CrossFit', 'Yoga', 'Pilates', 'Cardio', 'Rehabilitation'
      ], { min: 2, max: 4 }),
      rating: faker.datatype.float({ min: 4.0, max: 5.0, precision: 0.1 }),
      yearsExperience: faker.datatype.number({ min: 1, max: 15 }),
      hourlyRate: faker.datatype.number({ min: 30, max: 100 }),
      bio: faker.lorem.paragraph(),
      phone: '+39' + faker.string.numeric(9),
      location: {
        type: 'Point',
        coordinates: [
          faker.datatype.float({ min: 6.6, max: 18.5, precision: 0.0001 }), // Italy longitude
          faker.datatype.float({ min: 35.5, max: 47.1, precision: 0.0001 })  // Italy latitude
        ],
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.helpers.arrayElement(['Lombardia', 'Lazio', 'Campania', 'Sicilia', 'Veneto']),
        country: 'Italia'
      },
      isActive: true,
      isVerified: true
    };
    users.push(trainer);
  }
  
  // Create 20 clients (4 for each trainer)
  for (let i = 0; i < 20; i++) {
    const trainerId = users[Math.floor(i / 4)]._id; // Assign to trainers evenly
    
    const client = {
      email: faker.internet.email(),
      password: 'password123',
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      role: 'client',
      trainerId: null, // Will be set after trainers are created
      age: faker.datatype.number({ min: 18, max: 65 }),
      weight: faker.datatype.number({ min: 50, max: 120 }),
      height: faker.datatype.number({ min: 150, max: 200 }),
      gender: faker.helpers.arrayElement(['male', 'female', 'other']),
      fitnessGoal: faker.helpers.arrayElement([
        'lose_weight', 'gain_muscle', 'improve_strength', 'improve_endurance',
        'improve_flexibility', 'maintenance', 'sports_performance', 'general_fitness'
      ]),
      fitnessLevel: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
      activityLevel: faker.helpers.arrayElement(['sedentary', 'light', 'moderate', 'active']),
      bio: faker.lorem.sentence(),
      phone: '+39' + faker.string.numeric(9),
      location: {
        type: 'Point',
        coordinates: [
          faker.datatype.float({ min: 6.6, max: 18.5, precision: 0.0001 }),
          faker.datatype.float({ min: 35.5, max: 47.1, precision: 0.0001 })
        ],
        city: faker.location.city(),
        country: 'Italia'
      },
      isActive: true,
      isVerified: true
    };
    users.push(client);
  }
  
  // Save users to database
  const createdUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
  }
  
  // Update clients with trainer references
  const trainers = createdUsers.filter(u => u.role === 'trainer');
  const clients = createdUsers.filter(u => u.role === 'client');
  
  for (let i = 0; i < clients.length; i++) {
    const trainerIndex = Math.floor(i / 4); // 4 clients per trainer
    clients[i].trainerId = trainers[trainerIndex]._id;
    await clients[i].save();
    
    // Update trainer's client count
    trainers[trainerIndex].totalClients += 1;
    await trainers[trainerIndex].save();
  }
  
  console.log(`✅ Created ${trainers.length} trainers and ${clients.length} clients`);
  return { trainers, clients };
};

const generateFoodItems = async () => {
  console.log('🍎 Creating food items...');
  
  const foodItems = [];
  const italianFoods = [
    { name: 'Petto di pollo', category: 'proteins', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: 'Salmone', category: 'proteins', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { name: 'Uova', category: 'proteins', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    { name: 'Riso basmati', category: 'carbohydrates', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { name: 'Pasta integrale', category: 'carbohydrates', calories: 124, protein: 5, carbs: 23, fat: 1.1 },
    { name: 'Avocado', category: 'fats', calories: 160, protein: 2, carbs: 9, fat: 15 },
    { name: 'Spinaci', category: 'vegetables', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    { name: 'Broccoli', category: 'vegetables', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    { name: 'Banane', category: 'fruits', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    { name: 'Mele', category: 'fruits', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 }
  ];
  
  for (const food of italianFoods) {
    const foodItem = new FoodItem({
      ...food,
      nutrition: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: faker.datatype.number({ min: 0, max: 10 }),
        sugar: faker.datatype.number({ min: 0, max: 15 })
      },
      verified: true
    });
    
    await foodItem.save();
    foodItems.push(foodItem);
  }
  
  console.log(`✅ Created ${foodItems.length} food items`);
  return foodItems;
};

const generateWorkoutPrograms = async (trainers, clients) => {
  console.log('💪 Creating workout programs...');
  
  const programs = [];
  
  for (const trainer of trainers) {
    const trainerClients = clients.filter(c => c.trainerId.equals(trainer._id));
    
    // Create 2-3 programs per trainer
    for (let i = 0; i < faker.datatype.number({ min: 2, max: 3 }); i++) {
      const program = new WorkoutProgram({
        name: faker.helpers.arrayElement([
          'Programma Forza Base', 'Dimagrimento Efficace', 'Massa Muscolare',
          'Tonificazione Completa', 'Resistenza Cardio', 'Funzionale Avanzato'
        ]),
        description: faker.lorem.paragraph(),
        trainerId: trainer._id,
        clientId: faker.helpers.arrayElement(trainerClients)?._id,
        programType: faker.helpers.arrayElement([
          'strength', 'hypertrophy', 'endurance', 'weight_loss', 'general_fitness'
        ]),
        difficulty: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
        duration: {
          weeks: faker.datatype.number({ min: 4, max: 16 }),
          sessionsPerWeek: faker.datatype.number({ min: 2, max: 5 })
        },
        goals: faker.helpers.arrayElements([
          'strength_gain', 'muscle_gain', 'fat_loss', 'endurance_improvement'
        ], { min: 1, max: 3 }),
        requiredEquipment: faker.helpers.arrayElements([
          'barbell', 'dumbbell', 'cable_machine', 'bodyweight_only'
        ], { min: 1, max: 3 }),
        days: [
          {
            name: 'Giorno 1 - Upper Body',
            dayNumber: 1,
            exercises: [
              {
                name: 'Panca Piana',
                category: 'chest',
                sets: [
                  { setNumber: 1, reps: 12, weight: 60, restTime: 90 },
                  { setNumber: 2, reps: 10, weight: 70, restTime: 90 },
                  { setNumber: 3, reps: 8, weight: 80, restTime: 120 }
                ]
              },
              {
                name: 'Trazioni',
                category: 'back',
                sets: [
                  { setNumber: 1, reps: 8, restTime: 120 },
                  { setNumber: 2, reps: 6, restTime: 120 },
                  { setNumber: 3, reps: 6, restTime: 120 }
                ]
              }
            ],
            estimatedDuration: 60
          },
          {
            name: 'Giorno 2 - Lower Body',
            dayNumber: 2,
            exercises: [
              {
                name: 'Squat',
                category: 'legs',
                sets: [
                  { setNumber: 1, reps: 15, weight: 60, restTime: 120 },
                  { setNumber: 2, reps: 12, weight: 70, restTime: 120 },
                  { setNumber: 3, reps: 10, weight: 80, restTime: 180 }
                ]
              }
            ],
            estimatedDuration: 50
          }
        ],
        isActive: true,
        stats: {
          totalSessions: faker.datatype.number({ min: 0, max: 50 }),
          completedSessions: faker.datatype.number({ min: 0, max: 30 }),
          averageRating: faker.datatype.float({ min: 4.0, max: 5.0, precision: 0.1 })
        }
      });
      
      await program.save();
      programs.push(program);
    }
  }
  
  console.log(`✅ Created ${programs.length} workout programs`);
  return programs;
};

const generateWorkoutSessions = async (programs, clients) => {
  console.log('🏋️ Creating workout sessions...');
  
  const sessions = [];
  
  for (const program of programs) {
    if (!program.clientId) continue;
    
    const sessionsCount = faker.datatype.number({ min: 5, max: 20 });
    
    for (let i = 0; i < sessionsCount; i++) {
      const startDate = faker.date.recent({ days: 30 });
      const session = new WorkoutSession({
        clientId: program.clientId,
        programId: program._id,
        dayId: program.days[0]._id,
        sessionName: program.days[0].name,
        startTime: startDate,
        endTime: new Date(startDate.getTime() + (faker.datatype.number({ min: 30, max: 90 }) * 60 * 1000)),
        exercises: program.days[0].exercises.map(exercise => ({
          exerciseId: exercise._id,
          name: exercise.name,
          completedSets: exercise.sets.map(set => ({
            setNumber: set.setNumber,
            reps: faker.datatype.number({ min: set.reps - 2, max: set.reps + 2 }),
            weight: set.weight ? faker.datatype.number({ min: set.weight - 5, max: set.weight + 5 }) : undefined,
            completedAt: new Date(startDate.getTime() + (set.setNumber * 5 * 60 * 1000))
          }))
        })),
        isCompleted: faker.datatype.boolean(0.8), // 80% completion rate
        rating: faker.datatype.number({ min: 3, max: 5 }),
        effort: faker.helpers.arrayElement(['moderate', 'hard', 'very_hard']),
        mood: faker.helpers.arrayElement(['good', 'excellent', 'neutral', 'tired']),
        location: faker.helpers.arrayElement(['gym', 'home', 'outdoor'])
      });
      
      session.calculateDuration();
      session.calculateStats();
      
      await session.save();
      sessions.push(session);
    }
  }
  
  console.log(`✅ Created ${sessions.length} workout sessions`);
  return sessions;
};

const generateBodyMeasurements = async (clients) => {
  console.log('📏 Creating body measurements...');
  
  const measurements = [];
  
  for (const client of clients.slice(0, 10)) { // Only for first 10 clients
    const measurementCount = faker.datatype.number({ min: 5, max: 15 });
    
    for (let i = 0; i < measurementCount; i++) {
      const measurement = new BodyMeasurement({
        userId: client._id,
        date: faker.date.recent({ days: 90 }),
        weight: faker.datatype.number({ min: client.weight - 10, max: client.weight + 5 }),
        height: client.height,
        bodyFatPercentage: faker.datatype.float({ min: 8, max: 35, precision: 0.1 }),
        muscleMass: faker.datatype.float({ min: 30, max: 60, precision: 0.1 }),
        measurements: {
          chest: faker.datatype.number({ min: 80, max: 120 }),
          waist: faker.datatype.number({ min: 70, max: 100 }),
          hips: faker.datatype.number({ min: 85, max: 110 }),
          bicep: faker.datatype.number({ min: 25, max: 45 }),
          thigh: faker.datatype.number({ min: 45, max: 70 })
        },
        vitals: {
          restingHeartRate: faker.datatype.number({ min: 60, max: 100 }),
          sleepHours: faker.datatype.float({ min: 6, max: 9, precision: 0.5 }),
          stressLevel: faker.datatype.number({ min: 1, max: 10 }),
          energyLevel: faker.datatype.number({ min: 1, max: 10 })
        },
        mood: faker.helpers.arrayElement(['excellent', 'good', 'neutral', 'low']),
        notes: faker.lorem.sentence()
      });
      
      await measurement.save();
      measurements.push(measurement);
    }
  }
  
  console.log(`✅ Created ${measurements.length} body measurements`);
  return measurements;
};

const generateMessages = async (trainers, clients) => {
  console.log('💬 Creating messages and conversations...');
  
  const messages = [];
  const conversations = [];
  
  // Create conversations between trainers and their clients
  for (const trainer of trainers) {
    const trainerClients = clients.filter(c => c.trainerId.equals(trainer._id));
    
    for (const client of trainerClients) {
      // Create conversation
      const conversation = new Conversation({
        participants: [
          { user: trainer._id, role: 'trainer' },
          { user: client._id, role: 'client' }
        ],
        conversationType: 'direct'
      });
      
      await conversation.save();
      conversations.push(conversation);
      
      // Create 5-15 messages in each conversation
      const messageCount = faker.datatype.number({ min: 5, max: 15 });
      
      for (let i = 0; i < messageCount; i++) {
        const isFromTrainer = faker.datatype.boolean();
        const sender = isFromTrainer ? trainer : client;
        const receiver = isFromTrainer ? client : trainer;
        
        const message = new Message({
          senderId: sender._id,
          receiverId: receiver._id,
          message: faker.helpers.arrayElement([
            'Ciao! Come va l\'allenamento?',
            'Ottimo lavoro oggi in palestra!',
            'Ricordati di fare stretching dopo l\'allenamento',
            'Hai qualche domanda sul programma?',
            'Complimenti per i progressi!',
            'Come ti senti dopo l\'ultimo workout?',
            'Ricordati di bere molta acqua',
            'Sei pronto per la prossima sessione?'
          ]),
          messageType: 'text',
          isRead: faker.datatype.boolean(0.7),
          createdAt: faker.date.recent({ days: 7 })
        });
        
        if (message.isRead) {
          message.readAt = new Date(message.createdAt.getTime() + faker.datatype.number({ min: 60000, max: 3600000 }));
        }
        
        await message.save();
        messages.push(message);
      }
      
      // Update conversation with last message
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        conversation.lastMessage = lastMessage._id;
        conversation.lastActivity = lastMessage.createdAt;
        conversation.messageCount = messageCount;
        await conversation.save();
      }
    }
  }
  
  console.log(`✅ Created ${conversations.length} conversations and ${messages.length} messages`);
  return { conversations, messages };
};

// Main seeding function
async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spc_fitness_app', {
      maxPoolSize: 10
    });
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data (optional)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('🗑️  Clearing existing data...');
      await User.deleteMany({});
      await WorkoutProgram.deleteMany({});
      await WorkoutSession.deleteMany({});
      await FoodItem.deleteMany({});
      await DailyNutrition.deleteMany({});
      await NutritionPlan.deleteMany({});
      await ProgressPhoto.deleteMany({});
      await BodyMeasurement.deleteMany({});
      await GoalProgress.deleteMany({});
      await Achievement.deleteMany({});
      await Message.deleteMany({});
      await Conversation.deleteMany({});
      console.log('✅ Data cleared');
    }
    
    // Generate seed data
    const { trainers, clients } = await generateUsers();
    const foodItems = await generateFoodItems();
    const programs = await generateWorkoutPrograms(trainers, clients);
    const sessions = await generateWorkoutSessions(programs, clients);
    const measurements = await generateBodyMeasurements(clients);
    const { conversations, messages } = await generateMessages(trainers, clients);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database seeding completed successfully!');
    console.log('='.repeat(50));
    console.log('📊 Summary:');
    console.log(`👥 Users: ${trainers.length + clients.length} (${trainers.length} trainers, ${clients.length} clients)`);
    console.log(`🍎 Food items: ${foodItems.length}`);
    console.log(`💪 Workout programs: ${programs.length}`);
    console.log(`🏋️  Workout sessions: ${sessions.length}`);
    console.log(`📏 Body measurements: ${measurements.length}`);
    console.log(`💬 Conversations: ${conversations.length}`);
    console.log(`📨 Messages: ${messages.length}`);
    console.log('='.repeat(50));
    
    // Test login credentials
    console.log('\n🔑 Test Login Credentials:');
    console.log('Trainer: ' + trainers[0].email + ' / password123');
    console.log('Client: ' + clients[0].email + ' / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;