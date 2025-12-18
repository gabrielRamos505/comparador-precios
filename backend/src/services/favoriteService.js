const Favorite = require('../models/Favorite');
const Product = require('../models/Product');

class FavoriteService {

    // ✅ Optimizado con Paginación
    async getUserFavorites(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const { count, rows } = await Favorite.findAndCountAll({
                where: { user_id: userId },
                include: [{
                    model: Product,
                    as: 'Product',
                    attributes: ['id', 'barcode', 'name', 'image_url', 'category']
                }],
                limit: limit,
                offset: offset,
                // ⚠️ CAMBIO CLAVE AQUÍ: Usar 'added_at' en lugar de 'createdAt'
                order: [['added_at', 'DESC']]
            });

            const mappedFavorites = rows.map(fav => ({
                id: fav.id,
                barcode: fav.Product?.barcode,
                productName: fav.Product?.name || 'Producto desconocido',
                imageUrl: fav.Product?.image_url,
                category: fav.Product?.category,
                productId: fav.product_id,
                addedAt: fav.added_at // ✅ Coincide con tu modelo
            }));

            return {
                total: count,
                favorites: mappedFavorites
            };

        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    }

    async addFavorite({ userId, barcode, name, imageUrl, brand, price }) {
        try {
            // 1. Gestión del Producto (Atomicidad)
            // Usamos findOrCreate para evitar que se cree doble si dos usuarios lo agregan a la vez
            const [product, createdProduct] = await Product.findOrCreate({
                where: { barcode },
                defaults: {
                    name,
                    image_url: imageUrl || null,
                    category: 'General',
                    brand: brand || null
                }
            });

            // Si el producto ya existía pero no tenía imagen y ahora sí traemos una, actualizamos
            if (!createdProduct && imageUrl && !product.image_url) {
                product.image_url = imageUrl;
                await product.save();
            }

            // 2. Gestión del Favorito
            // Usamos findOrCreate para evitar error de Unique Constraint si el usuario hace doble clic
            const [favorite, createdFavorite] = await Favorite.findOrCreate({
                where: {
                    user_id: userId,
                    product_id: product.id
                }
            });

            // Si no se creó, significa que ya existía
            if (!createdFavorite) {
                const error = new Error('El producto ya está en favoritos');
                error.code = 'DUPLICATE_ENTRY'; // Código para que el Controller sepa qué responder
                throw error;
            }

            return {
                id: favorite.id,
                barcode: product.barcode,
                productName: product.name,
                imageUrl: product.image_url,
                addedAt: favorite.created_at
            };

        } catch (error) {
            console.error('Error adding favorite:', error);
            throw error;
        }
    }

    async removeFavorite(userId, barcode) {
        try {
            // Buscamos producto primero
            const product = await Product.findOne({ where: { barcode } });

            if (!product) return false;

            const deleted = await Favorite.destroy({
                where: {
                    user_id: userId,
                    product_id: product.id
                }
            });

            return deleted > 0;
        } catch (error) {
            console.error('Error removing favorite:', error);
            throw error;
        }
    }

    async isFavorite(userId, barcode) {
        try {
            const product = await Product.findOne({ where: { barcode } });
            if (!product) return false;

            const count = await Favorite.count({
                where: {
                    user_id: userId,
                    product_id: product.id
                }
            });

            return count > 0;
        } catch (error) {
            console.error('Error checking favorite:', error);
            throw error;
        }
    }
}

module.exports = new FavoriteService();