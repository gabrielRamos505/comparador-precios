const { SearchHistory, Product, User } = require('../models');

class HistoryService {
    // Guardar búsqueda en el historial
    async addSearchHistory(userId, productData, barcode) {
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

            // 2. Crear registro de historial
            const history = await SearchHistory.create({
                user_id: userId,
                product_id: product.id,
                barcode: barcode,
            });

            return history;
        } catch (error) {
            console.error('Error adding search history:', error);
            throw error;
        }
    }

    // Obtener historial del usuario
    async getUserHistory(userId, limit = 20) {
        try {
            const history = await SearchHistory.findAll({
                where: { user_id: userId },
                include: [
                    {
                        model: Product,
                        attributes: ['id', 'barcode', 'name', 'brand', 'image_url'],
                    },
                ],
                order: [['searched_at', 'DESC']],
                limit: limit,
            });

            return history;
        } catch (error) {
            console.error('Error getting user history:', error);
            throw error;
        }
    }

    // Eliminar del historial
    async deleteHistoryItem(userId, historyId) {
        try {
            const deleted = await SearchHistory.destroy({
                where: {
                    id: historyId,
                    user_id: userId,
                },
            });

            return deleted > 0;
        } catch (error) {
            console.error('Error deleting history item:', error);
            throw error;
        }
    }

    // Limpiar todo el historial
    async clearHistory(userId) {
        try {
            await SearchHistory.destroy({
                where: { user_id: userId },
            });

            return true;
        } catch (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    }
}

module.exports = new HistoryService();
