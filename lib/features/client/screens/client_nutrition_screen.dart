import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ClientNutritionScreen extends StatelessWidget {
  const ClientNutritionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Alimentazione',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: const Center(
        child: Text(
          'Sistema Alimentazione\n(In sviluppo)',
          style: TextStyle(color: AppColors.lightGrey),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}