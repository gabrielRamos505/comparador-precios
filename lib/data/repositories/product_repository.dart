import '../models/product.dart';
import '../models/price_result.dart';
import '../providers/search_provider.dart';

class ProductRepository {
  final SearchProvider _searchProvider;

  ProductRepository(this._searchProvider);

  // ✅ Búsqueda por Barcode OPTIMIZADA (1 sola llamada al backend)
  Future<ProductSearchResult> searchByBarcode(String barcode) async {
    try {
      print('🔍 Repository: Buscando barcode $barcode...');
      
      // Usamos el método optimizado del provider
      final resultMap = await _searchProvider.searchFullProduct(barcode);
      
      final product = resultMap['product'] as Product;
      final prices = resultMap['prices'] as List<PriceResult>;

      print('✅ Repository: Producto encontrado "${product.name}" con ${prices.length} precios.');
      
      return ProductSearchResult(product: product, prices: prices);

    } catch (e) {
      // Propagamos el error limpio para que la UI muestre el mensaje correcto
      // (Ej: "Tiempo de espera agotado" o "Producto no encontrado")
      throw _cleanError(e);
    }
  }

  // ✅ Búsqueda por Nombre (Texto)
  // Útil si quieres agregar una barra de búsqueda manual en la app
  Future<List<ProductSearchResult>> searchByName(String query) async {
    try {
      // Nota: Necesitarías agregar `searchByName` en tu SearchProvider si quieres usar esto.
      // Por ahora es solo un placeholder para futura expansión.
      return []; 
    } catch (e) {
      throw _cleanError(e);
    }
  }

  // Helper para limpiar mensajes de error
  Exception _cleanError(dynamic e) {
    final message = e.toString().replaceAll('Exception: ', '');
    return Exception(message);
  }
}