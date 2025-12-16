const reviewService = require('../services/reviewService');

class ReviewController {
    async getProductReviews(req, res) {
        try {
            const { productId } = req.params;

            const reviews = await reviewService.getProductReviews(productId);
            const rating = await reviewService.getProductAverageRating(productId);

            res.json({
                success: true,
                data: {
                    reviews: reviews,
                    averageRating: rating.average,
                    reviewCount: rating.count,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async getUserReviews(req, res) {
        try {
            const userId = req.query.userId || '1'; // TODO: Obtener del token JWT

            const reviews = await reviewService.getUserReviews(userId);

            res.json({
                success: true,
                data: reviews,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async createOrUpdateReview(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { productData, barcode, rating, comment } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Rating must be between 1 and 5',
                });
            }

            const result = await reviewService.createOrUpdateReview(
                userId,
                productData,
                barcode,
                rating,
                comment
            );

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                message: result.isNew ? 'Review created' : 'Review updated',
                data: result.review,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async deleteReview(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { reviewId } = req.params;

            const deleted = await reviewService.deleteReview(userId, reviewId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Review not found',
                });
            }

            res.json({
                success: true,
                message: 'Review deleted',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}

module.exports = new ReviewController();
