import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ClientWorkoutsScreen extends StatefulWidget {
  const ClientWorkoutsScreen({super.key});

  @override
  State<ClientWorkoutsScreen> createState() => _ClientWorkoutsScreenState();
}

class _ClientWorkoutsScreenState extends State<ClientWorkoutsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundGrey,
        title: Text(
          'Workout',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.primaryWhite,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryRed,
          labelColor: AppColors.primaryRed,
          unselectedLabelColor: AppColors.lightGrey,
          tabs: const [
            Tab(text: 'OGGI'),
            Tab(text: 'MESE'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTodayWorkout(),
          _buildMonthView(),
        ],
      ),
    );
  }

  Widget _buildTodayWorkout() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Current Workout Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primaryRed,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upper Body Power',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.primaryWhite,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Lunedì',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.primaryWhite.withOpacity(0.8),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryWhite.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '68 completati',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.primaryWhite,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Exercise List
          _buildExerciseItem(
            '1',
            'Chest Press con Manubri',
            '4 x 12 @ 25kg',
            '60s',
            true,
          ),
          _buildExerciseItem(
            '2',
            'Rematore con Manubrio',
            '4 x 12 @ 20kg',
            '60s',
            true,
          ),
          _buildExerciseItem(
            '3',
            'Alzate Laterali',
            '3 x 15 @ 8kg',
            '45s',
            false,
          ),
          _buildExerciseItem(
            '4',
            'Curl con Manubri',
            '3 x 12 @ 10kg',
            '45s',
            false,
          ),
          _buildExerciseItem(
            '5',
            'Overhead Tricep Extension',
            '3 x 12 @ 10kg',
            '45s',
            false,
          ),

          const SizedBox(height: 24),

          // Add Exercise Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                // TODO: Add exercise
              },
              icon: const Icon(Icons.add, color: AppColors.primaryRed),
              label: const Text(
                'Aggiungi Esercizio',
                style: TextStyle(color: AppColors.primaryRed),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.primaryRed),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthView() {
    return const Center(
      child: Text(
        'Vista Mensile\n(In sviluppo)',
        style: TextStyle(color: AppColors.lightGrey),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildExerciseItem(
    String number,
    String name,
    String sets,
    String rest,
    bool completed,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.darkGrey,
        borderRadius: BorderRadius.circular(12),
        border: completed
            ? Border.all(color: AppColors.successGreen, width: 1)
            : null,
      ),
      child: Row(
        children: [
          // Exercise Number
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: completed ? AppColors.successGreen : AppColors.primaryRed,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: completed
                  ? const Icon(
                      Icons.check,
                      color: AppColors.primaryWhite,
                      size: 18,
                    )
                  : Text(
                      number,
                      style: const TextStyle(
                        color: AppColors.primaryWhite,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),

          const SizedBox(width: 16),

          // Exercise Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.primaryWhite,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  sets,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.lightGrey,
                  ),
                ),
                Text(
                  rest,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.lightGrey,
                  ),
                ),
              ],
            ),
          ),

          // Action Button
          IconButton(
            onPressed: () {
              // TODO: Show exercise details or start timer
            },
            icon: Icon(
              completed ? Icons.visibility : Icons.play_arrow,
              color: completed ? AppColors.lightGrey : AppColors.primaryRed,
            ),
          ),
        ],
      ),
    );
  }
}