const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || './database/spc.db';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        surname TEXT,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('trainer', 'client')),
        profile_image_url TEXT,
        bio TEXT,
        specializations TEXT, -- JSON array for trainers
        rating REAL,
        total_clients INTEGER DEFAULT 0,
        trainer_id INTEGER,
        weight REAL,
        height REAL,
        age INTEGER,
        fitness_goal TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainer_id) REFERENCES users (id)
      )`,

      // Workout Programs table
      `CREATE TABLE IF NOT EXISTS workout_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        trainer_id INTEGER NOT NULL,
        client_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainer_id) REFERENCES users (id),
        FOREIGN KEY (client_id) REFERENCES users (id)
      )`,

      // Workout Days table
      `CREATE TABLE IF NOT EXISTS workout_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE
      )`,

      // Exercises table
      `CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        primary_muscle TEXT,
        secondary_muscles TEXT, -- JSON array
        image_url TEXT,
        video_url TEXT,
        exercise_order INTEGER DEFAULT 0,
        rest_time_seconds INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (day_id) REFERENCES workout_days (id) ON DELETE CASCADE
      )`,

      // Exercise Sets table
      `CREATE TABLE IF NOT EXISTS exercise_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight REAL,
        duration_seconds INTEGER,
        distance REAL,
        notes TEXT,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
      )`,

      // Workout Sessions table
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        day_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        notes TEXT,
        is_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id),
        FOREIGN KEY (program_id) REFERENCES workout_programs (id),
        FOREIGN KEY (day_id) REFERENCES workout_days (id)
      )`,

      // Completed Sets table
      `CREATE TABLE IF NOT EXISTS completed_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        actual_reps INTEGER,
        actual_weight REAL,
        actual_duration_seconds INTEGER,
        actual_distance REAL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      )`,

      // Nutrition Plans table
      `CREATE TABLE IF NOT EXISTS nutrition_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        trainer_id INTEGER NOT NULL,
        client_id INTEGER,
        target_calories REAL,
        target_protein REAL,
        target_carbs REAL,
        target_fats REAL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainer_id) REFERENCES users (id),
        FOREIGN KEY (client_id) REFERENCES users (id)
      )`,

      // Nutrition Days table
      `CREATE TABLE IF NOT EXISTS nutrition_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (plan_id) REFERENCES nutrition_plans (id) ON DELETE CASCADE
      )`,

      // Meals table
      `CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3')),
        time TEXT,
        notes TEXT,
        meal_order INTEGER DEFAULT 0,
        FOREIGN KEY (day_id) REFERENCES nutrition_days (id) ON DELETE CASCADE
      )`,

      // Food Items table
      `CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'g',
        calories_per_100g REAL NOT NULL,
        protein_per_100g REAL NOT NULL,
        carbs_per_100g REAL NOT NULL,
        fats_per_100g REAL NOT NULL,
        image_url TEXT,
        barcode TEXT,
        FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
      )`,

      // Food Logs table
      `CREATE TABLE IF NOT EXISTS food_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        date DATE NOT NULL,
        meal_type TEXT NOT NULL,
        foods TEXT NOT NULL, -- JSON array of food items
        weight REAL,
        notes TEXT,
        photo_urls TEXT, -- JSON array of photo URLs
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id)
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        file_url TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (receiver_id) REFERENCES users (id)
      )`,

      // Progress Entries table
      `CREATE TABLE IF NOT EXISTS progress_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        date DATE NOT NULL,
        weight REAL,
        body_fat_percentage REAL,
        muscle_mass REAL,
        measurements TEXT, -- JSON object with body measurements
        photos TEXT, -- JSON array of photo URLs
        notes TEXT,
        trainer_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id)
      )`,

      // Goals table
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_value REAL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        goal_type TEXT NOT NULL, -- weight_loss, muscle_gain, strength, etc.
        start_date DATE NOT NULL,
        target_date DATE NOT NULL,
        is_achieved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    console.log('✅ Database tables created successfully');
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)',
      'CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON users (trainer_id)',
      'CREATE INDEX IF NOT EXISTS idx_workout_programs_trainer ON workout_programs (trainer_id)',
      'CREATE INDEX IF NOT EXISTS idx_workout_programs_client ON workout_programs (client_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_progress_client_date ON progress_entries (client_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_food_logs_client_date ON food_logs (client_id, date)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }

    console.log('✅ Database indexes created successfully');
  }
}

module.exports = Database;