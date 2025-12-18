const notificationService = require('../services/notificationService');

class NotificationController {

    // ✅ Obtener notificaciones con PAGINACIÓN
    async getUserNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const onlyUnread = req.query.unread === 'true';

            // Paginación por defecto
            let page = parseInt(req.query.page);
            let limit = parseInt(req.query.limit);

            if (isNaN(page) || page < 1) page = 1;
            if (isNaN(limit) || limit < 1) limit = 20;

            const result = await notificationService.getUserNotifications(userId, onlyUnread, page, limit);

            res.json({
                success: true,
                data: result.notifications,
                meta: {
                    totalItems: result.total,
                    unreadCount: result.unreadCount, // Dato útil para el icono de campana 🔔
                    currentPage: page,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ success: false, error: 'Error al obtener notificaciones' });
        }
    }

    async markAsRead(req, res) {
        try {
            const userId = req.user.userId;
            const { notificationId } = req.params;

            if (!notificationId) {
                return res.status(400).json({ success: false, error: 'ID de notificación requerido' });
            }

            const success = await notificationService.markAsRead(userId, notificationId);

            if (!success) {
                return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
            }

            res.json({ success: true, message: 'Notificación marcada como leída' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async markAllAsRead(req, res) {
        try {
            const userId = req.user.userId;
            await notificationService.markAllAsRead(userId);

            res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // (Opcional) Eliminar notificación
    async deleteNotification(req, res) {
        try {
            const userId = req.user.userId;
            const { notificationId } = req.params;

            const success = await notificationService.deleteNotification(userId, notificationId);

            if (!success) return res.status(404).json({ success: false, error: 'No encontrada' });

            res.json({ success: true, message: 'Notificación eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new NotificationController();