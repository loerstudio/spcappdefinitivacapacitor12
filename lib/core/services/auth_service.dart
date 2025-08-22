import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user_model.dart';
import 'storage_service.dart';

class AuthService {
  static const String baseUrl = 'http://localhost:3000/api';
  
  Future<UserModel?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final user = UserModel.fromJson(data['user']);
          
          // Save tokens
          if (data['token'] != null) {
            await StorageService.saveToken(data['token']);
          }
          
          return user;
        } else {
          throw Exception(data['message'] ?? 'Login failed');
        }
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Login failed');
      }
    } catch (e) {
      // For demo purposes, return a mock user if API is not available
      if (e.toString().contains('Connection') || e.toString().contains('Failed host lookup')) {
        return _getMockUser(email);
      }
      rethrow;
    }
  }

  Future<UserModel?> register({
    required String email,
    required String password,
    required String name,
    String? surname,
    String? phone,
    required UserRole role,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'name': name,
          'surname': surname,
          'phone': phone,
          'role': role.name,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final user = UserModel.fromJson(data['user']);
          
          // Save tokens
          if (data['token'] != null) {
            await StorageService.saveToken(data['token']);
          }
          
          return user;
        } else {
          throw Exception(data['message'] ?? 'Registration failed');
        }
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Registration failed');
      }
    } catch (e) {
      // For demo purposes, return a mock user if API is not available
      if (e.toString().contains('Connection') || e.toString().contains('Failed host lookup')) {
        return _createMockUser(email, name, surname, role);
      }
      rethrow;
    }
  }

  Future<bool> logout() async {
    try {
      final token = StorageService.getToken();
      if (token != null) {
        await http.post(
          Uri.parse('$baseUrl/auth/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );
      }
      
      await StorageService.clearTokens();
      return true;
    } catch (e) {
      await StorageService.clearTokens();
      return true; // Always return true for logout
    }
  }

  Future<bool> verifyToken() async {
    try {
      final token = StorageService.getToken();
      if (token == null) return false;

      final response = await http.get(
        Uri.parse('$baseUrl/auth/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      return true; // For demo purposes, always return true
    }
  }

  Future<UserModel?> updateProfile({
    required String userId,
    String? name,
    String? surname,
    String? phone,
    String? bio,
    List<String>? specializations,
    double? weight,
    double? height,
    int? age,
    String? fitnessGoal,
  }) async {
    try {
      final token = StorageService.getToken();
      if (token == null) throw Exception('No auth token');

      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (surname != null) body['surname'] = surname;
      if (phone != null) body['phone'] = phone;
      if (bio != null) body['bio'] = bio;
      if (specializations != null) body['specializations'] = specializations;
      if (weight != null) body['weight'] = weight;
      if (height != null) body['height'] = height;
      if (age != null) body['age'] = age;
      if (fitnessGoal != null) body['fitness_goal'] = fitnessGoal;

      final response = await http.put(
        Uri.parse('$baseUrl/users/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserModel.fromJson(data['user']);
      } else {
        throw Exception('Update failed: ${response.statusCode}');
      }
    } catch (e) {
      // For demo purposes, return updated mock user
      final currentUser = await StorageService.getUser();
      if (currentUser != null) {
        return currentUser.copyWith(
          name: name ?? currentUser.name,
          surname: surname ?? currentUser.surname,
          phone: phone ?? currentUser.phone,
          bio: bio ?? currentUser.bio,
          specializations: specializations ?? currentUser.specializations,
          weight: weight ?? currentUser.weight,
          height: height ?? currentUser.height,
          age: age ?? currentUser.age,
          fitnessGoal: fitnessGoal ?? currentUser.fitnessGoal,
          updatedAt: DateTime.now(),
        );
      }
      return null;
    }
  }

  Future<bool> resetPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      return response.statusCode == 200;
    } catch (e) {
      return true; // For demo purposes, always return true
    }
  }

  // Mock data for demo purposes
  UserModel _getMockUser(String email) {
    final isTrainer = email.contains('trainer') || email.contains('coach');
    return UserModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      email: email,
      name: isTrainer ? 'Simone' : 'Mario',
      surname: isTrainer ? 'Pagno' : 'Rossi',
      role: isTrainer ? UserRole.trainer : UserRole.client,
      createdAt: DateTime.now(),
      bio: isTrainer ? 'Personal Trainer certificato con 10 anni di esperienza' : null,
      specializations: isTrainer ? ['Strength Training', 'Weight Loss', 'Bodybuilding'] : null,
      rating: isTrainer ? 4.8 : null,
      totalClients: isTrainer ? 15 : null,
      trainerId: isTrainer ? null : '1',
      weight: isTrainer ? null : 75.0,
      height: isTrainer ? null : 175.0,
      age: isTrainer ? null : 28,
      fitnessGoal: isTrainer ? null : 'Perdere peso',
    );
  }

  UserModel _createMockUser(String email, String name, String? surname, UserRole role) {
    return UserModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      email: email,
      name: name,
      surname: surname,
      role: role,
      createdAt: DateTime.now(),
      bio: role == UserRole.trainer ? 'Nuovo Personal Trainer' : null,
      specializations: role == UserRole.trainer ? ['General Fitness'] : null,
      rating: role == UserRole.trainer ? 5.0 : null,
      totalClients: role == UserRole.trainer ? 0 : null,
      trainerId: role == UserRole.client ? '1' : null,
      weight: role == UserRole.client ? 70.0 : null,
      height: role == UserRole.client ? 170.0 : null,
      age: role == UserRole.client ? 25 : null,
      fitnessGoal: role == UserRole.client ? 'Mantenersi in forma' : null,
    );
  }
}