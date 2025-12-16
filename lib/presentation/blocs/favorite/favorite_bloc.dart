import 'package:flutter_bloc/flutter_bloc.dart';
import 'favorite_event.dart';
import 'favorite_state.dart';
import '../../../data/repositories/favorite_repository.dart';

class FavoriteBloc extends Bloc<FavoriteEvent, FavoriteState> {
  final FavoriteRepository _favoriteRepository;

  FavoriteBloc(this._favoriteRepository) : super(FavoriteInitial()) {
    on<LoadFavorites>(_onLoadFavorites);
    on<AddFavorite>(_onAddFavorite);
    on<RemoveFavorite>(_onRemoveFavorite);
    on<CheckFavorite>(_onCheckFavorite);
  }

  Future<void> _onLoadFavorites(
    LoadFavorites event,
    Emitter<FavoriteState> emit,
  ) async {
    emit(FavoriteLoading());
    
    try {
      final favorites = await _favoriteRepository.getFavorites(event.userId);
      emit(FavoritesLoaded(favorites));
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onAddFavorite(
    AddFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      final favorite = await _favoriteRepository.addFavorite(
        userId: event.userId,
        productId: event.productId,
        productName: event.productName,
        barcode: event.barcode,
        imageUrl: event.imageUrl,
        lowestPrice: event.lowestPrice,
      );
      
      emit(FavoriteAdded(favorite));
      
      // Recargar lista
      add(LoadFavorites(event.userId));
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onRemoveFavorite(
    RemoveFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      await _favoriteRepository.removeFavorite(event.userId, event.productId);
      emit(FavoriteRemoved());
      
      // Recargar lista
      add(LoadFavorites(event.userId));
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onCheckFavorite(
    CheckFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      final isFavorite = await _favoriteRepository.isFavorite(
        event.userId,
        event.productId,
      );
      emit(FavoriteChecked(isFavorite));
    } catch (e) {
      emit(FavoriteChecked(false));
    }
  }
}
