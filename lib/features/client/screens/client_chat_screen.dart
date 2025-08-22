import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ClientChatScreen extends StatelessWidget {
  const ClientChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Chat',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: const Center(
        child: Text(
          'Sistema Chat\n(In sviluppo)',
          style: TextStyle(color: AppColors.lightGrey),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}