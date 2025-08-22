import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'client_dashboard_screen.dart';
import 'client_workouts_screen.dart';
import 'client_nutrition_screen.dart';
import 'client_progress_screen.dart';
import 'client_chat_screen.dart';

class ClientMainScreen extends StatefulWidget {
  final int initialIndex;
  
  const ClientMainScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<ClientMainScreen> createState() => _ClientMainScreenState();
}

class _ClientMainScreenState extends State<ClientMainScreen> {
  late int _currentIndex;
  
  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  final List<Widget> _screens = [
    const ClientDashboardScreen(),
    const ClientWorkoutsScreen(),
    const ClientNutritionScreen(),
    const ClientProgressScreen(),
    const ClientChatScreen(),
  ];

  final List<BottomNavigationBarItem> _navItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.fitness_center),
      label: 'Allenamenti',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.restaurant),
      label: 'Alimentazione',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.trending_up),
      label: 'Progressi',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.chat),
      label: 'Chat',
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