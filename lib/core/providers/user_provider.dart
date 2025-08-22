import 'package:flutter/foundation.dart';
import '../models/user_model.dart';

class UserProvider extends ChangeNotifier {
  List<UserModel> _clients = [];
  List<UserModel> _trainers = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<UserModel> get clients => _clients;
  List<UserModel> get trainers => _trainers;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  Future<void> loadClients(String trainerId) async {
    _setLoading(true);
    _setError(null);

    try {
      // Mock data for demo
      await Future.delayed(const Duration(milliseconds: 500));
      
      _clients = [
        UserModel(
          id: '1',
          email: 'mario.rossi@email.com',
          name: 'Mario',
          surname: 'Rossi',
          role: UserRole.client,
          createdAt: DateTime.now().subtract(const Duration(days: 30)),
          trainerId: trainerId,
          weight: 75.0,
          height: 175.0,
          age: 28,
          fitnessGoal: 'Perdere peso',
        ),
        UserModel(
          id: '2',
          email: 'giulia.bianchi@email.com',
          name: 'Giulia',
          surname: 'Bianchi',
          role: UserRole.client,
          createdAt: DateTime.now().subtract(const Duration(days: 15)),
          trainerId: trainerId,
          weight: 62.0,
          height: 165.0,
          age: 25,
          fitnessGoal: 'Tonificare',
        ),
        UserModel(
          id: '3',
          email: 'luca.verdi@email.com',
          name: 'Luca',
          surname: 'Verdi',
          role: UserRole.client,
          createdAt: DateTime.now().subtract(const Duration(days: 5)),
          trainerId: trainerId,
          weight: 80.0,
          height: 180.0,
          age: 32,
          fitnessGoal: 'Aumentare massa muscolare',
        ),
      ];
    } catch (e) {
      _setError('Errore nel caricamento dei clienti: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> addClient({
    required String email,
    required String name,
    required String surname,
    required String trainerId,
    String? phone,
    double? weight,
    double? height,
    int? age,
    String? fitnessGoal,
  }) async {
    _setLoading(true);
    _setError(null);

    try {
      await Future.delayed(const Duration(milliseconds: 500));
      
      final newClient = UserModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        email: email,
        name: name,
        surname: surname,
        phone: phone,
        role: UserRole.client,
        createdAt: DateTime.now(),
        trainerId: trainerId,
        weight: weight,
        height: height,
        age: age,
        fitnessGoal: fitnessGoal,
      );

      _clients.add(newClient);
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Errore nell\'aggiunta del cliente: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> updateClient(UserModel updatedClient) async {
    _setLoading(true);
    _setError(null);

    try {
      await Future.delayed(const Duration(milliseconds: 500));
      
      final index = _clients.indexWhere((client) => client.id == updatedClient.id);
      if (index != -1) {
        _clients[index] = updatedClient;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _setError('Errore nell\'aggiornamento del cliente: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> deleteClient(String clientId) async {
    _setLoading(true);
    _setError(null);

    try {
      await Future.delayed(const Duration(milliseconds: 500));
      
      _clients.removeWhere((client) => client.id == clientId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Errore nell\'eliminazione del cliente: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  UserModel? getClient(String clientId) {
    try {
      return _clients.firstWhere((client) => client.id == clientId);
    } catch (e) {
      return null;
    }
  }

  List<UserModel> searchClients(String query) {
    if (query.isEmpty) return _clients;
    
    return _clients.where((client) {
      final fullName = '${client.name} ${client.surname ?? ''}'.toLowerCase();
      final email = client.email.toLowerCase();
      final searchQuery = query.toLowerCase();
      
      return fullName.contains(searchQuery) || email.contains(searchQuery);
    }).toList();
  }

  void clearError() {
    _setError(null);
  }
}