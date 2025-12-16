import 'package:equatable/equatable.dart';
import '../../../data/models/favorite.dart';

abstract class FavoriteState extends Equatable {
  @override
  List<Object?> get props => [];
}

class FavoriteInitial extends FavoriteState {}

class FavoriteLoading extends FavoriteState {}

class FavoritesLoaded extends FavoriteState {
  final List<Favorite> favorites;

  FavoritesLoaded(this.favorites);

  @override
  List<Object?> get props => [favorites];
}

class FavoriteAdded extends FavoriteState {
  final Favorite favorite;

  FavoriteAdded(this.favorite);

  @override
  List<Object?> get props => [favorite];
}

class FavoriteRemoved extends FavoriteState {}

class FavoriteChecked extends FavoriteState {
  final bool isFavorite;

  FavoriteChecked(this.isFavorite);

  @override
  List<Object?> get props => [isFavorite];
}

class FavoriteError extends FavoriteState {
  final String message;

  FavoriteError(this.message);

  @override
  List<Object?> get props => [message];
}
