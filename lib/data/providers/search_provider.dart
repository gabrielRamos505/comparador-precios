import 'package:dio/dio.dart';
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
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
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

  // Buscar producto por código de barras usando backend real
  Future<Product> searchByBarcode(String barcode) async {
    try {
      final response = await _dio.get('/products/barcode/$barcode');
      
      if (response.data != null && response.data['success'] == true) {
        // ⭐ CAMBIO: Acceder correctamente a data.product
        final productData = response.data['data']['product'];
        
        if (productData == null) {
          throw Exception('Producto no encontrado');
        }
        
        return Product.fromJson(productData);
      }
      
      throw Exception('Producto no encontrado');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Buscar precios de un producto usando backend real
  Future<List<PriceResult>> searchPrices(String barcode) async {
    try {
      final response = await _dio.get('/products/barcode/$barcode');
      
      if (response.data != null && response.data['success'] == true) {
        // ⭐ CAMBIO: Acceder correctamente a data.prices
        final pricesData = response.data['data']['prices'];
        
        if (pricesData == null) {
          return [];
        }
        
        final List<dynamic> pricesJson = pricesData as List;
        return pricesJson.map((json) => PriceResult.fromJson(json)).toList();
      }
      
      return [];
    } on DioException catch (e) {
      print('❌ Error searching prices: ${e.message}');
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return Exception('Tiempo de espera agotado');
      case DioExceptionType.receiveTimeout:
        return Exception('Tiempo de espera agotado');
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 404) {
          return Exception('Producto no encontrado');
        } else {
          return Exception('Error del servidor: $statusCode');
        }
      case DioExceptionType.connectionError:
        return Exception('Error de conexión. Verifica tu internet.');
      default:
        return Exception('Error de conexión: ${e.message}');
    }
  }
}
