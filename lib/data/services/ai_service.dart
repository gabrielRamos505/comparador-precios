import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../core/constants.dart';

class AIService {
  final Dio _dio;

  AIService() : _dio = _createDio();

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 45), // Gemini + Scraping es lento
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      LogInterceptor(
        requestHeader: true,
        requestBody: false, // No loguear base64 gigante
        responseBody: true,
        logPrint: (obj) => debugPrint('🤖 AI_SERVICE: $obj'),
      ),
    );

    return dio;
  }

  /// ✅ BÚSQUEDA DUAL: Barcode + Imagen (Método Principal)
  /// Envía barcode e imagen al backend para identificación robusta
  Future<Map<String, dynamic>> searchBarcodeWithImageFallback({
    required String barcode,
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      // 1. Convertir imagen a Base64 en background (no bloquea UI)
      final base64Image = await compute(_encodeImage, imageBytes);
      
      final options = Options(
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      // 2. Llamada al endpoint de identificación dual
      final response = await _dio.post(
        '/products/identify-dual', 
        data: {
          'barcode': barcode,
          'image': base64Image,
        },
        options: options,
      );

      // 3. Validar respuesta del backend
      if (response.data['success'] == true) {
        final data = response.data['data'];
        
        // ✅ VALIDACIÓN: Asegurar que tenga la estructura correcta
        if (data['product'] == null) {
          throw Exception('Estructura de respuesta inválida del servidor');
        }
        
        // El backend retorna: {product: {...}, prices: [...]}
        return data;
      } else {
        throw Exception(response.data['error'] ?? 'No se pudo identificar el producto');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    } catch (e) {
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  /// ✅ Identificar producto SOLO por imagen (Sin barcode)
  Future<Map<String, dynamic>> identifyByImageOnly({
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      final base64Image = await compute(_encodeImage, imageBytes);
      
      final response = await _dio.post(
        '/products/identify', 
        data: { 'image': base64Image },
        options: token != null 
          ? Options(headers: {'Authorization': 'Bearer $token'}) 
          : null,
      );

      if (response.data['success'] == true) {
        // ✅ Esta ruta también debe retornar {product: {...}, prices: [...]}
        return response.data['data'];
      } else {
        throw Exception(response.data['error'] ?? 'La IA no reconoció la imagen');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    }
  }

  /// ✅ Función aislada para compute() (debe ser static o top-level)
  static String _encodeImage(Uint8List bytes) {
    return base64Encode(bytes);
  }

  /// ✅ Manejo de errores mejorado
  String _handleDioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout || 
        e.type == DioExceptionType.sendTimeout) {
      return 'Tiempo de conexión agotado. Verifica tu internet.';
    }
    
    if (e.type == DioExceptionType.receiveTimeout) {
      return 'El servidor está tardando demasiado (Scraping en curso). Intenta de nuevo en 10 segundos.';
    }

    if (e.response != null) {
      final status = e.response?.statusCode;
      final data = e.response?.data;

      // Extraer mensaje de error del backend si existe
      if (data is Map && data.containsKey('error')) {
        return data['error'].toString();
      }

      switch (status) {
        case 400: 
          return 'Datos inválidos. Asegúrate de que la imagen sea clara.';
        case 401: 
          return 'Sesión expirada. Inicia sesión de nuevo.';
        case 404: 
          return 'Producto no encontrado en ninguna base de datos.';
        case 422: 
          return 'La IA no pudo reconocer el producto. Intenta con mejor iluminación.';
        case 500: 
          return 'Error en el servidor. Reintentando...';
        default: 
          return 'Error del servidor (Código $status).';
      }
    }

    // Error de red general
    if (e.type == DioExceptionType.connectionError) {
      return 'Sin conexión a internet. Verifica tu red.';
    }

    return 'Error de red. Verifica si el servidor en Render está activo.';
  }
}