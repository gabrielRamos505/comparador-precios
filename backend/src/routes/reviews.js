const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ GET /api/reviews/product/:barcode 
// (Cambiado de productId a barcode para facilitar al frontend)
router.get('/product/:barcode', reviewController.getProductReviews);

// Rutas protegidas
router.use(authMiddleware);

router.get('/user', reviewController.getUserReviews);
router.post('/', reviewController.createOrUpdateReview);
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;