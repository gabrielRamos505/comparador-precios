const priceAlertService = require('../services/priceAlertService');

class PriceAlertController {
    async getUserAlerts(req, res) {
        try {
            const userId = req.query.userId || '1'; // TODO: Obtener del token JWT
            const activeOnly = req.query.activeOnly === 'true';

            const alerts = await priceAlertService.getUserAlerts(userId, activeOnly);

            res.json({
                success: true,
                data: alerts,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async createAlert(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { productData, barcode, platform, targetPrice } = req.body;

            if (!targetPrice || targetPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Target price must be greater than 0',
                });
            }

            const alert = await priceAlertService.createAlert(
                userId,
                productData,
                barcode,
                platform,
                targetPrice
            );

            res.status(201).json({
                success: true,
                message: 'Price alert created',
                data: alert,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async updateAlertPrice(req, res) {
        try {
            const { alertId } = req.params;
            const { currentPrice } = req.body;

            if (!currentPrice || currentPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Current price must be greater than 0',
                });
            }

            const alert = await priceAlertService.updateAlertPrice(alertId, currentPrice);

            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }

            res.json({
                success: true,
                message: alert.notified ? 'Alert triggered!' : 'Price updated',
                data: alert,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async deactivateAlert(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { alertId } = req.params;

            const deactivated = await priceAlertService.deactivateAlert(userId, alertId);

            if (!deactivated) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }

            res.json({
                success: true,
                message: 'Alert deactivated',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async deleteAlert(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { alertId } = req.params;

            const deleted = await priceAlertService.deleteAlert(userId, alertId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }

            res.json({
                success: true,
                message: 'Alert deleted',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}

module.exports = new PriceAlertController();
