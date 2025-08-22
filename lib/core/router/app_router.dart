import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/trainer/screens/trainer_main_screen.dart';
import '../../features/client/screens/client_main_screen.dart';
import '../../features/common/screens/splash_screen.dart';

class AppRouter {
  static GoRouter getRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/',
      redirect: (context, state) {
        if (!authProvider.isInitialized) {
          return '/';
        }

        final isAuthenticated = authProvider.isAuthenticated;
        final isLoginPage = state.fullPath == '/login';
        final isRegisterPage = state.fullPath == '/register';
        final isAuthPage = isLoginPage || isRegisterPage;

        if (!isAuthenticated && !isAuthPage) {
          return '/login';
        }

        if (isAuthenticated && isAuthPage) {
          if (authProvider.isTrainer) {
            return '/trainer';
          } else {
            return '/client';
          }
        }

        if (isAuthenticated) {
          if (authProvider.isTrainer && !state.fullPath!.startsWith('/trainer')) {
            return '/trainer';
          }
          if (authProvider.isClient && !state.fullPath!.startsWith('/client')) {
            return '/client';
          }
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/',
          name: 'splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          name: 'login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          name: 'register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/trainer',
          name: 'trainer_main',
          builder: (context, state) => const TrainerMainScreen(),
          routes: [
            GoRoute(
              path: 'clients',
              name: 'trainer_clients',
              builder: (context, state) => const TrainerMainScreen(initialIndex: 0),
            ),
            GoRoute(
              path: 'workouts',
              name: 'trainer_workouts',
              builder: (context, state) => const TrainerMainScreen(initialIndex: 1),
            ),
            GoRoute(
              path: 'nutrition',
              name: 'trainer_nutrition',
              builder: (context, state) => const TrainerMainScreen(initialIndex: 2),
            ),
            GoRoute(
              path: 'chat',
              name: 'trainer_chat',
              builder: (context, state) => const TrainerMainScreen(initialIndex: 3),
            ),
            GoRoute(
              path: 'profile',
              name: 'trainer_profile',
              builder: (context, state) => const TrainerMainScreen(initialIndex: 4),
            ),
          ],
        ),
        GoRoute(
          path: '/client',
          name: 'client_main',
          builder: (context, state) => const ClientMainScreen(),
          routes: [
            GoRoute(
              path: 'dashboard',
              name: 'client_dashboard',
              builder: (context, state) => const ClientMainScreen(initialIndex: 0),
            ),
            GoRoute(
              path: 'workouts',
              name: 'client_workouts',
              builder: (context, state) => const ClientMainScreen(initialIndex: 1),
            ),
            GoRoute(
              path: 'nutrition',
              name: 'client_nutrition',
              builder: (context, state) => const ClientMainScreen(initialIndex: 2),
            ),
            GoRoute(
              path: 'progress',
              name: 'client_progress',
              builder: (context, state) => const ClientMainScreen(initialIndex: 3),
            ),
            GoRoute(
              path: 'chat',
              name: 'client_chat',
              builder: (context, state) => const ClientMainScreen(initialIndex: 4),
            ),
          ],
        ),
      ],
    );
  }
}