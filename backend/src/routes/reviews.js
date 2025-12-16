const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// GET /api/reviews/product/:productId - Obtener reviews de un producto
router.get('/product/:productId', reviewController.getProductReviews);

// GET /api/reviews/user - Obtener reviews del usuario
router.get('/user', reviewController.getUserReviews);

// POST /api/reviews - Crear o actualizar review
router.post('/', reviewController.createOrUpdateReview);

// DELETE /api/reviews/:reviewId - Eliminar review
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;
