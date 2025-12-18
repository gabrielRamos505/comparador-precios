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
        // ⚠️ Aumentado a 90s para dar tiempo al scraping si la IA encuentra el producto rápido
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 90), 
        sendTimeout: const Duration(seconds: 60),
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

  /// Identificar producto desde imagen usando Gemini Vision
  Future<Map<String, dynamic>> identifyProduct(
    Uint8List imageBytes, {
    String? token, 
  }) async {
    try {
      print('📤 Enviando imagen a API... (${(imageBytes.length / 1024).toStringAsFixed(2)} KB)');
      
      // Convertir imagen a Base64
      final base64Image = base64Encode(imageBytes);

      final options = token != null
          ? Options(headers: {'Authorization': 'Bearer $token'})
          : null;

      // ⚠️ CORRECCIÓN 1: La ruta ahora es /products/identify
      final response = await _dio.post(
        '/products/identify', 
        data: {
          // ⚠️ CORRECCIÓN 2: La clave debe ser 'image' para que coincida con req.body.image en el backend
          'image': base64Image, 
        },
        options: options,
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        print('✅ Producto identificado: ${data['identifiedProduct']}');
        
        // Retornamos la data completa (incluye identifiedProduct, confidence y searchResults)
        return data; 
      } else {
        throw Exception(response.data['error'] ?? 'Error desconocido en IA');
      }

    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    } catch (e) {
      print('❌ Error general: $e');
      throw Exception('Error al identificar producto: $e');
    }
  }

  String _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
        return 'Tiempo de conexión agotado. Tu internet parece lento.';
      case DioExceptionType.receiveTimeout:
        return 'El servidor está tardando en analizar y buscar precios. Inténtalo de nuevo.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 400) return 'Imagen inválida o formato no soportado.';
        if (statusCode == 422) return 'No se pudo identificar ningún producto en la imagen.';
        if (statusCode == 401) return 'Sesión expirada.';
        if (statusCode == 404) return 'Servicio no encontrado (Ruta incorrecta).';
        if (statusCode == 500) return 'Error interno del servidor.';
        return 'Error del servidor ($statusCode)';
      case DioExceptionType.connectionError:
        return 'No se pudo conectar al servidor. Verifica que estés en la misma WiFi.';
      default:
        return 'Error de red: ${e.message}';
    }
  }
}