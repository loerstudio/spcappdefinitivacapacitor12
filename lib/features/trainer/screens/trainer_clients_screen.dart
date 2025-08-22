import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/user_provider.dart';
import '../widgets/add_client_dialog.dart';
import '../widgets/client_card.dart';

class TrainerClientsScreen extends StatefulWidget {
  const TrainerClientsScreen({super.key});

  @override
  State<TrainerClientsScreen> createState() => _TrainerClientsScreenState();
}

class _TrainerClientsScreenState extends State<TrainerClientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadClients();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadClients() {
    final authProvider = context.read<AuthProvider>();
    final userProvider = context.read<UserProvider>();
    
    if (authProvider.currentUser != null) {
      userProvider.loadClients(authProvider.currentUser!.id);
    }
  }

  void _showAddClientDialog() {
    showDialog(
      context: context,
      builder: (context) => const AddClientDialog(),
    ).then((result) {
      if (result == true) {
        _loadClients();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final userProvider = context.watch<UserProvider>();
    
    final filteredClients = userProvider.searchClients(_searchQuery);

    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Buongiorno',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.lightGrey,
              ),
            ),
            Text(
              authProvider.currentUser?.name ?? 'Trainer',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppColors.primaryWhite,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: AppColors.lightGrey),
            onPressed: () {
              // TODO: Implement notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: AppColors.lightGrey),
            onPressed: () {
              // TODO: Implement settings
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats Cards
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primaryRed,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryRed.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Panoramica',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.primaryWhite,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        context,
                        'Clienti Attivi',
                        '${userProvider.clients.length}',
                        Icons.people,
                      ),
                    ),
                    Expanded(
                      child: _buildStatItem(
                        context,
                        'Allenamenti',
                        '${userProvider.clients.length * 3}',
                        Icons.fitness_center,
                      ),
                    ),
                    Expanded(
                      child: _buildStatItem(
                        context,
                        'Messaggi',
                        '12',
                        Icons.chat,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Search and Add Client
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(color: AppColors.primaryWhite),
                    decoration: InputDecoration(
                      hintText: 'Cerca clienti...',
                      hintStyle: const TextStyle(color: AppColors.lightGrey),
                      prefixIcon: const Icon(Icons.search, color: AppColors.lightGrey),
                      fillColor: AppColors.darkGrey,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.primaryRed,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.add, color: AppColors.primaryWhite),
                    onPressed: _showAddClientDialog,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Clients List
          Expanded(
            child: userProvider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryRed),
                    ),
                  )
                : filteredClients.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _searchQuery.isEmpty ? Icons.people_outline : Icons.search_off,
                              size: 64,
                              color: AppColors.lightGrey,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isEmpty 
                                  ? 'Nessun cliente ancora'
                                  : 'Nessun risultato trovato',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppColors.lightGrey,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _searchQuery.isEmpty
                                  ? 'Aggiungi il tuo primo cliente'
                                  : 'Prova con un altro termine',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.lightGrey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: filteredClients.length,
                        itemBuilder: (context, index) {
                          return ClientCard(
                            client: filteredClients[index],
                            onTap: () {
                              // TODO: Navigate to client detail
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(
          icon,
          color: AppColors.primaryWhite,
          size: 24,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppColors.primaryWhite.withOpacity(0.8),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}