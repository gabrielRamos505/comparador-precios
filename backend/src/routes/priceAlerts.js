const express = require('express');
const router = express.Router();
const priceAlertController = require('../controllers/priceAlertController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Validar que el controlador tenga las funciones necesarias antes de asignar la ruta
// Esto evita el error "argument handler must be a function"
if (!priceAlertController.getUserAlerts || !priceAlertController.createAlert) {
    console.error("❌ ERROR CRÍTICO: Funciones faltantes en priceAlertController");
}

// Rutas de Usuario (Protegidas)
router.get('/', authMiddleware, priceAlertController.getUserAlerts);
router.post('/', authMiddleware, priceAlertController.createAlert);
router.delete('/:alertId', authMiddleware, priceAlertController.deleteAlert);

// ✅ CORRECCIÓN: Usamos deactivateAlert que definimos arriba
// Si antes tenías updateAlertPrice y ya no la usas, bórrala o asegúrate de que exista en el controller
router.put('/:alertId/deactivate', authMiddleware, priceAlertController.deactivateAlert);

// Ruta para el Scraper (Actualizar precio)
// Asegúrate de que checkPriceUpdate exista en el controller
router.put('/:alertId/check-price', priceAlertController.checkPriceUpdate);

module.exports = router;