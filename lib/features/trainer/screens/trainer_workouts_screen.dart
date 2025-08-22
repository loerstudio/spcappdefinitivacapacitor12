import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class TrainerWorkoutsScreen extends StatelessWidget {
  const TrainerWorkoutsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Allenamenti',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primaryRed),
            onPressed: () {
              // TODO: Add new workout program
            },
          ),
        ],
      ),
      body: const Center(
        child: Text(
          'Gestione Programmi Allenamento\n(In sviluppo)',
          style: TextStyle(color: AppColors.lightGrey),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}