import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'trainer_clients_screen.dart';
import 'trainer_workouts_screen.dart';
import 'trainer_nutrition_screen.dart';
import 'trainer_chat_screen.dart';
import 'trainer_profile_screen.dart';

class TrainerMainScreen extends StatefulWidget {
  final int initialIndex;
  
  const TrainerMainScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<TrainerMainScreen> createState() => _TrainerMainScreenState();
}

class _TrainerMainScreenState extends State<TrainerMainScreen> {
  late int _currentIndex;
  
  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  final List<Widget> _screens = [
    const TrainerClientsScreen(),
    const TrainerWorkoutsScreen(),
    const TrainerNutritionScreen(),
    const TrainerChatScreen(),
    const TrainerProfileScreen(),
  ];

  final List<BottomNavigationBarItem> _navItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.people),
      label: 'Clienti',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.fitness_center),
      label: 'Allenamenti',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.restaurant),
      label: 'Nutrizione',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.chat),
      label: 'Chat',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.person),
      label: 'Profilo',
    ),
  ];

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundGrey,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.darkGrey,
          border: Border(
            top: BorderSide(color: AppColors.lightGrey, width: 0.5),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.darkGrey,
          selectedItemColor: AppColors.primaryRed,
          unselectedItemColor: AppColors.lightGrey,
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.normal,
            fontSize: 12,
          ),
          items: _navItems,
        ),
      ),
    );
  }
}