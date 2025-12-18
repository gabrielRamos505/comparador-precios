import 'package:dio/dio.dart';
import '../providers/backend_provider.dart';
import '../models/favorite.dart';

class FavoriteRepository {
  final BackendProvider _provider;

  FavoriteRepository(this._provider);

  // ✅ Obtener favoritos (Lanza error si falla para que la UI sepa)
  Future<List<Favorite>> getUserFavorites() async {
    try {
      final response = await _provider.getFavorites();
      
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => Favorite.fromJson(json)).toList();
      } else {
        throw Exception(response.data['error'] ?? 'Error desconocido al obtener favoritos');
      }
    } catch (e) {
      // Dejamos que el error suba para manejarlo en la UI
      throw _handleError(e); 
    }
  }

  Future<bool> addFavorite(String barcode, String name, String imageUrl) async {
    try {
      final response = await _provider.addFavorite({
        'barcode': barcode,
        'name': name,
        'imageUrl': imageUrl,
      });
      
      return response.data['success'] == true;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<bool> removeFavorite(String barcode) async {
    try {
      final response = await _provider.removeFavorite(barcode);
      return response.data['success'] == true;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Este sí puede retornar bool porque es una verificación simple
  Future<bool> isFavorite(String barcode) async {
    try {
      final response = await _provider.isFavorite(barcode);
      return response.data['isFavorite'] == true;
    } catch (e) {
      // Si falla la verificación, asumimos que no es favorito (fail-safe)
      return false;
    }
  }

  // Helper para limpiar mensajes de error
  Exception _handleError(dynamic e) {
    if (e is DioException) {
      // Los errores de red ya vienen procesados por tu BackendProvider,
      // pero aquí podrías personalizarlos más si quisieras.
      return Exception(e.message); 
    }
    return Exception(e.toString().replaceAll('Exception: ', ''));
  }
}