import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart'; // Asegúrate de que esto apunta a tus modelos de Request/Response
import '../../core/constants.dart';

class ApiProvider {
  final Dio _dio;
  final SharedPreferences _prefs;

  ApiProvider(this._prefs) : _dio = _createDio(_prefs);

  static Dio _createDio(SharedPreferences prefs) {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl, // Asegúrate de que sea tu IP (192.168.x.x)
        
        // ⚠️ CAMBIO CRÍTICO: Aumentar a 90 segundos para aguantar el Scraping
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 90), 
        sendTimeout: const Duration(seconds: 60),
        
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // ✅ Interceptor para Token
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = prefs.getString(AppConstants.tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Si el token expiró (401), limpiar sesión
          if (error.response?.statusCode == 401) {
            print('❌ Token inválido/expirado - limpiando sesión');
            await prefs.remove(AppConstants.tokenKey);
            await prefs.remove(AppConstants.userKey);
          }
          return handler.next(error);
        },
      ),
    );

    // ✅ Logging mejorado para ver los datos del Scraping
    dio.interceptors.add(
      LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true, // Útil para ver qué envías
        responseHeader: false,
        responseBody: true, // ⚠️ Útil para ver la respuesta del scraping
        error: true,
        logPrint: (obj) => print('🌐 API LOG: $obj'),
      ),
    );

    return dio;
  }

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------

  Future<AuthResponse> login(LoginRequest request) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    try {
      final response = await _dio.post(
        '/auth/register',
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> verifyToken() async {
    try {
      final response = await _dio.get('/auth/verify');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (e) {
      print('Error en logout (ignorable): $e');
    } finally {
      // Limpiar localmente siempre
      await _prefs.remove(AppConstants.tokenKey);
      await _prefs.remove(AppConstants.userKey);
    }
  }

  // ---------------------------------------------------------------------------
  // MANEJO DE ERRORES INTELIGENTE
  // ---------------------------------------------------------------------------

  Exception _handleError(DioException e) {
    // 1. Si el servidor respondió con un mensaje de error específico
    if (e.response != null && e.response?.data != null) {
      try {
        final data = e.response?.data;
        // Tu backend envía: { success: false, error: "Mensaje aqui" }
        if (data is Map && data.containsKey('error')) {
          return Exception(data['error']);
        }
      } catch (_) {}
    }

    // 2. Errores de conexión/red
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
        return Exception('Tiempo de conexión agotado. Revisa tu internet.');
      case DioExceptionType.receiveTimeout:
        return Exception('El servidor está tardando mucho (Scraping en proceso...). Inténtalo de nuevo.');
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 401) return Exception('Sesión expirada o credenciales incorrectas');
        if (statusCode == 403) return Exception('Acceso denegado');
        if (statusCode == 404) return Exception('Recurso no encontrado');
        if (statusCode == 500) return Exception('Error interno del servidor');
        return Exception('Error del servidor ($statusCode)');
      case DioExceptionType.connectionError:
        return Exception('No se pudo conectar al servidor. Verifica que tu PC y celular estén en la misma WiFi.');
      default:
        return Exception('Error de red desconocido: ${e.message}');
    }
  }
}