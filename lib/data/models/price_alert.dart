import 'package:equatable/equatable.dart';

class PriceAlert extends Equatable {
  final String id;
  final String userId;
  final String productId;
  final String productName;
  final double targetPrice;
  final double currentPrice;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? notifiedAt;

  const PriceAlert({
    required this.id,
    required this.userId,
    required this.productId,
    required this.productName,
    required this.targetPrice,
    required this.currentPrice,
    this.isActive = true,
    required this.createdAt,
    this.notifiedAt,
  });

  factory PriceAlert.fromJson(Map<String, dynamic> json) {
    // El backend usa 'status' (active, triggered, inactive)
    final String status = json['status'] ?? (json['isActive'] == true ? 'active' : 'inactive');
    
    return PriceAlert(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user_id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? json['product_id']?.toString() ?? '',
      productName: json['productName'] ?? json['Product']?['name'] ?? 'Producto',
      targetPrice: (json['targetPrice'] ?? json['target_price'] ?? 0).toDouble(),
      currentPrice: (json['currentPrice'] ?? json['initial_price'] ?? 0).toDouble(),
      isActive: status == 'active',
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String()),
      notifiedAt: json['notifiedAt'] != null || json['notified_at'] != null 
          ? DateTime.parse(json['notifiedAt'] ?? json['notified_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'productId': productId,
      'productName': productName,
      'targetPrice': targetPrice,
      'currentPrice': currentPrice,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'notifiedAt': notifiedAt?.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        productId,
        productName,
        targetPrice,
        currentPrice,
        isActive,
        createdAt,
        notifiedAt,
      ];
}
