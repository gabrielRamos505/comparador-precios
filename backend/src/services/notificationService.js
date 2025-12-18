const Notification = require('../models/Notification');

class NotificationService {

    async getUserNotifications(userId, onlyUnread = false, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const whereClause = { user_id: userId };

            if (onlyUnread) {
                whereClause.is_read = false;
            }

            // 1. Obtener lista paginada
            const { count, rows } = await Notification.findAndCountAll({
                where: whereClause,
                limit: limit,
                offset: offset,
                order: [['created_at', 'DESC']]
            });

            // 2. Contar cuántas no leídas hay en total (para el badge del icono)
            const unreadCount = await Notification.count({
                where: { user_id: userId, is_read: false }
            });

            return {
                total: count,
                unreadCount: unreadCount,
                notifications: rows
            };

        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }

    async markAsRead(userId, notificationId) {
        try {
            const [updated] = await Notification.update(
                { is_read: true },
                {
                    where: {
                        id: notificationId,
                        user_id: userId // Seguridad: solo el dueño puede marcarla
                    }
                }
            );
            return updated > 0;
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            await Notification.update(
                { is_read: true },
                { where: { user_id: userId, is_read: false } }
            );
            return true;
        } catch (error) {
            console.error('Error marking all as read:', error);
            throw error;
        }
    }

    async deleteNotification(userId, notificationId) {
        try {
            const deleted = await Notification.destroy({
                where: { id: notificationId, user_id: userId }
            });
            return deleted > 0;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Método para crear notificaciones (Lo usarás desde el PriceAlertService)
    async createNotification(userId, title, message, type = 'info') {
        try {
            return await Notification.create({
                user_id: userId,
                title,
                message,
                type, // 'price_drop', 'system', 'welcome'
                is_read: false
            });
        } catch (error) {
            console.error('Error creating notification:', error);
            // No lanzamos error para no romper el flujo principal si falla una notificación
            return null;
        }
    }
}

module.exports = new NotificationService();