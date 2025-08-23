import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';
import '../services/supabase_service.dart';
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
  bool get isTrainer => _currentUser?.role == UserRole.trainer;
  bool get isClient => _currentUser?.role == UserRole.client;

  final SupabaseService _supabaseService = SupabaseService();

  AuthProvider() {
    _initialize();
  }

  Future<void> _initialize() async {
    _setLoading(true);
    try {
      // Initialize Supabase
      await SupabaseService.initialize();

      // Check if there's a current user
      final user = _supabaseService.currentUser;
      if (user != null) {
        await _loadUserFromSupabase(user);
      }

      // Listen to auth state changes
      _supabaseService.authStateChanges.listen((AuthState data) {
        if (data.event == AuthChangeEvent.signedIn && data.session?.user != null) {
          _loadUserFromSupabase(data.session!.user);
        } else if (data.event == AuthChangeEvent.signedOut) {
          _currentUser = null;
          notifyListeners();
        }
      });

      _isInitialized = true;
    } catch (e) {
      _setError('Failed to initialize authentication: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> _loadUserFromSupabase(User user) async {
    try {
      // Create user model from Supabase user
      final userName = user.userMetadata?['name'] ?? user.email ?? '';
      final nameParts = userName.split(' ');
      
      _currentUser = UserModel(
        id: user.id,
        email: user.email ?? '',
        name: nameParts.first,
        surname: nameParts.skip(1).join(' '),
        role: UserRole.client, // Default
        createdAt: DateTime.parse(user.createdAt),
        isActive: true,
        profileImageUrl: null, // Will be loaded separately if needed
      );
      
      notifyListeners();
    } catch (e) {
      _setError('Failed to load user data: $e');
    }
  }

  // Alias for login method
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    return await signInWithEmailAndPassword(email: email, password: password);
  }

  Future<bool> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _supabaseService.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = response.user;
      if (user != null) {
        await _loadUserFromSupabase(user);
        await StorageService.setString('user_email', email);
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Alias for register method
  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required bool isTrainer,
  }) async {
    return await signUpWithEmailAndPassword(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      isTrainer: isTrainer,
    );
  }

  Future<bool> signUpWithEmailAndPassword({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required bool isTrainer,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _supabaseService.createUserWithEmailAndPassword(
        email: email,
        password: password,
        name: '$firstName $lastName',
      );

      final currentUser = response.user;
      if (currentUser != null) {
        await _loadUserFromSupabase(currentUser);
        await StorageService.setString('user_email', email);
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // OAuth sign-in helpers
  Future<bool> signInWithGoogle() async {
    _setLoading(true);
    _clearError();
    try {
      await _supabaseService.signInWithGoogle();
      // Flow continues via deep link and auth state listener
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> signInWithGithub() async {
    _setLoading(true);
    _clearError();
    try {
      await _supabaseService.signInWithGithub();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Alias for logout method
  Future<void> logout() async {
    return await signOut();
  }

  Future<void> signOut() async {
    _setLoading(true);
    try {
      await _supabaseService.signOut();
      _currentUser = null;
      await StorageService.remove('user_email');
      notifyListeners();
    } catch (e) {
      _setError('Failed to sign out: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> sendPasswordResetEmail(String email) async {
    _setLoading(true);
    _clearError();

    try {
      await _supabaseService.sendPasswordResetEmail(email);
      return true;
    } catch (e) {
      _setError(e.toString());
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
}