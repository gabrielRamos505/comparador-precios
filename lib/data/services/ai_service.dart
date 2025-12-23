import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart'; // Para compute
import '../../core/constants.dart';

class AIService {
  final Dio _dio;

  AIService() : _dio = _createDio();

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.backendUrl,
        connectTimeout: const Duration(seconds: 15), // Gemini tarda, damos margen
        receiveTimeout: const Duration(seconds: 45), // El scraping + IA es lento
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Logger mejorado para depuración en Render
    dio.interceptors.add(
      LogInterceptor(
        requestHeader: true,
        requestBody: false, // No loguear el base64 gigante
        responseBody: true,
        logPrint: (obj) => debugPrint('🤖 AI_SERVICE: $obj'),
      ),
    );

    return dio;
  }

  /// ✅ Búsqueda por Barcode con respaldo de Imagen (IDENTIFICACIÓN DUAL)
  /// Este método es el que soluciona el error de "Producto no encontrado"
  Future<Map<String, dynamic>> searchBarcodeWithImageFallback({
    required String barcode,
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      // 1. Convertir imagen a Base64
      final base64Image = base64Encode(imageBytes);
      
      final options = Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      // 2. Llamada a la nueva ruta robusta
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
        throw Exception(response.data['error'] ?? 'No se pudo identificar el producto');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    } catch (e) {
      throw Exception('Error inesperado: $e');
    }
  }

  /// ✅ Identificar producto solo por imagen (Cuando no hay barcode)
  Future<Map<String, dynamic>> identifyByImageOnly({
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      final base64Image = base64Encode(imageBytes);
      
      final response = await _dio.post(
        '/products/identify', 
        data: { 'image': base64Image },
        options: token != null ? Options(headers: {'Authorization': 'Bearer $token'}) : null,
      );

      if (response.data['success'] == true) {
        return response.data['data'];
      } else {
        throw Exception(response.data['error'] ?? 'La IA no reconoció la imagen');
      }
    } on DioException catch (e) {
      throw Exception(_handleDioError(e));
    }
  }

  /// ✅ Manejo de errores detallado para el UI
  String _handleDioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout || 
        e.type == DioExceptionType.sendTimeout) {
      return 'El servidor está tardando mucho en responder. Revisa tu conexión.';
    }
    
    if (e.type == DioExceptionType.receiveTimeout) {
      return 'Búsqueda exhaustiva agotada. Intenta de nuevo.';
    }

    if (e.response != null) {
      final status = e.response?.statusCode;
      final data = e.response?.data;

      // Si el backend envió un mensaje de error específico (ej: Gemini falló)
      if (data is Map && data.containsKey('error')) {
        return data['error'];
      }

      switch (status) {
        case 400: return 'Datos de búsqueda inválidos.';
        case 401: return 'Sesión expirada. Por favor, inicia sesión de nuevo.';
        case 404: return 'Producto no encontrado en tiendas ni base de datos.';
        case 422: return 'La imagen es demasiado borrosa o no es un producto.';
        case 500: return 'Error en el servidor de búsqueda. Reintentando...';
        default: return 'Error inesperado en el servidor ($status).';
      }
    }

    return 'Error de red. Verifica si tu servidor en Render está activo.';
  }
}