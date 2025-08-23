import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  SupabaseClient get client => Supabase.instance.client;
  GoTrueClient get auth => client.auth;
  SupabaseStorageClient get storage => client.storage;
  
  User? get currentUser => auth.currentUser;

  // Initialize Supabase
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: SupabaseConfig.supabaseUrl,
      anonKey: SupabaseConfig.supabaseAnonKey,
    );
  }

  // Check if user is signed in
  bool get isSignedIn => currentUser != null;

  // Sign in with email and password
  Future<AuthResponse> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final response = await auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      if (response.user == null) {
        throw Exception('Sign in failed: No user returned');
      }
      
      return response;
    } on AuthException catch (e) {
      throw Exception(_handleAuthException(e));
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  // Create user with email and password
  Future<AuthResponse> createUserWithEmailAndPassword({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final response = await auth.signUp(
        email: email,
        password: password,
        data: {'name': name},
      );
      
      if (response.user == null) {
        throw Exception('Sign up failed: No user returned');
      }
      
      return response;
    } on AuthException catch (e) {
      throw Exception(_handleAuthException(e));
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await auth.signOut();
    } on AuthException catch (e) {
      throw Exception(_handleAuthException(e));
    } catch (e) {
      throw Exception('Failed to sign out: $e');
    }
  }

  // Send password recovery email
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await auth.resetPasswordForEmail(email);
    } on AuthException catch (e) {
      throw Exception(_handleAuthException(e));
    } catch (e) {
      throw Exception('Failed to send password reset email: $e');
    }
  }

  // Get current user info
  User? getUser() {
    return currentUser;
  }

  // Handle Supabase Auth exceptions
  String _handleAuthException(AuthException e) {
    switch (e.statusCode) {
      case '400':
        if (e.message.contains('Invalid login credentials')) {
          return 'Invalid email or password.';
        } else if (e.message.contains('Email not confirmed')) {
          return 'Please check your email and confirm your account.';
        } else if (e.message.contains('User already registered')) {
          return 'An account with this email already exists.';
        }
        return 'Invalid request: ${e.message}';
      case '422':
        if (e.message.contains('Password should be at least')) {
          return 'Password should be at least 6 characters.';
        } else if (e.message.contains('Unable to validate email address')) {
          return 'Please enter a valid email address.';
        }
        return 'Validation error: ${e.message}';
      case '429':
        return 'Too many requests. Please try again later.';
      case '500':
        return 'Server error. Please try again later.';
      default:
        return 'Authentication failed: ${e.message}';
    }
  }

  // Test Supabase connection
  static Future<bool> testConnection() async {
    try {
      final client = Supabase.instance.client;
      
      // Try to make a simple request to test connection
      await client.from('users').select('count').limit(1);
      
      print('Supabase connection successful.');
      return true;
    } catch (e) {
      print('Supabase connection failed: $e');
      return false;
    }
  }

  // Listen to auth state changes
  Stream<AuthState> get authStateChanges => auth.onAuthStateChange;
}