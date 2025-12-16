const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// GET /api/history - Obtener historial del usuario
router.get('/', historyController.getUserHistory);

// DELETE /api/history/:historyId - Eliminar item del historial
router.delete('/:historyId', historyController.deleteHistoryItem);

// DELETE /api/history - Limpiar todo el historial
router.delete('/', historyController.clearHistory);

module.exports = router;
