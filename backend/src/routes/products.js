const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ✅ RUTA DUAL (La que usa el AISearchScreen ahora)
router.post('/identify-dual', optionalAuth, productController.identifyDual);

// ✅ TUS RUTAS ORIGINALES (Se mantienen intactas)
router.post('/barcode/:barcode', optionalAuth, productController.searchByBarcode);
router.get('/search', optionalAuth, productController.searchByName);
router.post('/identify', optionalAuth, upload.single('image'), productController.searchByImage);
router.get('/history/price/:barcode', productController.getPriceHistory);

module.exports = router;