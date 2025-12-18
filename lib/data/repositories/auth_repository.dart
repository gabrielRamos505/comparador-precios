import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../providers/api_provider.dart';
import '../../core/constants.dart'; // ✅ Importante para usar las keys

class AuthRepository {
  final ApiProvider _apiProvider;
  final SharedPreferences _prefs;

  AuthRepository(this._apiProvider, this._prefs);

  Future<User> login(String email, String password) async {
    // ✅ No usamos try-catch aquí para dejar que el error limpio 
    // del ApiProvider ("Credenciales inválidas") llegue directo a la UI via Bloc/Provider
    final response = await _apiProvider.login(
      LoginRequest(email: email, password: password),
    );
    await _saveAuthData(response);
    return response.toUser();
  }

  Future<User> register(String name, String email, String password) async {
    final response = await _apiProvider.register(
      RegisterRequest(name: name, email: email, password: password),
    );
    await _saveAuthData(response);
    return response.toUser();
  }

  /// ✅ Verificar token guardado (auto-login)
  Future<User?> verifyToken() async {
    try {
      // Usar constante para evitar errores de dedo
      final token = _prefs.getString(AppConstants.tokenKey); 
      
      if (token == null || token.isEmpty) {
        return null;
      }

      print('🔍 Verificando token guardado...');

      final response = await _apiProvider.verifyToken();

      if (response['success'] == true) {
        final userData = response['user'];
        
        // Actualizar datos del usuario en cache por si cambiaron en el backend
        await _prefs.setString(AppConstants.userKey, jsonEncode(userData));
        
        print('✅ Token válido - Usuario: ${userData['email']}');
        return User.fromJson(userData);
      }

      return null;
    } catch (e) {
      print('❌ Token inválido o sesión caducada: $e');
      // Si falla la verificación, limpiamos todo para obligar login
      await logout();
      return null;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = _prefs.getString(AppConstants.tokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<User?> getCurrentUser() async {
    final userData = _prefs.getString(AppConstants.userKey);
    if (userData != null) {
      try {
        final Map<String, dynamic> json = jsonDecode(userData);
        return User.fromJson(json);
      } catch (e) {
        print('Error parseando usuario local: $e');
        return null;
      }
    }
    return null;
  }

  Future<void> logout() async {
    try {
      await _apiProvider.logout();
    } catch (e) {
      print('Error no bloqueante en logout API: $e');
    } finally {
      // Limpieza local obligatoria
      await _prefs.remove(AppConstants.tokenKey);
      await _prefs.remove(AppConstants.userKey);
      
      // Opcional: Limpiar historial local si quieres privacidad total
      // await _prefs.remove(AppConstants.searchHistoryKey); 
      
      print('🚪 Sesión cerrada localmente');
    }
  }

  // ✅ Helper privado para guardar sesión
  Future<void> _saveAuthData(AuthResponse response) async {
    await _prefs.setString(AppConstants.tokenKey, response.token);
    
    // Guardamos el usuario como JSON string para recuperarlo offline si hace falta
    final userMap = {
      'id': response.userId,
      'email': response.email,
      'name': response.name,
    };
    await _prefs.setString(AppConstants.userKey, jsonEncode(userMap));
  }
}