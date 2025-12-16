const favoriteService = require('../services/favoriteService');

class FavoriteController {
    // GET /api/favorites - Obtener todos los favoritos del usuario
    async getUserFavorites(req, res) {
        try {
            const userId = req.query.userId || '1'; // TODO: Obtener del token JWT

            console.log(`📋 Getting favorites for user ${userId}`);

            const favorites = await favoriteService.getUserFavorites(userId);

            console.log(`✅ Found ${favorites.length} favorites`);

            res.json({
                success: true,
                data: favorites,
            });
        } catch (error) {
            console.error('❌ Error in getUserFavorites:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    // POST /api/favorites - Agregar producto a favoritos
    async addFavorite(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { productData, barcode } = req.body;

            console.log(`⭐ Adding favorite for user ${userId}, barcode: ${barcode}`);

            // Validar datos requeridos
            if (!productData || !barcode) {
                return res.status(400).json({
                    success: false,
                    error: 'productData and barcode are required',
                });
            }

            const result = await favoriteService.addFavorite(userId, productData, barcode);

            console.log(`✅ Favorite ${result.isNew ? 'added' : 'already exists'}`);

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                message: result.isNew ? 'Added to favorites' : 'Already in favorites',
                data: result.favorite,
                isNew: result.isNew,
            });
        } catch (error) {
            console.error('❌ Error in addFavorite:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    // DELETE /api/favorites/:productId - Eliminar producto de favoritos
    async removeFavorite(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { productId } = req.params;

            console.log(`🗑️  Removing favorite for user ${userId}, product: ${productId}`);

            const deleted = await favoriteService.removeFavorite(userId, productId);

            if (!deleted) {
                console.log('⚠️  Favorite not found');
                return res.status(404).json({
                    success: false,
                    error: 'Favorite not found',
                });
            }

            console.log('✅ Favorite removed');

            res.json({
                success: true,
                message: 'Removed from favorites',
            });
        } catch (error) {
            console.error('❌ Error in removeFavorite:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    // GET /api/favorites/check/:productId - Verificar si un producto es favorito
    async checkFavorite(req, res) {
        try {
            const userId = req.query.userId || '1';
            const { productId } = req.params;

            console.log(`🔍 Checking if product ${productId} is favorite for user ${userId}`);

            const isFavorite = await favoriteService.isFavorite(userId, productId);

            console.log(`${isFavorite ? '⭐' : '☆'} Product ${isFavorite ? 'IS' : 'IS NOT'} favorite`);

            res.json({
                success: true,
                isFavorite: isFavorite,
            });
        } catch (error) {
            console.error('❌ Error in checkFavorite:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                isFavorite: false, // Default a false en caso de error
            });
        }
    }
}

module.exports = new FavoriteController();
