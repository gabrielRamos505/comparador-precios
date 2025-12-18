import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../data/repositories/favorite_repository.dart';
import 'favorite_event.dart';
import 'favorite_state.dart';

class FavoriteBloc extends Bloc<FavoriteEvent, FavoriteState> {
  final FavoriteRepository _repository;

  FavoriteBloc(this._repository) : super(FavoriteInitial()) {
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
      final favorites = await _repository.getUserFavorites();
      emit(FavoritesLoaded(favorites)); // ✅ CORRECTO: FavoritesLoaded (con 's')
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onAddFavorite(
    AddFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      final success = await _repository.addFavorite(
        event.barcode,
        event.name,
        event.imageUrl,
      );
      
      if (success) {
        // Recargar favoritos
        add(LoadFavorites());
      }
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onRemoveFavorite(
    RemoveFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      final success = await _repository.removeFavorite(event.barcode);
      
      if (success) {
        // Recargar favoritos
        add(LoadFavorites());
      }
    } catch (e) {
      emit(FavoriteError(e.toString()));
    }
  }

  Future<void> _onCheckFavorite(
    CheckFavorite event,
    Emitter<FavoriteState> emit,
  ) async {
    try {
      final isFav = await _repository.isFavorite(event.barcode);
      emit(FavoriteChecked(isFav)); // ✅ Emitir estado de verificación
    } catch (e) {
      print('Error verificando favorito: $e');
    }
  }
}
