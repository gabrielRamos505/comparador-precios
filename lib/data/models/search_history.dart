import 'package:equatable/equatable.dart';

class SearchHistory extends Equatable {
  final String id;
  final String barcode;
  final String productName;
  final String? brand;
  final String? imageUrl;
  final String? category;
  final DateTime searchedAt;

  const SearchHistory({
    this.id = '',
    required this.barcode,
    required this.productName,
    this.brand,
    this.imageUrl,
    this.category,
    required this.searchedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'barcode': barcode,
      'productName': productName,
      'brand': brand,
      'imageUrl': imageUrl,
      'category': category,
      'searchedAt': searchedAt.toIso8601String(),
    };
  }

  factory SearchHistory.fromMap(Map<String, dynamic> map) {
    // El backend envía un objeto anidado 'product'
    final product = map['product'] as Map<String, dynamic>?;
    
    return SearchHistory(
      id: map['id']?.toString() ?? '',
      barcode: map['barcode'] ?? product?['barcode'] ?? '',
      productName: product?['name'] ?? map['productName'] ?? 'Producto',
      brand: product?['brand'],
      imageUrl: product?['image'] ?? product?['image_url'] ?? map['imageUrl'],
      category: product?['category'],
      searchedAt: map['searchedAt'] != null 
          ? DateTime.parse(map['searchedAt']) 
          : map['searched_at'] != null 
              ? DateTime.parse(map['searched_at'])
              : DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        barcode,
        productName,
        brand,
        imageUrl,
        category,
        searchedAt,
      ];
}

class HistoryResult {
  final List<SearchHistory> history;
  final int total;

  HistoryResult({required this.history, required this.total});
}
