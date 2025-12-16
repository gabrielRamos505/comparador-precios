const { PriceAlert, Product } = require('../models');

class PriceAlertService {
    // Crear alerta de precio
    async createAlert(userId, productData, barcode, platform, targetPrice) {
        try {
            // 1. Buscar o crear el producto
            let product = await Product.findOne({ where: { barcode } });

            if (!product) {
                product = await Product.create({
                    barcode: productData.barcode || barcode,
                    name: productData.name,
                    brand: productData.brand,
                    category: productData.category,
                    image_url: productData.imageUrl,
                    description: productData.description,
                });
            }

            // 2. Crear alerta
            const alert = await PriceAlert.create({
                user_id: userId,
                product_id: product.id,
                platform: platform,
                target_price: targetPrice,
                current_price: null,
                is_active: true,
                notified: false,
            });

            return alert;
        } catch (error) {
            console.error('Error creating price alert:', error);
            throw error;
        }
    }

    // Obtener alertas del usuario
    async getUserAlerts(userId, activeOnly = false) {
        try {
            const where = { user_id: userId };
            if (activeOnly) {
                where.is_active = true;
            }

            const alerts = await PriceAlert.findAll({
                where,
                include: [
                    {
                        model: Product,
                        attributes: ['id', 'barcode', 'name', 'brand', 'image_url'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return alerts;
        } catch (error) {
            console.error('Error getting alerts:', error);
            throw error;
        }
    }

    // Actualizar precio actual de la alerta
    async updateAlertPrice(alertId, currentPrice) {
        try {
            const alert = await PriceAlert.findByPk(alertId);

            if (!alert) {
                return null;
            }

            alert.current_price = currentPrice;

            // Si el precio actual es menor o igual al objetivo, notificar
            if (currentPrice <= alert.target_price && !alert.notified) {
                alert.notified = true;
                console.log(`🔔 Price alert triggered for alert ${alertId}`);
            }

            await alert.save();
            return alert;
        } catch (error) {
            console.error('Error updating alert price:', error);
            throw error;
        }
    }

    // Desactivar alerta
    async deactivateAlert(userId, alertId) {
        try {
            const alert = await PriceAlert.findOne({
                where: {
                    id: alertId,
                    user_id: userId,
                },
            });

            if (!alert) {
                return false;
            }

            alert.is_active = false;
            await alert.save();

            return true;
        } catch (error) {
            console.error('Error deactivating alert:', error);
            throw error;
        }
    }

    // Eliminar alerta
    async deleteAlert(userId, alertId) {
        try {
            const deleted = await PriceAlert.destroy({
                where: {
                    id: alertId,
                    user_id: userId,
                },
            });

            return deleted > 0;
        } catch (error) {
            console.error('Error deleting alert:', error);
            throw error;
        }
    }
}

module.exports = new PriceAlertService();
