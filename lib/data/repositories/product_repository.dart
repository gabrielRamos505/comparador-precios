import '../models/product.dart';
import '../models/price_result.dart';
import '../providers/search_provider.dart';
import '../../data/services/ai_service.dart';
import 'dart:typed_data';

// ✅ Clase auxiliar para encapsular el resultado
class ProductSearchResult {
  final Product product;
  final List<PriceResult> prices;
  
  ProductSearchResult({
    required this.product, 
    required this.prices
  });
}

class ProductRepository {
  final SearchProvider _searchProvider;
  final AIService _aiService = AIService();

  ProductRepository(this._searchProvider);

  /// ✅ Búsqueda DUAL (Barcode + Imagen) - Endpoint principal
  Future<ProductSearchResult> identifyAndSearch({
    required String barcode,
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      // Llamada al backend que procesa con IA
      final response = await _aiService.searchBarcodeWithImageFallback(
        barcode: barcode,
        imageBytes: imageBytes,
        token: token,
      );

      // ✅ El backend responde con estructura: { product: {...}, prices: [...] }
      final data = response['data'] ?? response; // Maneja ambos formatos
      
      final productJson = data['product'];
      final List pricesJson = data['prices'] ?? [];

      // ✅ Usamos fromJson para mapear correctamente
      final product = Product.fromJson(productJson);
      final prices = pricesJson
          .map((p) => PriceResult.fromJson(p))
          .toList();

      return ProductSearchResult(
        product: product, 
        prices: prices
      );
      
    } catch (e) {
      throw Exception(_cleanError(e));
    }
  }

  /// Búsqueda tradicional por Barcode (Legacy/Fallback)
  Future<ProductSearchResult> searchByBarcode(String barcode) async {
    try {
      final resultMap = await _searchProvider.searchFullProduct(barcode);
      
      return ProductSearchResult(
        product: resultMap['product'] as Product,
        prices: resultMap['prices'] as List<PriceResult>
      );
      
    } catch (e) {
      throw Exception(_cleanError(e)); // ✅ Mantener consistencia con Exception
    }
  }

  /// Limpia mensajes de error para mostrar al usuario
  String _cleanError(dynamic e) {
    return e.toString()
        .replaceAll('Exception: ', '')
        .replaceAll('Error: ', '')
        .trim();
  }
}