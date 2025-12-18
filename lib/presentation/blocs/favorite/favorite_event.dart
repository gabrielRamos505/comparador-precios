import 'package:equatable/equatable.dart';

abstract class FavoriteEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

// ✅ Ya NO necesita userId
class LoadFavorites extends FavoriteEvent {}

class AddFavorite extends FavoriteEvent {
  final String barcode;
  final String name;
  final String imageUrl;

  AddFavorite({
    required this.barcode,
    required this.name,
    required this.imageUrl,
  });

  @override
  List<Object?> get props => [barcode, name, imageUrl];
}

class RemoveFavorite extends FavoriteEvent {
  final String barcode;

  RemoveFavorite(this.barcode);

  @override
  List<Object?> get props => [barcode];
}

class CheckFavorite extends FavoriteEvent {
  final String barcode;

  CheckFavorite(this.barcode);

  @override
  List<Object?> get props => [barcode];
}
