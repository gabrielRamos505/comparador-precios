const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products/barcode/:barcode - Buscar por código de barras
router.get('/barcode/:barcode', productController.searchByBarcode);

// GET /api/products/search?query=coca - Buscar por nombre
router.get('/search', productController.searchByName);

router.post('/identify', productController.searchByImage);

// GET /api/products/:productId/price-history - Historial de precios
router.get('/:productId/price-history', productController.getPriceHistory);

module.exports = router;


