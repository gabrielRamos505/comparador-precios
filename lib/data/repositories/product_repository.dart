import '../models/product.dart';
import '../models/price_result.dart';
import '../providers/search_provider.dart';
import '../../core/constants.dart';

class ProductRepository {
  final SearchProvider _searchProvider;

  ProductRepository(this._searchProvider);

  // Buscar producto completo con precios usando APIs reales
  Future<ProductSearchResult> searchByBarcode(String barcode) async {
    try {
      print('🔍 Repository: Searching for barcode $barcode');
      
      // Usar backend con APIs reales
      final product = await _searchProvider.searchByBarcode(barcode);
      print('✅ Repository: Product found - ${product.name}');
      
      final prices = await _searchProvider.searchPrices(barcode);
      print('✅ Repository: Found ${prices.length} prices');
      
      return ProductSearchResult(product: product, prices: prices);
    } catch (e) {
      print('❌ Repository Error: $e');
      
      // Si falla, usar mock como fallback
      if (AppConstants.useMockData) {
        print('⚠️  Using mock data as fallback');
        return _searchMock(barcode);
      }
      
      throw Exception('Error al buscar producto: $e');
    }
  }

  // MOCK: Datos de prueba (fallback)
  Future<ProductSearchResult> _searchMock(String barcode) async {
    await Future.delayed(const Duration(seconds: 2));

    final mockProducts = {
      '7501055363124': _createMockProduct(
        '7501055363124',
        'Coca Cola 600ml',
        'Coca-Cola',
        'Bebidas',
      ),
      '7501055365838': _createMockProduct(
        '7501055365838',
        'Pepsi 600ml',
        'Pepsi',
        'Bebidas',
      ),
      '7506339390100': _createMockProduct(
        '7506339390100',
        'Sabritas Original 45g',
        'Sabritas',
        'Snacks',
      ),
      '5449000000996': _createMockProduct(
        '5449000000996',
        'Coca Cola',
        'Coca-Cola',
        'Bebidas',
      ),
    };

    final product = mockProducts[barcode] ??
        _createMockProduct(
          barcode,
          'Producto de Ejemplo',
          'Marca Genérica',
          'General',
        );

    final prices = _createMockPrices(product.id);

    return ProductSearchResult(product: product, prices: prices);
  }

  Product _createMockProduct(
    String barcode,
    String name,
    String brand,
    String category,
  ) {
    return Product(
      id: 'mock-$barcode',
      barcode: barcode,
      name: name,
      brand: brand,
      category: category,
      imageUrl: 'https://via.placeholder.com/150',
      description: 'Producto de ejemplo para pruebas',
    );
  }

  List<PriceResult> _createMockPrices(String productId) {
    return [
      PriceResult(
        id: '1',
        platform: 'Amazon',
        price: 15.99,
        shipping: 3.50,
        currency: 'USD',
        url: 'https://amazon.com/product',
        available: true,
        updatedAt: DateTime.now(),
      ),
      PriceResult(
        id: '2',
        platform: 'Walmart',
        price: 14.50,
        shipping: 0.0,
        currency: 'USD',
        url: 'https://walmart.com/product',
        available: true,
        updatedAt: DateTime.now(),
      ),
      PriceResult(
        id: '3',
        platform: 'Target',
        price: 16.20,
        shipping: 4.00,
        currency: 'USD',
        url: 'https://target.com/product',
        available: true,
        updatedAt: DateTime.now(),
      ),
      PriceResult(
        id: '4',
        platform: 'Best Buy',
        price: 12.99,
        shipping: 5.50,
        currency: 'USD',
        url: 'https://bestbuy.com/product',
        available: true,
        updatedAt: DateTime.now(),
      ),
    ];
  }
}
