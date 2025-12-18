const reviewService = require('../services/reviewService');

class ReviewController {

    // ✅ Obtener reviews por CÓDIGO DE BARRAS (con paginación)
    async getProductReviews(req, res) {
        try {
            const { barcode } = req.params; // Usamos barcode en vez de ID interno
            let page = parseInt(req.query.page) || 1;
            let limit = parseInt(req.query.limit) || 10; // Reviews suelen ser textos largos, mejor traer pocos

            // El servicio se encarga de buscar el producto por barcode primero
            const result = await reviewService.getProductReviews(barcode, page, limit);

            res.json({
                success: true,
                data: result.reviews,
                meta: {
                    averageRating: parseFloat(result.averageRating).toFixed(1), // Ej: "4.5"
                    totalReviews: result.total,
                    page,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error getting reviews:', error);
            // Si el producto no existe aún, devolvemos array vacío en vez de error 500
            if (error.message === 'Product not found') {
                return res.json({
                    success: true,
                    data: [],
                    meta: { averageRating: 0, totalReviews: 0, page: 1, totalPages: 0 }
                });
            }
            res.status(500).json({ success: false, error: 'Error al obtener reseñas' });
        }
    }

    // ✅ Obtener reviews hechas por el usuario (Mi Historial de Opiniones)
    async getUserReviews(req, res) {
        try {
            const userId = req.user.userId;
            let page = parseInt(req.query.page) || 1;
            let limit = parseInt(req.query.limit) || 10;

            const result = await reviewService.getUserReviews(userId, page, limit);

            res.json({
                success: true,
                data: result.reviews,
                meta: {
                    total: result.total,
                    page,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async createOrUpdateReview(req, res) {
        try {
            const userId = req.user.userId;
            const { productData, barcode, rating, comment } = req.body;

            // Validaciones
            if (!barcode) return res.status(400).json({ error: 'Barcode requerido' });
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ success: false, error: 'La calificación debe ser entre 1 y 5 estrellas' });
            }

            const result = await reviewService.createOrUpdateReview({
                userId,
                productData, // Objeto { name, imageUrl, brand } para crear producto si no existe
                barcode,
                rating,
                comment
            });

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                message: result.isNew ? 'Reseña publicada' : 'Reseña actualizada',
                data: result.review,
            });

        } catch (error) {
            console.error('Error saving review:', error);
            res.status(500).json({ success: false, error: 'Error al guardar la reseña' });
        }
    }

    async deleteReview(req, res) {
        try {
            const userId = req.user.userId;
            const { reviewId } = req.params;

            const deleted = await reviewService.deleteReview(userId, reviewId);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Reseña no encontrada o no tienes permiso' });
            }

            res.json({ success: true, message: 'Reseña eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ReviewController();