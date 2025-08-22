#!/usr/bin/env node

const Database = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const db = new Database();
  
  try {
    console.log('🗃️  Inizializzazione database...');
    
    // Connect to database
    await db.connect();
    
    // Create tables
    await db.createTables();
    
    // Create indexes
    await db.createIndexes();
    
    // Create demo users
    console.log('👥 Creazione utenti demo...');
    
    // Create demo trainer
    const trainerPassword = await bcrypt.hash('password', 10);
    const trainerResult = await db.run(`
      INSERT OR REPLACE INTO users (
        id, email, password, name, surname, phone, role, bio, specializations,
        rating, total_clients, is_active, created_at
      ) VALUES (1, 'trainer@demo.com', ?, 'Simone', 'Pagno', '+39 333 123 4567', 'trainer', 
               'Personal Trainer certificato con 10 anni di esperienza nel fitness e bodybuilding. Specializzato in trasformazioni corporee e allenamento funzionale.',
               ?, 4.8, 0, 1, CURRENT_TIMESTAMP)
    `, [
      trainerPassword,
      JSON.stringify(['Strength Training', 'Weight Loss', 'Bodybuilding', 'Functional Training'])
    ]);

    // Create demo client
    const clientPassword = await bcrypt.hash('password', 10);
    const clientResult = await db.run(`
      INSERT OR REPLACE INTO users (
        id, email, password, name, surname, phone, role, trainer_id,
        weight, height, age, fitness_goal, is_active, created_at
      ) VALUES (2, 'client@demo.com', ?, 'Mario', 'Rossi', '+39 333 987 6543', 'client', 1,
               75.5, 175, 28, 'Perdere peso e tonificare', 1, CURRENT_TIMESTAMP)
    `, [clientPassword]);

    // Create additional demo clients
    const additionalClients = [
      {
        email: 'giulia.bianchi@email.com',
        name: 'Giulia',
        surname: 'Bianchi',
        phone: '+39 333 456 7890',
        weight: 62.0,
        height: 165,
        age: 25,
        goal: 'Tonificare e aumentare forza'
      },
      {
        email: 'luca.verdi@email.com',
        name: 'Luca',
        surname: 'Verdi',
        phone: '+39 333 111 2222',
        weight: 80.0,
        height: 180,
        age: 32,
        goal: 'Aumentare massa muscolare'
      }
    ];

    for (let i = 0; i < additionalClients.length; i++) {
      const client = additionalClients[i];
      await db.run(`
        INSERT OR REPLACE INTO users (
          id, email, password, name, surname, phone, role, trainer_id,
          weight, height, age, fitness_goal, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'client', 1, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [
        i + 3,
        client.email,
        clientPassword,
        client.name,
        client.surname,
        client.phone,
        client.weight,
        client.height,
        client.age,
        client.goal
      ]);
    }

    // Update trainer's client count
    await db.run(
      'UPDATE users SET total_clients = (SELECT COUNT(*) FROM users WHERE trainer_id = 1 AND role = "client") WHERE id = 1'
    );

    // Create demo workout program
    console.log('💪 Creazione programma allenamento demo...');
    
    const programResult = await db.run(`
      INSERT INTO workout_programs (
        id, name, description, trainer_id, client_id, is_active, created_at
      ) VALUES (1, 'Upper Body Power', 
               'Programma di allenamento focalizzato sulla parte superiore del corpo per aumentare forza e massa muscolare.',
               1, 2, 1, CURRENT_TIMESTAMP)
    `);

    // Create workout day
    const dayResult = await db.run(`
      INSERT INTO workout_days (
        id, program_id, name, day_number, notes
      ) VALUES (1, 1, 'Petto, Spalle e Tricipiti', 1, 'Concentrati sulla forma corretta e controllo del movimento')
    `);

    // Create exercises
    const exercises = [
      {
        name: 'Chest Press con Manubri',
        description: 'Distendi i manubri sopra il petto controllando il movimento',
        category: 'Petto',
        primary_muscle: 'Pectorals',
        sets: [
          { set_number: 1, reps: 12, weight: 20 },
          { set_number: 2, reps: 12, weight: 22.5 },
          { set_number: 3, reps: 10, weight: 25 },
          { set_number: 4, reps: 8, weight: 25 }
        ]
      },
      {
        name: 'Rematore con Manubrio',
        description: 'Tira il manubrio verso l\'addome mantenendo la schiena dritta',
        category: 'Schiena',
        primary_muscle: 'Latissimus',
        sets: [
          { set_number: 1, reps: 12, weight: 18 },
          { set_number: 2, reps: 12, weight: 20 },
          { set_number: 3, reps: 10, weight: 22 },
          { set_number: 4, reps: 10, weight: 22 }
        ]
      },
      {
        name: 'Alzate Laterali',
        description: 'Solleva i manubri lateralmente fino all\'altezza delle spalle',
        category: 'Spalle',
        primary_muscle: 'Deltoids',
        sets: [
          { set_number: 1, reps: 15, weight: 6 },
          { set_number: 2, reps: 15, weight: 8 },
          { set_number: 3, reps: 12, weight: 8 }
        ]
      }
    ];

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      
      const exerciseResult = await db.run(`
        INSERT INTO exercises (
          day_id, name, description, category, primary_muscle, exercise_order, rest_time_seconds
        ) VALUES (1, ?, ?, ?, ?, ?, 60)
      `, [exercise.name, exercise.description, exercise.category, exercise.primary_muscle, i + 1]);

      // Add sets
      for (const set of exercise.sets) {
        await db.run(`
          INSERT INTO exercise_sets (exercise_id, set_number, reps, weight)
          VALUES (?, ?, ?, ?)
        `, [exerciseResult.id, set.set_number, set.reps, set.weight]);
      }
    }

    // Create demo nutrition plan
    console.log('🍎 Creazione piano nutrizionale demo...');
    
    const nutritionResult = await db.run(`
      INSERT INTO nutrition_plans (
        id, name, description, trainer_id, client_id,
        target_calories, target_protein, target_carbs, target_fats,
        is_active, created_at
      ) VALUES (1, 'Piano Dimagrimento', 
               'Piano nutrizionale bilanciato per perdita di peso sostenibile',
               1, 2, 1800, 120, 180, 60, 1, CURRENT_TIMESTAMP)
    `);

    // Create nutrition day
    const nutritionDayResult = await db.run(`
      INSERT INTO nutrition_days (
        id, plan_id, name, day_number, notes
      ) VALUES (1, 1, 'Giorno Tipo', 1, 'Bevi almeno 2 litri di acqua durante il giorno')
    `);

    // Create demo meals
    const meals = [
      {
        name: 'Colazione Proteica',
        type: 'breakfast',
        time: '08:00',
        foods: [
          { name: 'Avena', quantity: 50, calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66.3, fats_per_100g: 6.9 },
          { name: 'Latte Scremato', quantity: 200, unit: 'ml', calories_per_100g: 35, protein_per_100g: 3.4, carbs_per_100g: 5.0, fats_per_100g: 0.1 },
          { name: 'Mirtilli', quantity: 80, calories_per_100g: 57, protein_per_100g: 0.7, carbs_per_100g: 14.5, fats_per_100g: 0.3 }
        ]
      },
      {
        name: 'Pranzo Bilanciato',
        type: 'lunch',
        time: '13:00',
        foods: [
          { name: 'Petto di Pollo', quantity: 120, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fats_per_100g: 3.6 },
          { name: 'Riso Integrale', quantity: 80, calories_per_100g: 350, protein_per_100g: 7, carbs_per_100g: 72, fats_per_100g: 2.8 },
          { name: 'Broccoli', quantity: 150, calories_per_100g: 25, protein_per_100g: 3, carbs_per_100g: 5, fats_per_100g: 0.3 }
        ]
      }
    ];

    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      
      const mealResult = await db.run(`
        INSERT INTO meals (day_id, name, type, time, meal_order)
        VALUES (1, ?, ?, ?, ?)
      `, [meal.name, meal.type, meal.time, i + 1]);

      // Add foods
      for (const food of meal.foods) {
        await db.run(`
          INSERT INTO food_items (
            meal_id, name, quantity, unit, calories_per_100g, 
            protein_per_100g, carbs_per_100g, fats_per_100g
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          mealResult.id,
          food.name,
          food.quantity,
          food.unit || 'g',
          food.calories_per_100g,
          food.protein_per_100g,
          food.carbs_per_100g,
          food.fats_per_100g
        ]);
      }
    }

    // Create demo messages
    console.log('💬 Creazione messaggi demo...');
    
    const messages = [
      { sender: 1, receiver: 2, content: 'Ciao Mario! Come va l\'allenamento di oggi?', created: new Date(Date.now() - 3600000) },
      { sender: 2, receiver: 1, content: 'Ciao Simone! Tutto bene, ho completato tutti gli esercizi come da programma 💪', created: new Date(Date.now() - 3000000) },
      { sender: 1, receiver: 2, content: 'Perfetto! Come ti senti? Qualche dolore o difficoltà?', created: new Date(Date.now() - 2400000) },
      { sender: 2, receiver: 1, content: 'Mi sento bene, solo un po\' di affaticamento sui tricipiti ma normale', created: new Date(Date.now() - 1800000) },
      { sender: 1, receiver: 2, content: 'Ottimo! È normale. Domani ricordati di fare stretching e bere molta acqua 👍', created: new Date(Date.now() - 1200000) }
    ];

    for (const msg of messages) {
      await db.run(`
        INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read)
        VALUES (?, ?, ?, ?, 1)
      `, [msg.sender, msg.receiver, msg.content, msg.created.toISOString()]);
    }

    // Create demo progress entry
    console.log('📈 Creazione voce progresso demo...');
    
    await db.run(`
      INSERT INTO progress_entries (
        client_id, date, weight, body_fat_percentage, 
        measurements, notes, created_at
      ) VALUES (2, ?, 75.5, 18.5, ?, 'Misurazione iniziale', CURRENT_TIMESTAMP)
    `, [
      new Date().toISOString().split('T')[0],
      JSON.stringify({
        chest: 95,
        waist: 82,
        hips: 95,
        bicep_right: 32,
        bicep_left: 31.5,
        thigh_right: 58,
        thigh_left: 57.5
      })
    ]);

    await db.close();
    
    console.log('✅ Database inizializzato con successo!');
    console.log('\n📋 Credenziali demo:');
    console.log('🏋️  Trainer: trainer@demo.com / password');
    console.log('👤 Cliente: client@demo.com / password');
    console.log('\n🗃️  Database: ./database/spc.db');
    
  } catch (error) {
    console.error('❌ Errore inizializzazione database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;