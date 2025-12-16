const historyService = require('../services/historyService');

class HistoryController {
    async getUserHistory(req, res) {
        try {
            const userId = req.query.userId || '1'; // TODO: Obtener del token JWT
            const limit = parseInt(req.query.limit) || 20;

            const history = await historyService.getUserHistory(userId, limit);

            res.json({
                success: true,
                data: history,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async deleteHistoryItem(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { historyId } = req.params;

            const deleted = await historyService.deleteHistoryItem(userId, historyId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'History item not found',
                });
            }

            res.json({
                success: true,
                message: 'History item deleted',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async clearHistory(req, res) {
        try {
            const userId = req.query.userId || '1';

            await historyService.clearHistory(userId);

            res.json({
                success: true,
                message: 'History cleared',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}

module.exports = new HistoryController();
