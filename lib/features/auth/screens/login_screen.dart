import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final authProvider = context.read<AuthProvider>();
      
      final success = await authProvider.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (success && mounted) {
        // Navigation handled by router redirect
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Errore durante il login'),
            backgroundColor: AppColors.errorRed,
          ),
        );
      }
    }
  }

  Future<void> _handleGoogle() async {
    final authProvider = context.read<AuthProvider>();
    final ok = await authProvider.signInWithGoogle();
    if (!ok && mounted && authProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage!),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  Future<void> _handleGithub() async {
    final authProvider = context.read<AuthProvider>();
    final ok = await authProvider.signInWithGithub();
    if (!ok && mounted && authProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage!),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo and Title
                Column(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: const BoxDecoration(
                        color: AppColors.primaryRed,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.fitness_center,
                        size: 50,
                        color: AppColors.primaryWhite,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'SIMOPAGNO',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: AppColors.primaryWhite,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      'COACHING',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.primaryRed,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 48),
                
                // Email Field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: AppColors.primaryWhite),
                  decoration: InputDecoration(
                    labelText: 'Email',
                    labelStyle: const TextStyle(color: AppColors.lightGrey),
                    prefixIcon: const Icon(Icons.email, color: AppColors.lightGrey),
                    fillColor: AppColors.darkGrey,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.lightGrey),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.lightGrey),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primaryRed, width: 2),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Inserisci email';
                    }
                    if (!value.contains('@')) {
                      return 'Inserisci email valida';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 16),
                
                // Password Field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  style: const TextStyle(color: AppColors.primaryWhite),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: const TextStyle(color: AppColors.lightGrey),
                    prefixIcon: const Icon(Icons.lock, color: AppColors.lightGrey),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility : Icons.visibility_off,
                        color: AppColors.lightGrey,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                    fillColor: AppColors.darkGrey,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.lightGrey),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.lightGrey),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primaryRed, width: 2),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Inserisci password';
                    }
                    if (value.length < 6) {
                      return 'Password deve essere almeno 6 caratteri';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 24),
                
                // Login Button
                Consumer<AuthProvider>(
                  builder: (context, authProvider, child) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: 56,
                          child: ElevatedButton(
                            onPressed: authProvider.isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryRed,
                              foregroundColor: AppColors.primaryWhite,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: authProvider.isLoading
                                ? const CircularProgressIndicator(
                                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryWhite),
                                  )
                                : Text(
                                    'ACCEDI',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: AppColors.primaryWhite,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 1,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: authProvider.isLoading ? null : _handleGoogle,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primaryWhite,
                                  side: const BorderSide(color: AppColors.lightGrey),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(Icons.g_mobiledata, color: AppColors.primaryWhite, size: 28),
                                label: const Text('Google'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: authProvider.isLoading ? null : _handleGithub,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primaryWhite,
                                  side: const BorderSide(color: AppColors.lightGrey),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(Icons.code, color: AppColors.primaryWhite, size: 22),
                                label: const Text('GitHub'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
                
                const SizedBox(height: 16),
                
                // Register Link
                TextButton(
                  onPressed: () => context.go('/register'),
                  child: RichText(
                    text: TextSpan(
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.lightGrey,
                      ),
                      children: const [
                        TextSpan(text: 'Non hai un account? '),
                        TextSpan(
                          text: 'Registrati',
                          style: TextStyle(
                            color: AppColors.primaryRed,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Demo Instructions
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.darkGrey,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primaryRed, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Demo Login:',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppColors.primaryRed,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Trainer: trainer@demo.com / password',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.primaryWhite,
                        ),
                      ),
                      Text(
                        'Cliente: client@demo.com / password',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.primaryWhite,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}