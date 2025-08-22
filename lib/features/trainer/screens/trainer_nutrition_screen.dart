import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class TrainerNutritionScreen extends StatelessWidget {
  const TrainerNutritionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Piani Nutrizionali',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primaryRed),
            onPressed: () {
              // TODO: Add new nutrition plan
            },
          ),
        ],
      ),
      body: const Center(
        child: Text(
          'Gestione Piani Nutrizionali\n(In sviluppo)',
          style: TextStyle(color: AppColors.lightGrey),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}