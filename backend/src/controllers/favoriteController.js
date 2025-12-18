const FavoriteService = require('../services/favoriteService');

class FavoriteController {

    // Obtener favoritos (Con paginación opcional)
    async getUserFavorites(req, res) {
        try {
            const userId = req.user.userId;
            // Paginación por defecto: página 1, 20 items
            const { page = 1, limit = 20 } = req.query;

            const result = await FavoriteService.getUserFavorites(userId, parseInt(page), parseInt(limit));

            // Estructura de respuesta paginada estándar
            res.json({
                success: true,
                data: result.favorites,
                meta: {
                    total: result.total,
                    page: parseInt(page),
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error getting favorites:', error);
            res.status(500).json({ success: false, error: 'Error al obtener favoritos' });
        }
    }

    // Agregar a favoritos
    async addFavorite(req, res) {
        try {
            const userId = req.user.userId;
            // Extraemos más campos útiles si vienen del frontend (marca, precio actual)
            const { barcode, name, imageUrl, brand, price } = req.body;

            if (!barcode || !name) {
                return res.status(400).json({ success: false, error: 'Barcode y nombre son requeridos' });
            }

            const favorite = await FavoriteService.addFavorite({
                userId,
                barcode,
                name,
                imageUrl,
                brand,
                price
            });

            res.status(201).json({ // 201 = Created
                success: true,
                message: 'Producto añadido a favoritos',
                data: favorite
            });

        } catch (error) {
            // Manejo robusto de errores
            // Asumimos que el servicio lanza un error con código o mensaje específico
            if (error.message.includes('ya existe') || error.code === 'DUPLICATE_ENTRY') {
                return res.status(409).json({ // 409 = Conflict
                    success: false,
                    error: 'El producto ya está en tus favoritos'
                });
            }

            console.error('Error adding favorite:', error);
            res.status(500).json({ success: false, error: 'Error interno al agregar favorito' });
        }
    }

    // Eliminar de favoritos
    async removeFavorite(req, res) {
        try {
            const userId = req.user.userId;
            const { barcode } = req.params;

            if (!barcode) return res.status(400).json({ success: false, error: 'Barcode requerido' });

            const deleted = await FavoriteService.removeFavorite(userId, barcode);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'El producto no estaba en favoritos' });
            }

            res.json({ success: true, message: 'Producto eliminado de favoritos' });

        } catch (error) {
            console.error('Error removing favorite:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar favorito' });
        }
    }

    // Verificar estado (útil para pintar el corazón lleno o vacío en el frontend)
    async checkFavorite(req, res) {
        try {
            const userId = req.user.userId;
            const { barcode } = req.params;

            if (!barcode) return res.status(400).json({ error: 'Barcode requerido' });

            const isFavorite = await FavoriteService.isFavorite(userId, barcode);

            res.json({ success: true, isFavorite });

        } catch (error) {
            console.error('Error checking favorite:', error);
            res.status(500).json({ success: false, error: 'Error al verificar estado' });
        }
    }
}

module.exports = new FavoriteController();