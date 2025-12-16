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
    return PriceAlert(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      productId: json['productId'] ?? '',
      productName: json['productName'] ?? '',
      targetPrice: (json['targetPrice'] ?? 0).toDouble(),
      currentPrice: (json['currentPrice'] ?? 0).toDouble(),
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      notifiedAt: json['notifiedAt'] != null ? DateTime.parse(json['notifiedAt']) : null,
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
