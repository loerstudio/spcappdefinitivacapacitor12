import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isInitialized = false;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;
  bool get isInitialized => _isInitialized;
  bool get isTrainer => _currentUser?.isTrainer ?? false;
  bool get isClient => _currentUser?.isClient ?? false;

  final AuthService _authService = AuthService();

  AuthProvider() {
    _initialize();
  }

  Future<void> _initialize() async {
    _setLoading(true);
    try {
      final savedUser = await StorageService.getUser();
      if (savedUser != null) {
        _currentUser = savedUser;
        // Verify token is still valid
        final isValid = await _authService.verifyToken();
        if (!isValid) {
          await logout();
        }
      }
    } catch (e) {
      debugPrint('Error initializing auth: $e');
    } finally {
      _isInitialized = true;
      _setLoading(false);
    }
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final user = await _authService.login(email, password);
      if (user != null) {
        _currentUser = user;
        await StorageService.saveUser(user);
        notifyListeners();
        return true;
      } else {
        _setError('Credenziali non valide');
        return false;
      }
    } catch (e) {
      _setError('Errore durante il login: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
    String? surname,
    String? phone,
    required UserRole role,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final user = await _authService.register(
        email: email,
        password: password,
        name: name,
        surname: surname,
        phone: phone,
        role: role,
      );
      
      if (user != null) {
        _currentUser = user;
        await StorageService.saveUser(user);
        notifyListeners();
        return true;
      } else {
        _setError('Errore durante la registrazione');
        return false;
      }
    } catch (e) {
      _setError('Errore durante la registrazione: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      await _authService.logout();
      await StorageService.clearUser();
      _currentUser = null;
      notifyListeners();
    } catch (e) {
      debugPrint('Error during logout: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> updateProfile({
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
    if (_currentUser == null) return false;

    _setLoading(true);
    _clearError();

    try {
      final updatedUser = await _authService.updateProfile(
        userId: _currentUser!.id,
        name: name,
        surname: surname,
        phone: phone,
        bio: bio,
        specializations: specializations,
        weight: weight,
        height: height,
        age: age,
        fitnessGoal: fitnessGoal,
      );

      if (updatedUser != null) {
        _currentUser = updatedUser;
        await StorageService.saveUser(updatedUser);
        notifyListeners();
        return true;
      } else {
        _setError('Errore durante l\'aggiornamento del profilo');
        return false;
      }
    } catch (e) {
      _setError('Errore durante l\'aggiornamento: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resetPassword(String email) async {
    _setLoading(true);
    _clearError();

    try {
      final success = await _authService.resetPassword(email);
      if (!success) {
        _setError('Errore durante il reset della password');
      }
      return success;
    } catch (e) {
      _setError('Errore durante il reset: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}