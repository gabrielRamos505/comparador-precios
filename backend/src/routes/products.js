const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Configuración de Multer para subidas de archivos tradicionales
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// ---------------------------------------------------------
// 1. RUTA DE IDENTIFICACIÓN DUAL (Recomendada para Flutter)
// ---------------------------------------------------------
// Esta ruta es la más limpia para enviar JSON con {barcode, image}
router.post('/identify-dual', optionalAuth, productController.identifyDual);

// ---------------------------------------------------------
// 2. RUTA DE BARCODE (Híbrida para evitar errores 404/405)
// ---------------------------------------------------------
// .get: Búsqueda rápida solo por código (Legacy)
// .post: Búsqueda con imagen base64 en el body para respaldo de IA
router.route('/barcode/:barcode')
    .get(optionalAuth, productController.identifyDual)
    .post(optionalAuth, productController.identifyDual);

// ---------------------------------------------------------
// 3. RUTAS DE BÚSQUEDA Y SCRAPING
// ---------------------------------------------------------
// Búsqueda por texto (query string: ?query=leche)
router.get('/search', optionalAuth, productController.searchByName);

// Búsqueda por imagen (multipart/form-data o base64)
router.post('/identify', optionalAuth, upload.single('image'), productController.searchByImage);

// ---------------------------------------------------------
// 4. HISTORIAL Y ANALÍTICA
// ---------------------------------------------------------
// Obtener la evolución de precios de un producto específico
router.get('/history/price/:barcode', productController.getPriceHistory);

module.exports = router;