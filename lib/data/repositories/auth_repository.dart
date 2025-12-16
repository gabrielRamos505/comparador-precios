import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../providers/api_provider.dart';
import '../../core/constants.dart';

class AuthRepository {
  final ApiProvider _apiProvider;
  final SharedPreferences _prefs;

  AuthRepository(this._apiProvider, this._prefs);

  Future<User> login(String email, String password) async {
    if (AppConstants.useMockData) {
      return _loginMock(email, password);
    }

    try {
      final response = await _apiProvider.login(
        LoginRequest(email: email, password: password),
      );
      await _saveAuthData(response);
      return response.toUser();
    } catch (e) {
      throw Exception('Error en login: ${e.toString()}');
    }
  }

  Future<User> register(String name, String email, String password) async {
    if (AppConstants.useMockData) {
      return _registerMock(name, email, password);
    }

    try {
      final response = await _apiProvider.register(
        RegisterRequest(name: name, email: email, password: password),
      );
      await _saveAuthData(response);
      return response.toUser();
    } catch (e) {
      throw Exception('Error en registro: ${e.toString()}');
    }
  }

  Future<bool> isLoggedIn() async {
    final token = _prefs.getString(AppConstants.keyToken);
    return token != null && token.isNotEmpty;
  }

  Future<User?> getCurrentUser() async {
    final userId = _prefs.getString(AppConstants.keyUserId);
    final email = _prefs.getString(AppConstants.keyEmail);

    if (userId != null && email != null) {
      return User(id: userId, email: email);
    }
    return null;
  }

  Future<void> logout() async {
    await _prefs.clear();
  }

  Future<void> _saveAuthData(AuthResponse response) async {
    await _prefs.setString(AppConstants.keyToken, response.token);
    await _prefs.setString(AppConstants.keyUserId, response.userId);
    await _prefs.setString(AppConstants.keyEmail, response.email);
  }

  Future<User> _loginMock(String email, String password) async {
    await Future.delayed(const Duration(seconds: 1));

    if (email == 'test@test.com' && password == '123456') {
      final user = User(id: '1', email: email, name: 'Usuario Test');
      
      await _prefs.setString(AppConstants.keyToken, 'mock-token-abc123');
      await _prefs.setString(AppConstants.keyUserId, user.id);
      await _prefs.setString(AppConstants.keyEmail, user.email);

      return user;
    } else {
      throw Exception('Credenciales incorrectas. Usa: test@test.com / 123456');
    }
  }

  Future<User> _registerMock(String name, String email, String password) async {
    await Future.delayed(const Duration(seconds: 1));

    final user = User(id: '2', email: email, name: name);

    await _prefs.setString(AppConstants.keyToken, 'mock-token-xyz789');
    await _prefs.setString(AppConstants.keyUserId, user.id);
    await _prefs.setString(AppConstants.keyEmail, user.email);

    return user;
  }
}
