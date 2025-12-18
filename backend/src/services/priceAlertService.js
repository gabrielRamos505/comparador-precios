const PriceAlert = require('../models/PriceAlert');
const Product = require('../models/Product');
const notificationService = require('./notificationService'); // ✅ Conexión con notificaciones

class PriceAlertService {

    async getUserAlerts(userId, activeOnly = false, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const whereClause = { user_id: userId };

            if (activeOnly) {
                whereClause.status = 'active';
            }

            const { count, rows } = await PriceAlert.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Product,
                    as: 'Product',
                    attributes: ['id', 'name', 'image_url', 'barcode']
                }],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            return { total: count, alerts: rows };
        } catch (error) {
            console.error('Error getting user alerts:', error);
            throw error;
        }
    }

    async createAlert({ userId, productData, barcode, platform, targetPrice, currentPrice }) {
        try {
            // 1. Asegurar que el producto existe
            const [product] = await Product.findOrCreate({
                where: { barcode },
                defaults: {
                    name: productData.name,
                    image_url: productData.imageUrl,
                    brand: productData.brand,
                    category: 'General'
                }
            });

            // 2. Verificar si ya existe una alerta ACTIVA para este producto/tienda
            const existingAlert = await PriceAlert.findOne({
                where: {
                    user_id: userId,
                    product_id: product.id,
                    platform: platform,
                    status: 'active'
                }
            });

            if (existingAlert) {
                throw new Error(`Ya tienes una alerta activa para este producto en ${platform}`);
            }

            // 3. Crear Alerta
            const alert = await PriceAlert.create({
                user_id: userId,
                product_id: product.id,
                platform: platform,
                target_price: targetPrice,
                initial_price: currentPrice || targetPrice, // Precio original de referencia
                status: 'active'
            });

            return alert;

        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    /**
     * ✅ Lógica central: Verificar si el nuevo precio activa la alerta
     */
    async checkAndTriggerAlert(alertId, newPrice) {
        try {
            const alert = await PriceAlert.findByPk(alertId, {
                include: [{ model: Product, as: 'Product' }]
            });

            if (!alert) return null;

            // Si el nuevo precio es menor o igual al objetivo
            if (newPrice <= alert.target_price) {

                // 1. Actualizar estado
                alert.status = 'triggered';
                await alert.save();

                // 2. 🔔 ENVIAR NOTIFICACIÓN AL USUARIO
                const title = `¡Bajada de precio! 📉`;
                const message = `El producto "${alert.Product.name}" ha bajado a S/ ${newPrice} en ${alert.platform}. ¡Aprovecha ahora!`;

                await notificationService.createNotification(
                    alert.user_id,
                    title,
                    message,
                    'price_drop'
                );

                console.log(`✅ Alerta disparada para usuario ${alert.user_id}`);
                return { triggered: true, alert };
            }

            return { triggered: false, alert };

        } catch (error) {
            console.error('Error checking alert:', error);
            throw error;
        }
    }

    async deleteAlert(userId, alertId) {
        const deleted = await PriceAlert.destroy({
            where: { id: alertId, user_id: userId }
        });
        return deleted > 0;
    }
}

module.exports = new PriceAlertService();