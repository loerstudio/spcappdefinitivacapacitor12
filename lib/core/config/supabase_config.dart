class SupabaseConfig {
  static const String supabaseUrl = 'https://qfpmckovlzfxgnqeibde.supabase.co';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcG1ja292bHpmeGducWVpYmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDA2NDgsImV4cCI6MjA3MTE3NjY0OH0.flXM7thLPwKCmZzhOL92q2r2Oe84UgiHm0JGCIvSm00';
  static const String supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcG1ja292bHpmeGducWVpYmRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwMDY0OCwiZXhwIjoyMDcxMTc2NjQ4fQ.YC0Yj0l6wmwbKQ5VMxvBVN2HxEicXsd7Q2lZ4SLTl1Q';
  static const String projectName = 'spc-app-database';
  
  // Table names (to be created in Supabase)
  static const String usersTable = 'users';
  static const String workoutsTable = 'workouts';
  static const String nutritionTable = 'nutrition';
  static const String progressTable = 'progress';
  static const String chatsTable = 'chats';
  
  // Storage bucket names (to be created in Supabase)
  static const String profileImagesBucket = 'profile_images';
  static const String workoutImagesBucket = 'workout_images';
  static const String nutritionImagesBucket = 'nutrition_images';
}