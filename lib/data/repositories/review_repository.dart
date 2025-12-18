import 'package:dio/dio.dart';
import '../models/review.dart';
import '../providers/backend_provider.dart';

/// Clase auxiliar para devolver reseñas + estadísticas
class ReviewResult {
  final List<Review> reviews;
  final int totalCount;
  final double averageRating;

  ReviewResult({
    required this.reviews,
    required this.totalCount,
    required this.averageRating,
  });
}

class ReviewRepository {
  final BackendProvider _provider;

  ReviewRepository(this._provider);

  // ✅ Obtener reviews por BARCODE (no productId)
  // Alineado con ReviewController.js
  Future<ReviewResult> getProductReviews(String barcode) async {
    try {
      final response = await _provider.getProductReviews(barcode);
      
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        final meta = response.data['meta']; // Aquí están los datos estadísticos

        return ReviewResult(
          reviews: data.map((json) => Review.fromJson(json)).toList(),
          totalCount: meta != null ? (meta['totalReviews'] ?? 0) : 0,
          averageRating: meta != null ? double.parse(meta['averageRating'].toString()) : 0.0,
        );
      }
      
      return ReviewResult(reviews: [], totalCount: 0, averageRating: 0.0);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ✅ Crear Review enviando Barcode y ProductData
  // El backend se encarga de buscar el ID o crear el producto si no existe
  Future<Review> createReview({
    required String barcode, // Fundamental
    required Map<String, dynamic> productData, // {name, imageUrl, brand}
    required int rating,
    required String comment,
  }) async {
    try {
      // Usamos createOrUpdateReview del provider
      final response = await _provider.createOrUpdateReview({
        'barcode': barcode,
        'productData': productData,
        'rating': rating,
        'comment': comment,
      });
      
      if (response.data['success'] == true) {
        return Review.fromJson(response.data['data']);
      } else {
        throw Exception(response.data['error'] ?? 'Error al publicar reseña');
      }
    } catch (e) {
      throw _handleError(e);
    }
  }

  /* 
  // ⚠️ COMENTADO: El backend actual no tiene endpoint de Likes implementado.
  // Si lo necesitas, avísame para crear el servicio en Node.js primero.
  Future<bool> likeReview(String reviewId) async {
    try {
      final response = await _provider.likeReview(reviewId);
      return response.data['success'] ?? false;
    } catch (e) {
      return false;
    }
  } 
  */

  Future<bool> deleteReview(String reviewId) async {
    try {
      final response = await _provider.deleteReview(reviewId);
      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? 'No se pudo eliminar');
      }
      return true;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Helper de errores limpio
  Exception _handleError(dynamic e) {
    if (e is DioException) {
      return Exception(e.message);
    }
    return Exception(e.toString().replaceAll('Exception: ', ''));
  }
}