const express = require('express');
const router = express.Router();
const priceAlertController = require('../controllers/priceAlertController');

// GET /api/price-alerts - Obtener alertas del usuario
router.get('/', priceAlertController.getUserAlerts);

// POST /api/price-alerts - Crear alerta de precio
router.post('/', priceAlertController.createAlert);

// PUT /api/price-alerts/:alertId/price - Actualizar precio actual
router.put('/:alertId/price', priceAlertController.updateAlertPrice);

// PUT /api/price-alerts/:alertId/deactivate - Desactivar alerta
router.put('/:alertId/deactivate', priceAlertController.deactivateAlert);

// DELETE /api/price-alerts/:alertId - Eliminar alerta
router.delete('/:alertId', priceAlertController.deleteAlert);

module.exports = router;
