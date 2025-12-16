import 'package:equatable/equatable.dart';
import 'product.dart';
class PriceResult extends Equatable {
  final String id;
  final String platform;
  final double price;
  final double shipping;
  final String currency;
  final String url;
  final bool available;
  final DateTime updatedAt;

  const PriceResult({
    required this.id,
    required this.platform,
    required this.price,
    this.shipping = 0.0,
    this.currency = 'USD',
    required this.url,
    this.available = true,
    required this.updatedAt,
  });

  double get totalPrice => price + shipping;

  factory PriceResult.fromJson(Map<String, dynamic> json) {
    return PriceResult(
      id: json['id'] ?? '',
      platform: json['platform'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      shipping: (json['shipping'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'USD',
      url: json['url'] ?? '',
      available: json['available'] ?? true,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'platform': platform,
      'price': price,
      'shipping': shipping,
      'currency': currency,
      'url': url,
      'available': available,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        platform,
        price,
        shipping,
        currency,
        url,
        available,
        updatedAt,
      ];
}

// Modelo combinado para resultados de búsqueda
class ProductSearchResult extends Equatable {
  final Product product;
  final List<PriceResult> prices;

  const ProductSearchResult({
    required this.product,
    required this.prices,
  });

  // Obtener el precio más bajo
  PriceResult? get lowestPrice {
    if (prices.isEmpty) return null;
    return prices.reduce((a, b) => a.totalPrice < b.totalPrice ? a : b);
  }

  // Ordenar precios de menor a mayor
  List<PriceResult> get sortedPrices {
    final sorted = List<PriceResult>.from(prices);
    sorted.sort((a, b) => a.totalPrice.compareTo(b.totalPrice));
    return sorted;
  }

  @override
  List<Object?> get props => [product, prices];
}
