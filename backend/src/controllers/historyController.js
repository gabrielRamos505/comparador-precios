const historyService = require('../services/historyService');

class HistoryController {

    // Obtener historial con Paginación completa
    async getUserHistory(req, res) {
        try {
            const userId = req.user.userId;

            // 1. Validación y Defaults para paginación
            let page = parseInt(req.query.page);
            let limit = parseInt(req.query.limit);

            // Asegurar que sean números positivos válidos
            if (isNaN(page) || page < 1) page = 1;
            if (isNaN(limit) || limit < 1) limit = 20;
            if (limit > 50) limit = 50; // Evitar que pidan 1 millón de registros

            // 2. Llamar al servicio (asumiendo que devuelve { items, total })
            const result = await historyService.getUserHistory(userId, page, limit);

            // 3. Respuesta con Metadatos (Estándar de API)
            res.json({
                success: true,
                data: result.history, // Array de historial
                meta: {
                    totalItems: result.total,
                    currentPage: page,
                    itemsPerPage: limit,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error getting history:', error);
            res.status(500).json({ success: false, error: 'Error al obtener el historial' });
        }
    }

    async deleteHistoryItem(req, res) {
        try {
            const userId = req.user.userId;
            const { historyId } = req.params;

            // 1. Validación básica
            if (!historyId) {
                return res.status(400).json({ success: false, error: 'ID de historial requerido' });
            }

            const deleted = await historyService.deleteHistoryItem(userId, historyId);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Elemento no encontrado o no te pertenece' });
            }

            res.json({ success: true, message: 'Elemento eliminado correctamente' });

        } catch (error) {
            console.error('Error deleting history item:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar elemento' });
        }
    }

    async clearHistory(req, res) {
        try {
            const userId = req.user.userId;

            await historyService.clearHistory(userId);

            res.json({ success: true, message: 'Historial borrado completamente' });

        } catch (error) {
            console.error('Error clearing history:', error);
            res.status(500).json({ success: false, error: 'Error al limpiar el historial' });
        }
    }
}

module.exports = new HistoryController();