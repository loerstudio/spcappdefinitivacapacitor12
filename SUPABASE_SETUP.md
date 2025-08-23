# Supabase Setup Guide

This guide will help you set up Supabase for your SPC Flutter App after migrating from Appwrite.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create an account
2. Create a new project
3. Note down your project URL and anon key from the project settings

## 2. Update Configuration

Update the configuration in `lib/core/config/supabase_config.dart`:

```dart
class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE';
  // ... rest of the configuration
}
```

## 3. Set up Database Tables

Create the following tables in your Supabase database:

### Users Table
```sql
CREATE TABLE users (
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
```

### Workouts Table
```sql
CREATE TABLE workouts (
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
```

### Nutrition Table
```sql
CREATE TABLE nutrition (
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
```

### Progress Table
```sql
CREATE TABLE progress (
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
```

### Chats Table
```sql
CREATE TABLE chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) NOT NULL,
  receiver_id UUID REFERENCES users(id) NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  file_path TEXT,
  is_read BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. Set up Row Level Security (RLS)

Enable RLS for all tables and create appropriate policies:

### Users Table Policies
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own record
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Workouts Table Policies
```sql
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their workouts
CREATE POLICY "Trainers can manage their workouts" ON workouts
  FOR ALL USING (auth.uid() = trainer_id);

-- Clients can view their assigned workouts
CREATE POLICY "Clients can view their workouts" ON workouts
  FOR SELECT USING (auth.uid() = client_id);
```

### Nutrition Table Policies
```sql
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;

-- Users can manage their own nutrition entries
CREATE POLICY "Users can manage own nutrition" ON nutrition
  FOR ALL USING (auth.uid() = user_id);

-- Trainers can view their clients' nutrition
CREATE POLICY "Trainers can view client nutrition" ON nutrition
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = nutrition.user_id 
      AND users.trainer_id = auth.uid()
    )
  );
```

### Progress Table Policies
```sql
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can manage own progress" ON progress
  FOR ALL USING (auth.uid() = user_id);

-- Trainers can view their clients' progress
CREATE POLICY "Trainers can view client progress" ON progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = progress.user_id 
      AND users.trainer_id = auth.uid()
    )
  );
```

### Chats Table Policies
```sql
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their messages" ON chats
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages" ON chats
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they sent
CREATE POLICY "Users can update own messages" ON chats
  FOR UPDATE USING (auth.uid() = sender_id);
```

## 5. Set up Storage Buckets

Create the following storage buckets:
- `profile_images`
- `workout_images`
- `nutrition_images`

Configure appropriate policies for each bucket based on your app's requirements.

## 6. Set up Real-time (Optional)

If you want real-time functionality, enable real-time for the tables you need:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
```

## 7. Test the Setup

Run your Flutter app and test:
1. User registration and login
2. Database operations
3. Real-time subscriptions (if enabled)

## Migration Checklist

- ✅ Supabase project created
- ✅ Configuration updated
- ✅ Database tables created
- ✅ Row Level Security configured
- ✅ Storage buckets created
- ✅ Real-time enabled (if needed)
- ✅ App tested

## Notes

- Remember to update your app's authentication flow if needed
- Consider implementing email verification
- Set up proper backup strategies
- Monitor your Supabase dashboard for usage and performance