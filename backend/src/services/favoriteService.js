const { Favorite, Product } = require('../models');

class FavoriteService {
    // Agregar a favoritos
    async addFavorite(userId, productData, barcode) {
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

            // 2. Verificar si ya existe en favoritos
            const existing = await Favorite.findOne({
                where: {
                    user_id: userId,
                    product_id: product.id,
                },
            });

            if (existing) {
                return { favorite: existing, isNew: false };
            }

            // 3. Crear favorito
            const favorite = await Favorite.create({
                user_id: userId,
                product_id: product.id,
            });

            return { favorite, isNew: true };
        } catch (error) {
            console.error('Error adding favorite:', error);
            throw error;
        }
    }

    // Obtener favoritos del usuario
    async getUserFavorites(userId) {
        try {
            const favorites = await Favorite.findAll({
                where: { user_id: userId },
                include: [
                    {
                        model: Product,
                        attributes: ['id', 'barcode', 'name', 'brand', 'image_url', 'category'],
                    },
                ],
                order: [['added_at', 'DESC']],
            });

            return favorites;
        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    }

    // Eliminar de favoritos
    async removeFavorite(userId, productId) {
        try {
            const deleted = await Favorite.destroy({
                where: {
                    user_id: userId,
                    product_id: productId,
                },
            });

            return deleted > 0;
        } catch (error) {
            console.error('Error removing favorite:', error);
            throw error;
        }
    }

    // Verificar si un producto es favorito
    async isFavorite(userId, productId) {
        try {
            const favorite = await Favorite.findOne({
                where: {
                    user_id: userId,
                    product_id: productId,
                },
            });

            return favorite !== null;
        } catch (error) {
            console.error('Error checking favorite:', error);
            return false;
        }
    }
}

module.exports = new FavoriteService();
