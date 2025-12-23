import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/constants.dart';

class AIService {
  final Dio _dio;

  AIService() : _dio = _createDio();

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl,
        connectTimeout: AppConstants.connectionTimeout,
        receiveTimeout: AppConstants.receiveTimeout, 
        sendTimeout: AppConstants.connectionTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      LogInterceptor(
        requestBody: false, 
        responseBody: true,
        logPrint: (obj) => print('🤖 AI SERVICE: $obj'),
      ),
    );

    return dio;
  }

  /// ✅ Búsqueda por Barcode con respaldo de Imagen (IDENTIFICACIÓN DUAL)
  Future<Map<String, dynamic>> searchBarcodeWithImageFallback({
    required String barcode,
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      final base64Image = base64Encode(imageBytes);
      final options = token != null ? Options(headers: {'Authorization': 'Bearer $token'}) : null;

      final response = await _dio.post(
        '/products/identify-dual', 
        data: {
          'barcode': barcode,
          'image': base64Image,
        },
        options: options,
      );

      if (response.data['success'] == true) {
        return response.data['data']; 
      } else {
        throw Exception(response.data['error'] ?? 'Producto no encontrado');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    }
  }

  /// Identificar producto desde imagen usando Gemini Vision
  Future<Map<String, dynamic>> identifyProduct(Uint8List imageBytes, {String? token}) async {
    try {
      final base64Image = base64Encode(imageBytes);
      final options = token != null ? Options(headers: {'Authorization': 'Bearer $token'}) : null;

      final response = await _dio.post(
        '/products/identify', 
        data: { 'image': base64Image },
        options: options,
      );

      if (response.data['success'] == true) {
        return response.data['data']; 
      } else {
        throw Exception(response.data['error'] ?? 'Error desconocido en IA');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    }
  }

  String _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
        return 'Tiempo de conexión agotado.';
      case DioExceptionType.receiveTimeout:
        return 'El servidor está tardando demasiado.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 404) return 'Producto no encontrado.';
        if (statusCode == 500) return 'Error interno del servidor.';
        return 'Error del servidor ($statusCode)';
      default:
        return 'Error de red: ${e.message}';
    }
  }
}