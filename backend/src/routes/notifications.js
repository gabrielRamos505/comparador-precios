const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ Todas las rutas de notificaciones requieren autenticación
router.use(authMiddleware);

// GET /api/notifications - Obtener notificaciones del usuario
router.get('/', notificationController.getUserNotifications);

// PUT /api/notifications/:notificationId/read - Marcar una como leída
router.put('/:notificationId/read', notificationController.markAsRead);

// PUT /api/notifications/read-all - Marcar todas como leídas
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
