const priceAlertService = require('../services/priceAlertService');

class PriceAlertController {

    // GET: Obtener alertas
    async getUserAlerts(req, res) {
        try {
            const userId = req.user.userId;
            const activeOnly = req.query.activeOnly === 'true';

            let page = parseInt(req.query.page) || 1;
            let limit = parseInt(req.query.limit) || 20;

            const result = await priceAlertService.getUserAlerts(userId, activeOnly, page, limit);

            res.json({
                success: true,
                data: result.alerts,
                meta: {
                    total: result.total,
                    page,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error getting alerts:', error);
            res.status(500).json({ success: false, error: 'Error al obtener alertas' });
        }
    }

    // POST: Crear alerta
    async createAlert(req, res) {
        try {
            const userId = req.user.userId;
            const { productData, barcode, platform, targetPrice, currentPrice } = req.body;

            if (!targetPrice || targetPrice <= 0) {
                return res.status(400).json({ success: false, error: 'Precio objetivo inválido' });
            }

            const alert = await priceAlertService.createAlert({
                userId, productData, barcode, platform, targetPrice, currentPrice
            });

            res.status(201).json({ success: true, message: 'Alerta creada', data: alert });

        } catch (error) {
            if (error.message.includes('ya existe')) return res.status(409).json({ success: false, error: error.message });
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT: Desactivar alerta (ESTA ES LA QUE PROBABLEMENTE FALTABA)
    async deactivateAlert(req, res) {
        try {
            const userId = req.user.userId;
            const { alertId } = req.params;

            // En el servicio simplemente cambiamos status a 'inactive'
            // Ojo: Si tu servicio no tiene este método, usa deleteAlert o impleméntalo
            const success = await priceAlertService.deleteAlert(userId, alertId); // Reusamos delete por ahora si no tienes deactivate

            if (!success) return res.status(404).json({ success: false, error: 'Alerta no encontrada' });

            res.json({ success: true, message: 'Alerta desactivada/eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PUT: Checkear precio (Para el scraper)
    async checkPriceUpdate(req, res) {
        try {
            const { alertId } = req.params;
            const { newPrice } = req.body;

            const result = await priceAlertService.checkAndTriggerAlert(alertId, newPrice);
            if (!result) return res.status(404).json({ error: 'Alerta no encontrada' });

            res.json({ success: true, triggered: result.triggered });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // DELETE: Eliminar
    async deleteAlert(req, res) {
        try {
            const userId = req.user.userId;
            const { alertId } = req.params;
            const deleted = await priceAlertService.deleteAlert(userId, alertId);
            if (!deleted) return res.status(404).json({ success: false, error: 'No encontrado' });
            res.json({ success: true, message: 'Eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new PriceAlertController();