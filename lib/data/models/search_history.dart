import 'package:equatable/equatable.dart';

class SearchHistory extends Equatable {
  final String barcode;
  final String productName;
  final String? imageUrl;
  final double? lowestPrice;
  final String? platform;
  final DateTime searchedAt;

  const SearchHistory({
    required this.barcode,
    required this.productName,
    this.imageUrl,
    this.lowestPrice,
    this.platform,
    required this.searchedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'barcode': barcode,
      'productName': productName,
      'imageUrl': imageUrl,
      'lowestPrice': lowestPrice,
      'platform': platform,
      'searchedAt': searchedAt.millisecondsSinceEpoch,
    };
  }

  factory SearchHistory.fromMap(Map<String, dynamic> map) {
    return SearchHistory(
      barcode: map['barcode'] ?? '',
      productName: map['productName'] ?? '',
      imageUrl: map['imageUrl'],
      lowestPrice: map['lowestPrice']?.toDouble(),
      platform: map['platform'],
      searchedAt: DateTime.fromMillisecondsSinceEpoch(map['searchedAt'] ?? 0),
    );
  }

  @override
  List<Object?> get props => [
        barcode,
        productName,
        imageUrl,
        lowestPrice,
        platform,
        searchedAt,
      ];
}
