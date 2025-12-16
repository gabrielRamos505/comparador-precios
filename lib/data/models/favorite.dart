import 'package:equatable/equatable.dart';

class Favorite extends Equatable {
  final String id;
  final String userId;
  final String productId;
  final String productName;
  final String barcode;
  final String? imageUrl;
  final double? lowestPrice;
  final DateTime createdAt;

  const Favorite({
    required this.id,
    required this.userId,
    required this.productId,
    required this.productName,
    required this.barcode,
    this.imageUrl,
    this.lowestPrice,
    required this.createdAt,
  });

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      productId: json['productId'] ?? '',
      productName: json['productName'] ?? '',
      barcode: json['barcode'] ?? '',
      imageUrl: json['imageUrl'],
      lowestPrice: json['lowestPrice']?.toDouble(),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'productId': productId,
      'productName': productName,
      'barcode': barcode,
      'imageUrl': imageUrl,
      'lowestPrice': lowestPrice,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        productId,
        productName,
        barcode,
        imageUrl,
        lowestPrice,
        createdAt,
      ];
}
