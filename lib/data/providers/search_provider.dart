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
        // ⚠️ CRÍTICO: 90s para aguantar el scraping
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
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => print('🔍 SEARCH: $obj'),
      ),
    );

    return dio;
  }

  // Helper para obtener headers con Token
  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(AppConstants.tokenKey); 
      
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    } catch (e) {
      print('⚠️ Error obteniendo token: $e');
    }

    return headers;
  }

  // =========================================================
  // ✅ 1. BÚSQUEDA POR TEXTO (Nuevo método agregado)
  // =========================================================
  Future<List<PriceResult>> searchByName(String query) async {
    try {
      final headers = await _getHeaders();

      // Llamada al endpoint: /api/products/search?query=Coca
      final response = await _dio.get(
        '/products/search',
        queryParameters: {'query': query},
        options: Options(headers: headers),
      );

      if (response.data != null && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        
        // Mapeamos la lista de resultados del backend a modelos de Flutter
        return data.map((json) => PriceResult.fromJson(json)).toList();
      }
      
      return []; // Si no hay datos, retornar lista vacía
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // =========================================================
  // ✅ 2. BÚSQUEDA POR BARCODE OPTIMIZADA (Full)
  // =========================================================
  Future<Map<String, dynamic>> searchFullProduct(String barcode) async {
    try {
      final headers = await _getHeaders();

      final response = await _dio.get(
        '/products/barcode/$barcode',
        options: Options(headers: headers),
      );
      
      if (response.data != null && response.data['success'] == true) {
        final data = response.data['data'];
        
        Product? product;
        if (data['product'] != null) {
          product = Product.fromJson(data['product']);
        }

        List<PriceResult> prices = [];
        if (data['prices'] != null) {
          final List<dynamic> pricesJson = data['prices'];
          prices = pricesJson.map((json) => PriceResult.fromJson(json)).toList();
        }

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
  // ⚠️ MÉTODOS LEGACY (Mantenidos por compatibilidad)
  // =========================================================
  
  Future<Product> searchByBarcode(String barcode) async {
    try {
      final headers = await _getHeaders();
      final response = await _dio.get(
        '/products/barcode/$barcode',
        options: Options(headers: headers),
      );
      
      if (response.data != null && response.data['success'] == true) {
        final productData = response.data['data']['product'];
        if (productData == null) throw Exception('Producto no encontrado');
        return Product.fromJson(productData);
      }
      throw Exception('Producto no encontrado');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<PriceResult>> searchPrices(String barcode) async {
    try {
      final headers = await _getHeaders();
      final response = await _dio.get(
        '/products/barcode/$barcode',
        options: Options(headers: headers),
      );
      
      if (response.data != null && response.data['success'] == true) {
        final pricesData = response.data['data']['prices'];
        if (pricesData == null) return [];
        
        final List<dynamic> pricesJson = pricesData as List;
        return pricesJson.map((json) => PriceResult.fromJson(json)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // =========================================================
  // MANEJO DE ERRORES
  // =========================================================
  Exception _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
        return Exception('Tiempo de conexión agotado');
      case DioExceptionType.receiveTimeout:
        return Exception('El servidor está tardando en buscar precios (Scraping en curso). Inténtalo de nuevo.');
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 404) return Exception('Producto no encontrado');
        if (statusCode == 401) return Exception('Sesión expirada');
        return Exception('Error del servidor: $statusCode');
      case DioExceptionType.connectionError:
        return Exception('Error de conexión. Verifica tu internet.');
      default:
        return Exception('Error: ${e.message}');
    }
  }
}