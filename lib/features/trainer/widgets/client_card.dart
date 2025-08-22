import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/user_model.dart';
import 'package:intl/intl.dart';

class ClientCard extends StatelessWidget {
  final UserModel client;
  final VoidCallback onTap;

  const ClientCard({
    super.key,
    required this.client,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.darkGrey,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.primaryRed,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primaryRed, width: 2),
                  ),
                  child: client.profileImageUrl != null
                      ? ClipOval(
                          child: Image.network(
                            client.profileImageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return _buildAvatarFallback();
                            },
                          ),
                        )
                      : _buildAvatarFallback(),
                ),
                
                const SizedBox(width: 16),
                
                // Client Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        client.fullName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.primaryWhite,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        client.email,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.lightGrey,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (client.fitnessGoal != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryRed.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.primaryRed, width: 1),
                              ),
                              child: Text(
                                client.fitnessGoal!,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.primaryRed,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          Expanded(
                            child: Text(
                              'Da ${_formatDate(client.createdAt)}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.lightGrey,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Status and Actions
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: client.isActive ? AppColors.successGreen : AppColors.lightGrey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(height: 8),
                    PopupMenuButton<String>(
                      icon: const Icon(
                        Icons.more_vert,
                        color: AppColors.lightGrey,
                        size: 20,
                      ),
                      color: AppColors.mediumGrey,
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'view',
                          child: Row(
                            children: [
                              Icon(Icons.visibility, color: AppColors.primaryWhite, size: 20),
                              SizedBox(width: 8),
                              Text('Visualizza', style: TextStyle(color: AppColors.primaryWhite)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, color: AppColors.primaryWhite, size: 20),
                              SizedBox(width: 8),
                              Text('Modifica', style: TextStyle(color: AppColors.primaryWhite)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'chat',
                          child: Row(
                            children: [
                              Icon(Icons.chat, color: AppColors.primaryWhite, size: 20),
                              SizedBox(width: 8),
                              Text('Chat', style: TextStyle(color: AppColors.primaryWhite)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, color: AppColors.errorRed, size: 20),
                              SizedBox(width: 8),
                              Text('Elimina', style: TextStyle(color: AppColors.errorRed)),
                            ],
                          ),
                        ),
                      ],
                      onSelected: (value) {
                        switch (value) {
                          case 'view':
                            // TODO: Navigate to client detail
                            break;
                          case 'edit':
                            // TODO: Show edit dialog
                            break;
                          case 'chat':
                            // TODO: Navigate to chat
                            break;
                          case 'delete':
                            _showDeleteConfirmation(context);
                            break;
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarFallback() {
    return Center(
      child: Text(
        client.name.isNotEmpty ? client.name[0].toUpperCase() : '?',
        style: const TextStyle(
          color: AppColors.primaryWhite,
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays < 1) {
      return 'oggi';
    } else if (difference.inDays == 1) {
      return 'ieri';
    } else if (difference.inDays < 30) {
      return '${difference.inDays} giorni';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '$months ${months == 1 ? 'mese' : 'mesi'}';
    } else {
      return DateFormat('dd/MM/yyyy').format(date);
    }
  }

  void _showDeleteConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.darkGrey,
        title: const Text(
          'Elimina Cliente',
          style: TextStyle(color: AppColors.primaryWhite),
        ),
        content: Text(
          'Sei sicuro di voler eliminare ${client.fullName}? Questa azione non può essere annullata.',
          style: const TextStyle(color: AppColors.lightGrey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Annulla',
              style: TextStyle(color: AppColors.lightGrey),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: Implement delete functionality
            },
            child: const Text(
              'Elimina',
              style: TextStyle(color: AppColors.errorRed),
            ),
          ),
        ],
      ),
    );
  }
}