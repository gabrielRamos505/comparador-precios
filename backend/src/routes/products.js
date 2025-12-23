const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const { optionalAuth, authMiddleware } = require('../middleware/authMiddleware');

// Configuración de Multer para subida de imágenes
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo imágenes permitidas'), false);
    }
});

// ✅ BÚSQUEDA POR CÓDIGO DE BARRAS (MODIFICADO A POST)
// Ahora es POST para que Flutter pueda enviar { "image": "base64..." } en el body
// si el escaneo de código de barras necesita el respaldo de la IA.
router.post('/barcode/:barcode', optionalAuth, productController.searchByBarcode);

// ✅ BÚSQUEDA POR TEXTO (Ej: "Coca Cola")
router.get('/search', optionalAuth, productController.searchByName);

// ✅ BÚSQUEDA POR IMAGEN (Identificación directa por IA)
router.post('/identify', optionalAuth, upload.single('image'), productController.searchByImage);

// ✅ HISTORIAL DE PRECIOS (Gráfica)
router.get('/history/price/:barcode', productController.getPriceHistory);

module.exports = router;