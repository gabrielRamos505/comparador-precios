import 'package:equatable/equatable.dart';

class Favorite extends Equatable {
  final String id;
  final String userId;
  final String productId;
  final String productName;
  final String barcode;
  final String? imageUrl;
  final double? lowestPrice;
  final DateTime addedAt;

  const Favorite({
    required this.id,
    required this.userId,
    required this.productId,
    required this.productName,
    required this.barcode,
    this.imageUrl,
    this.lowestPrice,
    required this.addedAt,
  });

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user_id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? json['product_id']?.toString() ?? '',
      productName: json['productName'] ?? json['name'] ?? '',
      barcode: json['barcode'] ?? '',
      imageUrl: json['imageUrl'] ?? json['image_url'],
      lowestPrice: json['lowestPrice']?.toDouble() ?? json['price']?.toDouble(),
      addedAt: DateTime.parse(json['addedAt'] ?? json['added_at'] ?? DateTime.now().toIso8601String()),
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
      'addedAt': addedAt.toIso8601String(),
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
        addedAt,
      ];
}
