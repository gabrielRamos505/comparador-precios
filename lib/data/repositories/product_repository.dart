import '../models/product.dart';
import '../models/price_result.dart';
import '../providers/search_provider.dart';
import '../../data/services/ai_service.dart';
import 'dart:typed_data';

class ProductRepository {
  final SearchProvider _searchProvider;
  final AIService _aiService = AIService(); // Instanciamos el servicio de IA

  ProductRepository(this._searchProvider);

  /// ✅ Búsqueda DUAL (Barcode + Imagen) - El corazón de la App
  Future<ProductSearchResult> identifyAndSearch({
    required String barcode,
    required Uint8List imageBytes,
    String? token,
  }) async {
    try {
      // Llamamos al servicio de identificación que usa Gemini + Scrapers
      final result = await _aiService.searchBarcodeWithImageFallback(
        barcode: barcode,
        imageBytes: imageBytes,
        token: token,
      );

      // Mapeamos la respuesta del backend a nuestros modelos locales
      final product = Product(
        barcode: result['barcode'] ?? barcode,
        name: result['identifiedProduct'] ?? 'Producto Desconocido',
        imageUrl: (result['searchResults'] as List).isNotEmpty 
            ? result['searchResults'][0]['image'] ?? '' 
            : '',
        brand: '', // Puedes extraer más info si el backend la envía
        category: '',
      );

      final List<PriceResult> prices = (result['searchResults'] as List)
          .map((p) => PriceResult.fromJson(p))
          .toList();

      return ProductSearchResult(product: product, prices: prices);
    } catch (e) {
      throw Exception(_cleanError(e));
    }
  }

  /// Búsqueda por Barcode simple (Tradicional)
  Future<ProductSearchResult> searchByBarcode(String barcode) async {
    try {
      final resultMap = await _searchProvider.searchFullProduct(barcode);
      return ProductSearchResult(
        product: resultMap['product'] as Product,
        prices: resultMap['prices'] as List<PriceResult>
      );
    } catch (e) {
      throw _cleanError(e);
    }
  }

  String _cleanError(dynamic e) {
    return e.toString().replaceAll('Exception: ', '').trim();
  }
}