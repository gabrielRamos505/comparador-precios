const SearchHistory = require('../models/SearchHistory');
const Product = require('../models/Product');

class HistoryService {

    // ✅ Agregar al historial (Con manejo seguro de productos)
    async addSearchHistory(userId, productInfo, barcode = null) {
        try {
            if (!userId) return null;

            // Si no hay barcode (búsqueda por texto vaga), generamos uno temporal
            // Nota: Para búsquedas de IA, asegúrate de pasar el 'temporaryBarcode' generado en el controlador
            const productBarcode = barcode || `TEMP-${Date.now()}`;

            // 1. Buscar o Crear Producto (Atomicidad)
            const [product, created] = await Product.findOrCreate({
                where: { barcode: productBarcode },
                defaults: {
                    name: productInfo.name,
                    brand: productInfo.brand || null,
                    image_url: productInfo.imageUrl || null,
                    category: productInfo.category || 'General'
                }
            });

            // 2. Actualizar imagen si antes no tenía y ahora sí
            if (!created && productInfo.imageUrl && !product.image_url) {
                product.image_url = productInfo.imageUrl;
                await product.save();
            }

            // 3. Crear registro en historial
            // No usamos findOrCreate aquí porque queremos guardar CADA búsqueda, incluso si es repetida
            // para saber "cuándo" lo buscó por última vez.
            const history = await SearchHistory.create({
                user_id: userId,
                product_id: product.id,
                barcode: productBarcode
            });

            console.log(`✅ History saved for user ${userId}: ${product.name}`);
            return history;

        } catch (error) {
            console.error('❌ Error adding to history:', error.message);
            // No lanzamos error para no detener el flujo principal (la búsqueda de precios)
            return null;
        }
    }

    // ✅ Obtener historial con PAGINACIÓN
    async getUserHistory(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const { count, rows } = await SearchHistory.findAndCountAll({
                where: { user_id: userId },
                include: [{
                    model: Product,
                    as: 'Product',
                    attributes: ['id', 'barcode', 'name', 'brand', 'image_url', 'category']
                }],
                // Usamos 'searched_at' porque así lo definiste en tu modelo
                order: [['searched_at', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Mapeamos para enviar un JSON limpio al frontend
            const mappedHistory = rows.map(h => ({
                id: h.id,
                searchedAt: h.searched_at,
                barcode: h.barcode,
                product: {
                    name: h.Product?.name || 'Desconocido',
                    brand: h.Product?.brand,
                    image: h.Product?.image_url,
                    category: h.Product?.category
                }
            }));

            return {
                total: count,
                history: mappedHistory
            };

        } catch (error) {
            console.error('❌ Error getting history:', error);
            throw error;
        }
    }

    async deleteHistoryItem(userId, historyId) {
        try {
            const deleted = await SearchHistory.destroy({
                where: {
                    id: historyId,
                    user_id: userId // Aseguramos que solo borre SU propio historial
                }
            });

            return deleted > 0;
        } catch (error) {
            console.error('❌ Error deleting history item:', error);
            throw error;
        }
    }

    async clearHistory(userId) {
        try {
            const deleted = await SearchHistory.destroy({
                where: { user_id: userId }
            });

            console.log(`✅ Cleared ${deleted} history items for user ${userId}`);
            return deleted;
        } catch (error) {
            console.error('❌ Error clearing history:', error);
            throw error;
        }
    }
}

module.exports = new HistoryService();