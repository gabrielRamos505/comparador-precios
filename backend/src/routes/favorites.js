const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ Aplicar middleware a todas las rutas
router.use(authMiddleware);

// POST /api/favorites - Agregar a favoritos
router.post('/', favoriteController.addFavorite);

// GET /api/favorites - Obtener favoritos del usuario
router.get('/', favoriteController.getUserFavorites);

// DELETE /api/favorites/:barcode - Eliminar de favoritos
router.delete('/:barcode', favoriteController.removeFavorite);

// GET /api/favorites/:barcode/check - Verificar si está en favoritos
router.get('/:barcode/check', favoriteController.checkFavorite);

module.exports = router;
