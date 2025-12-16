const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

// ⭐ Rutas específicas PRIMERO (antes de rutas con parámetros)
// GET /api/favorites/check/:productId - Verificar si es favorito
router.get('/check/:productId', favoriteController.checkFavorite);

// GET /api/favorites - Obtener favoritos del usuario
router.get('/', favoriteController.getUserFavorites);

// POST /api/favorites - Agregar a favoritos
router.post('/', favoriteController.addFavorite);

// DELETE /api/favorites/:productId - Eliminar de favoritos
router.delete('/:productId', favoriteController.removeFavorite);

module.exports = router;
