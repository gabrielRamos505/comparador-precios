import 'package:dio/dio.dart';
import '../../core/constants.dart';

class BackendProvider {
  final Dio _dio;

  BackendProvider() : _dio = _createDio();

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => print('🔵 BACKEND: $obj'),
      ),
    );

    return dio;
  }

  // Favorites
  Future<Response> getFavorites(String userId) async {
    return await _dio.get('/favorites/$userId');
  }

  Future<Response> addFavorite(Map<String, dynamic> data) async {
    return await _dio.post('/favorites', data: data);
  }

  Future<Response> removeFavorite(String userId, String productId) async {
    return await _dio.delete('/favorites/$userId/$productId');
  }

  Future<Response> isFavorite(String userId, String productId) async {
    return await _dio.get('/favorites/$userId/$productId/check');
  }

  // Price Alerts
  Future<Response> getAlerts(String userId) async {
    return await _dio.get('/price-alerts/$userId');
  }

  Future<Response> createAlert(Map<String, dynamic> data) async {
    return await _dio.post('/price-alerts', data: data);
  }

  Future<Response> updateAlert(String alertId, Map<String, dynamic> data) async {
    return await _dio.put('/price-alerts/$alertId', data: data);
  }

  Future<Response> deleteAlert(String alertId) async {
    return await _dio.delete('/price-alerts/$alertId');
  }

  // Reviews
  Future<Response> getReviews(String productId) async {
    return await _dio.get('/reviews/$productId');
  }

  Future<Response> createReview(Map<String, dynamic> data) async {
    return await _dio.post('/reviews', data: data);
  }

  Future<Response> likeReview(String reviewId) async {
    return await _dio.post('/reviews/$reviewId/like');
  }

  Future<Response> deleteReview(String reviewId) async {
    return await _dio.delete('/reviews/$reviewId');
  }
}
