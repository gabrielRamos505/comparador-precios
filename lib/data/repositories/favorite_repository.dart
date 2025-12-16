import '../models/favorite.dart';
import '../providers/backend_provider.dart';

class FavoriteRepository {
  final BackendProvider _backendProvider;

  FavoriteRepository(this._backendProvider);

  Future<List<Favorite>> getFavorites(String userId) async {
    try {
      final response = await _backendProvider.getFavorites(userId);
      
      if (response.data['success']) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => Favorite.fromJson(json)).toList();
      }
      
      return [];
    } catch (e) {
      throw Exception('Error al obtener favoritos: $e');
    }
  }

  Future<Favorite> addFavorite({
    required String userId,
    required String productId,
    required String productName,
    required String barcode,
    String? imageUrl,
    double? lowestPrice,
  }) async {
    try {
      final response = await _backendProvider.addFavorite({
        'userId': userId,
        'productId': productId,
        'productName': productName,
        'barcode': barcode,
        'imageUrl': imageUrl,
        'lowestPrice': lowestPrice,
      });
      
      if (response.data['success']) {
        return Favorite.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Error al agregar favorito: $e');
    }
  }

  Future<bool> removeFavorite(String userId, String productId) async {
    try {
      final response = await _backendProvider.removeFavorite(userId, productId);
      return response.data['success'] ?? false;
    } catch (e) {
      throw Exception('Error al eliminar favorito: $e');
    }
  }

  Future<bool> isFavorite(String userId, String productId) async {
    try {
      final response = await _backendProvider.isFavorite(userId, productId);
      return response.data['isFavorite'] ?? false;
    } catch (e) {
      return false;
    }
  }
}
