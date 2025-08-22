import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ClientProgressScreen extends StatelessWidget {
  const ClientProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Progressi',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: const Center(
        child: Text(
          'Sistema Progressi\n(In sviluppo)',
          style: TextStyle(color: AppColors.lightGrey),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}