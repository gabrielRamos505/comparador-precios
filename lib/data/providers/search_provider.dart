import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/price_result.dart';
import '../../core/constants.dart';

class SearchProvider {
  final Dio _dio;

  SearchProvider() : _dio = _createDio();

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
        requestBody: false, // ✅ No loguear imágenes en base64
        responseBody: true,
        error: true,
        logPrint: (obj) => print('🔍 SEARCH_API: $obj'),
      ),
    );

    return dio;
  }

  /// Obtiene headers con token JWT si existe
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  // =========================================================
  // ✅ BÚSQUEDA POR NOMBRE (Texto)
  // =========================================================
  Future<List<PriceResult>> searchByName(String query) async {
    try {
      final response = await _dio.get(
        '/products/search',
        queryParameters: {'query': query},
        options: Options(headers: await _getHeaders()),
      );

      if (response.data != null && response.data['success'] == true) {
        final List data = response.data['data'] ?? [];
        return data.map((json) => PriceResult.fromJson(json)).toList();
      }
      
      return [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // =========================================================
  // ✅ BÚSQUEDA COMPLETA POR BARCODE (Producto + Precios)
  // =========================================================
  Future<Map<String, dynamic>> searchFullProduct(String barcode) async {
    try {
      final response = await _dio.get(
        '/products/barcode/$barcode',
        options: Options(headers: await _getHeaders()),
      );
      
      if (response.data != null && response.data['success'] == true) {
        final data = response.data['data'];
        
        // ✅ Validación de datos antes de mapear
        if (data['product'] == null) {
          throw Exception('Producto no encontrado');
        }

        final product = Product.fromJson(data['product']);
        final List pricesJson = data['prices'] ?? [];
        final prices = pricesJson.map((j) => PriceResult.fromJson(j)).toList();

        return {
          'product': product,
          'prices': prices,
        };
      }
      
      throw Exception('Respuesta inválida del servidor');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // =========================================================
  // ⚠️ MÉTODOS LEGACY (Compatibilidad - Opcional)
  // =========================================================
  
  /// Retorna solo el producto (sin precios)
  Future<Product> searchByBarcode(String barcode) async {
    try {
      final result = await searchFullProduct(barcode);
      return result['product'] as Product;
    } catch (e) {
      rethrow;
    }
  }

  /// Retorna solo los precios (sin producto)
  Future<List<PriceResult>> searchPrices(String barcode) async {
    try {
      final result = await searchFullProduct(barcode);
      return result['prices'] as List<PriceResult>;
    } catch (e) {
      rethrow;
    }
  }

  // =========================================================
  // MANEJO DE ERRORES MEJORADO
  // =========================================================
  Exception _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
        return Exception('Tiempo de conexión agotado. Verifica tu internet.');
      
      case DioExceptionType.receiveTimeout:
        return Exception('El servidor está demorando (Scraping en curso). Intenta nuevamente en 10 segundos.');
      
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        final errorMsg = e.response?.data?['error'];
        
        if (statusCode == 404) {
          return Exception(errorMsg ?? 'Producto no encontrado');
        }
        if (statusCode == 401) {
          return Exception('Sesión expirada. Inicia sesión nuevamente.');
        }
        if (statusCode == 422) {
          return Exception(errorMsg ?? 'La IA no pudo reconocer el producto');
        }
        
        return Exception(errorMsg ?? 'Error del servidor ($statusCode)');
      
      case DioExceptionType.connectionError:
        return Exception('Sin conexión a internet. Verifica tu red.');
      
      case DioExceptionType.cancel:
        return Exception('Búsqueda cancelada');
      
      default:
        return Exception(e.response?.data?['error'] ?? 'Error desconocido: ${e.message}');
    }
  }
}