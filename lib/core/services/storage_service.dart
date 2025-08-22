import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class StorageService {
  static SharedPreferences? _prefs;
  
  static const String _userKey = 'current_user';
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('StorageService not initialized. Call StorageService.init() first.');
    }
    return _prefs!;
  }

  // User Management
  static Future<bool> saveUser(UserModel user) async {
    try {
      final userJson = jsonEncode(user.toJson());
      return await prefs.setString(_userKey, userJson);
    } catch (e) {
      return false;
    }
  }

  static Future<UserModel?> getUser() async {
    try {
      final userJson = prefs.getString(_userKey);
      if (userJson != null) {
        final userMap = jsonDecode(userJson) as Map<String, dynamic>;
        return UserModel.fromJson(userMap);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<bool> clearUser() async {
    try {
      return await prefs.remove(_userKey);
    } catch (e) {
      return false;
    }
  }

  // Token Management
  static Future<bool> saveToken(String token) async {
    try {
      return await prefs.setString(_tokenKey, token);
    } catch (e) {
      return false;
    }
  }

  static String? getToken() {
    try {
      return prefs.getString(_tokenKey);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> saveRefreshToken(String refreshToken) async {
    try {
      return await prefs.setString(_refreshTokenKey, refreshToken);
    } catch (e) {
      return false;
    }
  }

  static String? getRefreshToken() {
    try {
      return prefs.getString(_refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> clearTokens() async {
    try {
      await prefs.remove(_tokenKey);
      await prefs.remove(_refreshTokenKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Generic Storage Methods
  static Future<bool> setString(String key, String value) async {
    try {
      return await prefs.setString(key, value);
    } catch (e) {
      return false;
    }
  }

  static String? getString(String key) {
    try {
      return prefs.getString(key);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> setBool(String key, bool value) async {
    try {
      return await prefs.setBool(key, value);
    } catch (e) {
      return false;
    }
  }

  static bool? getBool(String key) {
    try {
      return prefs.getBool(key);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> setInt(String key, int value) async {
    try {
      return await prefs.setInt(key, value);
    } catch (e) {
      return false;
    }
  }

  static int? getInt(String key) {
    try {
      return prefs.getInt(key);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> setDouble(String key, double value) async {
    try {
      return await prefs.setDouble(key, value);
    } catch (e) {
      return false;
    }
  }

  static double? getDouble(String key) {
    try {
      return prefs.getDouble(key);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> remove(String key) async {
    try {
      return await prefs.remove(key);
    } catch (e) {
      return false;
    }
  }

  static Future<bool> clear() async {
    try {
      return await prefs.clear();
    } catch (e) {
      return false;
    }
  }

  static bool containsKey(String key) {
    try {
      return prefs.containsKey(key);
    } catch (e) {
      return false;
    }
  }

  static Set<String> getKeys() {
    try {
      return prefs.getKeys();
    } catch (e) {
      return <String>{};
    }
  }
}