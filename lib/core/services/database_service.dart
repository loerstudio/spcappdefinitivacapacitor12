import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/user_model.dart';
import 'supabase_service.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  final SupabaseService _supabaseService = SupabaseService();

  SupabaseClient get _client => _supabaseService.client;

  // User operations
  Future<Map<String, dynamic>> createUserDocument({
    required String userId,
    required String email,
    required String name,
    required String surname,
    required UserRole role,
    String? phone,
    String? profileImageUrl,
    String? bio,
    List<String>? specializations,
    double? rating,
    int? totalClients,
    String? trainerId,
    double? weight,
    double? height,
    int? age,
    String? fitnessGoal,
    DateTime? goalStartDate,
    DateTime? goalEndDate,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.usersTable)
          .insert({
            'id': userId,
            'email': email,
            'name': name,
            'surname': surname,
            'phone': phone,
            'role': role.toString().split('.').last,
            'profile_image_url': profileImageUrl,
            'is_active': true,
            'bio': bio,
            'specializations': specializations,
            'rating': rating,
            'total_clients': totalClients,
            'trainer_id': trainerId,
            'weight': weight,
            'height': height,
            'age': age,
            'fitness_goal': fitnessGoal,
            'goal_start_date': goalStartDate?.toIso8601String(),
            'goal_end_date': goalEndDate?.toIso8601String(),
            'created_at': DateTime.now().toIso8601String(),
          })
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to create user document: $e');
    }
  }

  Future<Map<String, dynamic>> getUserDocument(String userId) async {
    try {
      final response = await _client
          .from(SupabaseConfig.usersTable)
          .select()
          .eq('id', userId)
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to get user document: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getUserByEmail(String email) async {
    try {
      final response = await _client
          .from(SupabaseConfig.usersTable)
          .select()
          .eq('email', email)
          .limit(1);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get user by email: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getAllUsers() async {
    try {
      final response = await _client
          .from(SupabaseConfig.usersTable)
          .select();
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get all users: $e');
    }
  }

  Future<Map<String, dynamic>> updateUserDocument({
    required String userId,
    required Map<String, dynamic> data,
  }) async {
    try {
      data['updated_at'] = DateTime.now().toIso8601String();
      final response = await _client
          .from(SupabaseConfig.usersTable)
          .update(data)
          .eq('id', userId)
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to update user document: $e');
    }
  }

  UserModel userFromDocument(Map<String, dynamic> data) {
    return UserModel(
      id: data['id'] ?? '',
      email: data['email'] ?? '',
      name: data['name'] ?? '',
      surname: data['surname'],
      phone: data['phone'],
      role: UserRole.values.firstWhere(
        (e) => e.toString().split('.').last == data['role'],
        orElse: () => UserRole.client,
      ),
      profileImageUrl: data['profile_image_url'],
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: data['updated_at'] != null ? DateTime.parse(data['updated_at']) : null,
      isActive: data['is_active'] ?? true,
      bio: data['bio'],
      specializations: data['specializations'] != null ? List<String>.from(data['specializations']) : null,
      rating: data['rating']?.toDouble(),
      totalClients: data['total_clients'],
      trainerId: data['trainer_id'],
      weight: data['weight']?.toDouble(),
      height: data['height']?.toDouble(),
      age: data['age'],
      fitnessGoal: data['fitness_goal'],
      goalStartDate: data['goal_start_date'] != null ? DateTime.parse(data['goal_start_date']) : null,
      goalEndDate: data['goal_end_date'] != null ? DateTime.parse(data['goal_end_date']) : null,
    );
  }

  // Workout operations
  Future<Map<String, dynamic>> createWorkout({
    required String trainerId,
    required String clientId,
    required String name,
    required String description,
    int? duration,
    String? difficulty,
    required List<Map<String, dynamic>> exercises,
    DateTime? scheduledDate,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.workoutsTable)
          .insert({
            'trainer_id': trainerId,
            'client_id': clientId,
            'name': name,
            'description': description,
            'duration': duration,
            'difficulty': difficulty,
            'exercises': exercises,
            'scheduled_date': scheduledDate?.toIso8601String(),
            'status': 'pending',
            'created_at': DateTime.now().toIso8601String(),
          })
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to create workout: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getWorkouts({
    String? trainerId,
    String? clientId,
    int limit = 25,
    int offset = 0,
  }) async {
    try {
      var query = _client
          .from(SupabaseConfig.workoutsTable)
          .select();
      
      if (trainerId != null) {
        query = query.eq('trainer_id', trainerId);
      }
      if (clientId != null) {
        query = query.eq('client_id', clientId);
      }
      
      final response = await query
          .order('created_at', ascending: false)
          .limit(limit)
          .range(offset, offset + limit - 1);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get workouts: $e');
    }
  }

  // Nutrition operations
  Future<Map<String, dynamic>> createNutritionEntry({
    required String userId,
    String? trainerId,
    required String date,
    required String mealType,
    required String foodName,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    double? quantity,
    String? unit,
    String? notes,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.nutritionTable)
          .insert({
            'user_id': userId,
            'trainer_id': trainerId,
            'date': date,
            'meal_type': mealType,
            'food_name': foodName,
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fat': fat,
            'quantity': quantity,
            'unit': unit,
            'notes': notes,
            'created_at': DateTime.now().toIso8601String(),
          })
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to create nutrition entry: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getNutritionEntries({
    required String userId,
    String? date,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      var query = _client
          .from(SupabaseConfig.nutritionTable)
          .select()
          .eq('user_id', userId);
      
      if (date != null) {
        query = query.eq('date', date);
      }
      
      final response = await query
          .order('date', ascending: date == null ? false : true)
          .order('created_at', ascending: true)
          .limit(limit)
          .range(offset, offset + limit - 1);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get nutrition entries: $e');
    }
  }

  // Progress operations
  Future<Map<String, dynamic>> createProgressEntry({
    required String userId,
    required String date,
    double? weight,
    double? bodyFat,
    double? muscleMass,
    String? notes,
    List<String>? photos,
    Map<String, double>? measurements,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.progressTable)
          .insert({
            'user_id': userId,
            'date': date,
            'weight': weight,
            'body_fat': bodyFat,
            'muscle_mass': muscleMass,
            'notes': notes,
            'photos': photos,
            'measurements': measurements,
            'created_at': DateTime.now().toIso8601String(),
          })
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to create progress entry: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getProgressEntries({
    required String userId,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.progressTable)
          .select()
          .eq('user_id', userId)
          .order('date', ascending: false)
          .limit(limit)
          .range(offset, offset + limit - 1);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get progress entries: $e');
    }
  }

  // Chat operations
  Future<Map<String, dynamic>> createChatMessage({
    required String senderId,
    required String receiverId,
    required String message,
    String? messageType,
    String? filePath,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.chatsTable)
          .insert({
            'sender_id': senderId,
            'receiver_id': receiverId,
            'message': message,
            'message_type': messageType ?? 'text',
            'file_path': filePath,
            'is_read': false,
            'timestamp': DateTime.now().toIso8601String(),
          })
          .select()
          .single();
      
      return response;
    } catch (e) {
      throw Exception('Failed to create chat message: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getChatMessages({
    required String userId1,
    required String userId2,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await _client
          .from(SupabaseConfig.chatsTable)
          .select()
          .or('and(sender_id.eq.$userId1,receiver_id.eq.$userId2),and(sender_id.eq.$userId2,receiver_id.eq.$userId1)')
          .order('timestamp', ascending: true)
          .limit(limit)
          .range(offset, offset + limit - 1);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get chat messages: $e');
    }
  }

  // Real-time subscriptions
  Stream<List<Map<String, dynamic>>> subscribeToWorkouts(String clientId) {
    return _client
        .from(SupabaseConfig.workoutsTable)
        .stream(primaryKey: ['id'])
        .eq('client_id', clientId);
  }

  Stream<List<Map<String, dynamic>>> subscribeToChats(String userId) {
    return _client
        .from(SupabaseConfig.chatsTable)
        .stream(primaryKey: ['id']);
  }
}