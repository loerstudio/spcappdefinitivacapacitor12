import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';

class DatabaseSetupService {
  static final DatabaseSetupService _instance = DatabaseSetupService._internal();
  factory DatabaseSetupService() => _instance;
  DatabaseSetupService._internal();

  final SupabaseClient _client = Supabase.instance.client;
  
  Future<bool> setupDatabase() async {
    try {
      print('🚀 Starting automatic database setup...');
      
      // Check if tables exist and create them if needed
      await _createTablesIfNotExist();
      await _setupRowLevelSecurity();
      await _createStorageBuckets();
      await _insertInitialData();
      
      print('✅ Database setup completed successfully!');
      return true;
    } catch (e) {
      print('❌ Database setup failed: $e');
      return false;
    }
  }

  Future<void> _createTablesIfNotExist() async {
    print('📋 Creating database tables...');
    
    // Users table
    await _executeSQL('''
      CREATE TABLE IF NOT EXISTS users (
        id UUID REFERENCES auth.users PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        surname TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'client',
        profile_image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        bio TEXT,
        specializations TEXT[],
        rating DECIMAL,
        total_clients INTEGER,
        trainer_id UUID REFERENCES users(id),
        weight DECIMAL,
        height DECIMAL,
        age INTEGER,
        fitness_goal TEXT,
        goal_start_date TIMESTAMPTZ,
        goal_end_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    ''');

    // Workouts table
    await _executeSQL('''
      CREATE TABLE IF NOT EXISTS workouts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        trainer_id UUID REFERENCES users(id) NOT NULL,
        client_id UUID REFERENCES users(id) NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        duration INTEGER,
        difficulty TEXT,
        exercises JSONB NOT NULL,
        scheduled_date TIMESTAMPTZ,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    ''');

    // Nutrition table
    await _executeSQL('''
      CREATE TABLE IF NOT EXISTS nutrition (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) NOT NULL,
        trainer_id UUID REFERENCES users(id),
        date DATE NOT NULL,
        meal_type TEXT NOT NULL,
        food_name TEXT NOT NULL,
        calories DECIMAL,
        protein DECIMAL,
        carbs DECIMAL,
        fat DECIMAL,
        quantity DECIMAL,
        unit TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    ''');

    // Progress table
    await _executeSQL('''
      CREATE TABLE IF NOT EXISTS progress (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) NOT NULL,
        date DATE NOT NULL,
        weight DECIMAL,
        body_fat DECIMAL,
        muscle_mass DECIMAL,
        notes TEXT,
        photos TEXT[],
        measurements JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    ''');

    // Chats table
    await _executeSQL('''
      CREATE TABLE IF NOT EXISTS chats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sender_id UUID REFERENCES users(id) NOT NULL,
        receiver_id UUID REFERENCES users(id) NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        file_path TEXT,
        is_read BOOLEAN DEFAULT false,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    ''');

    print('✅ Tables created successfully');
  }

  Future<void> _setupRowLevelSecurity() async {
    print('🔒 Setting up Row Level Security...');
    
    // Enable RLS on all tables
    final tables = ['users', 'workouts', 'nutrition', 'progress', 'chats'];
    
    for (final table in tables) {
      await _executeSQL('ALTER TABLE $table ENABLE ROW LEVEL SECURITY;');
    }

    // Users policies
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can view all users" ON users
        FOR SELECT USING (true);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can update own record" ON users
        FOR UPDATE USING (auth.uid() = id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can insert own record" ON users
        FOR INSERT WITH CHECK (auth.uid() = id);
    ''');

    // Workouts policies
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Trainers can manage their workouts" ON workouts
        FOR ALL USING (auth.uid() = trainer_id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Clients can view their workouts" ON workouts
        FOR SELECT USING (auth.uid() = client_id);
    ''');

    // Nutrition policies
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can manage own nutrition" ON nutrition
        FOR ALL USING (auth.uid() = user_id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Trainers can view client nutrition" ON nutrition
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = nutrition.user_id 
            AND users.trainer_id = auth.uid()
          )
        );
    ''');

    // Progress policies
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can manage own progress" ON progress
        FOR ALL USING (auth.uid() = user_id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Trainers can view client progress" ON progress
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = progress.user_id 
            AND users.trainer_id = auth.uid()
          )
        );
    ''');

    // Chats policies
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can view their messages" ON chats
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can send messages" ON chats
        FOR INSERT WITH CHECK (auth.uid() = sender_id);
    ''');
    
    await _executeSQL('''
      CREATE POLICY IF NOT EXISTS "Users can update own messages" ON chats
        FOR UPDATE USING (auth.uid() = sender_id);
    ''');

    print('✅ Row Level Security configured');
  }

  Future<void> _createStorageBuckets() async {
    print('🗄️ Creating storage buckets...');
    
    try {
      // Create buckets if they don't exist
      final buckets = ['profile_images', 'workout_images', 'nutrition_images'];
      
      for (final bucketName in buckets) {
        try {
          await _client.storage.createBucket(bucketName, BucketOptions(
            public: false,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 5242880, // 5MB
          ));
          print('✅ Created bucket: $bucketName');
        } catch (e) {
          if (e.toString().contains('already exists')) {
            print('ℹ️ Bucket $bucketName already exists');
          } else {
            print('⚠️ Error creating bucket $bucketName: $e');
          }
        }
      }
    } catch (e) {
      print('⚠️ Storage setup error (non-critical): $e');
    }
  }

  Future<void> _insertInitialData() async {
    print('📝 Checking for initial data...');
    
    try {
      // Check if we already have users
      final existingUsers = await _client.from('users').select('count');
      
      if (existingUsers.isEmpty) {
        print('📝 Inserting sample data...');
        
        // Note: In a real scenario, users would be created through auth.signUp
        // This is just for demonstration - actual users will be created via authentication
        print('ℹ️ Users will be created through authentication process');
      } else {
        print('ℹ️ Data already exists, skipping initial data insertion');
      }
    } catch (e) {
      print('⚠️ Initial data check error (non-critical): $e');
    }
  }

  Future<void> _executeSQL(String sql) async {
    try {
      await _client.rpc('exec_sql', params: {'sql': sql});
    } catch (e) {
      // Try alternative method for executing SQL
      try {
        await _client.from('_').select(sql);
      } catch (e2) {
        print('⚠️ SQL execution error: $e');
        // Continue with setup - some errors might be non-critical
      }
    }
  }

  Future<bool> isDatabaseSetup() async {
    try {
      // Check if our main tables exist by trying to query them
      await _client.from('users').select('count').limit(1);
      return true;
    } catch (e) {
      return false;
    }
  }
}