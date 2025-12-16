import 'package:equatable/equatable.dart';

abstract class FavoriteEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadFavorites extends FavoriteEvent {
  final String userId;

  LoadFavorites(this.userId);

  @override
  List<Object?> get props => [userId];
}

class AddFavorite extends FavoriteEvent {
  final String userId;
  final String productId;
  final String productName;
  final String barcode;
  final String? imageUrl;
  final double? lowestPrice;

  AddFavorite({
    required this.userId,
    required this.productId,
    required this.productName,
    required this.barcode,
    this.imageUrl,
    this.lowestPrice,
  });

  @override
  List<Object?> get props => [
        userId,
        productId,
        productName,
        barcode,
        imageUrl,
        lowestPrice,
      ];
}

class RemoveFavorite extends FavoriteEvent {
  final String userId;
  final String productId;

  RemoveFavorite(this.userId, this.productId);

  @override
  List<Object?> get props => [userId, productId];
}

class CheckFavorite extends FavoriteEvent {
  final String userId;
  final String productId;

  CheckFavorite(this.userId, this.productId);

  @override
  List<Object?> get props => [userId, productId];
}
