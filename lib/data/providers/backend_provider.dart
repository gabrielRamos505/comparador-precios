import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants.dart';

class BackendProvider {
  final Dio _dio;

  BackendProvider(SharedPreferences prefs) : _dio = _createDio(prefs);

  static Dio _createDio(SharedPreferences prefs) {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl,
        
        // Usamos constantes globales aumentadas
        connectTimeout: AppConstants.connectionTimeout,
        receiveTimeout: AppConstants.receiveTimeout, 
        sendTimeout: AppConstants.connectionTimeout,
        
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // ✅ Interceptor para Token JWT
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = prefs.getString(AppConstants.tokenKey); // Usar constante
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Si el token expira, limpiar sesión
          if (error.response?.statusCode == 401) {
            print('❌ Token inválido/expirado - Cerrando sesión local');
            await prefs.remove(AppConstants.tokenKey);
            await prefs.remove(AppConstants.userKey);
          }
          return handler.next(error);
        },
      ),
    );

    // ✅ Logger para depuración
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true, // Ver qué enviamos
        responseBody: true, // Ver qué responde el backend (IMPORTANTE)
        logPrint: (obj) => print('🔵 BACKEND: $obj'),
      ),
    );

    return dio;
  }

  // ==========================================
  // ❤️ FAVORITES
  // ==========================================
  
  Future<Response> getFavorites() async {
    return await _dio.get('/favorites');
  }

  Future<Response> addFavorite(Map<String, dynamic> data) async {
    return await _dio.post('/favorites', data: data);
  }

  Future<Response> removeFavorite(String barcode) async {
    return await _dio.delete('/favorites/$barcode');
  }

  Future<Response> isFavorite(String barcode) async {
    return await _dio.get('/favorites/$barcode/check');
  }

  // ==========================================
  // 🔔 PRICE ALERTS
  // ==========================================
  
  Future<Response> getAlerts({
    bool activeOnly = false,
    int page = 1,
    int limit = 20
  }) async {
    return await _dio.get('/price-alerts', queryParameters: {
      'activeOnly': activeOnly,
      'page': page,
      'limit': limit,
    });
  }

  Future<Response> createAlert(Map<String, dynamic> data) async {
    return await _dio.post('/price-alerts', data: data);
  }

  // El backend usa una ruta específica para desactivar
  Future<Response> deactivateAlert(String alertId) async {
    return await _dio.put('/price-alerts/$alertId/deactivate');
  }

  Future<Response> deleteAlert(String alertId) async {
    return await _dio.delete('/price-alerts/$alertId');
  }

  // ==========================================
  // ⭐ REVIEWS
  // ==========================================
  
  // ⚠️ CORRECCIÓN: El backend ahora busca por '/product/:barcode'
  // Antes tenías '/reviews/:productId'
  Future<Response> getProductReviews(String barcode) async {
    return await _dio.get('/reviews/product/$barcode');
  }

  Future<Response> getUserReviews() async {
    return await _dio.get('/reviews/user');
  }

  Future<Response> createOrUpdateReview(Map<String, dynamic> data) async {
    return await _dio.post('/reviews', data: data);
  }

  Future<Response> deleteReview(String reviewId) async {
    return await _dio.delete('/reviews/$reviewId');
  }

  // ==========================================
  // 📨 NOTIFICATIONS
  // ==========================================
  
  Future<Response> getNotifications({
    bool unreadOnly = false, 
    int page = 1, 
    int limit = 20
  }) async {
    return await _dio.get('/notifications', queryParameters: {
      'unread': unreadOnly,
      'page': page,
      'limit': limit,
    });
  }

  Future<Response> markNotificationAsRead(String notificationId) async {
    return await _dio.put('/notifications/$notificationId/read');
  }

  Future<Response> markAllNotificationsAsRead() async {
    return await _dio.put('/notifications/read-all');
  }

  // ==========================================
  // 📜 HISTORY
  // ==========================================

  Future<Response> getUserHistory({int page = 1, int limit = 20}) async {
    return await _dio.get('/history', queryParameters: {
      'page': page,
      'limit': limit,
    });
  }

  Future<Response> deleteHistoryItem(String historyId) async {
    return await _dio.delete('/history/$historyId');
  }

  Future<Response> clearHistory() async {
    return await _dio.delete('/history');
  }
}