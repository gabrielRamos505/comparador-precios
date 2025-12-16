import '../models/review.dart';
import '../providers/backend_provider.dart';

class ReviewRepository {
  final BackendProvider _backendProvider;

  ReviewRepository(this._backendProvider);

  Future<Map<String, dynamic>> getReviews(String productId) async {
    try {
      final response = await _backendProvider.getReviews(productId);
      
      if (response.data['success']) {
        final List<dynamic> data = response.data['data'];
        final reviews = data.map((json) => Review.fromJson(json)).toList();
        
        return {
          'reviews': reviews,
          'count': response.data['count'],
          'avgRating': double.parse(response.data['avgRating'] ?? '0'),
        };
      }
      
      return {'reviews': [], 'count': 0, 'avgRating': 0.0};
    } catch (e) {
      throw Exception('Error al obtener reviews: $e');
    }
  }

  Future<Review> createReview({
    required String userId,
    required String userName,
    required String productId,
    required int rating,
    required String comment,
  }) async {
    try {
      final response = await _backendProvider.createReview({
        'userId': userId,
        'userName': userName,
        'productId': productId,
        'rating': rating,
        'comment': comment,
      });
      
      if (response.data['success']) {
        return Review.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Error al crear review: $e');
    }
  }

  Future<bool> likeReview(String reviewId) async {
    try {
      final response = await _backendProvider.likeReview(reviewId);
      return response.data['success'] ?? false;
    } catch (e) {
      throw Exception('Error al dar like: $e');
    }
  }

  Future<bool> deleteReview(String reviewId) async {
    try {
      final response = await _backendProvider.deleteReview(reviewId);
      return response.data['success'] ?? false;
    } catch (e) {
      throw Exception('Error al eliminar review: $e');
    }
  }
}
