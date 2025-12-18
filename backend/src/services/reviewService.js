const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const { sequelize } = require('../models/Review'); // Para funciones de agregación

class ReviewService {

    async getProductReviews(barcode, page = 1, limit = 10) {
        try {
            // 1. Buscar el producto por barcode
            const product = await Product.findOne({ where: { barcode } });

            if (!product) {
                throw new Error('Product not found');
            }

            const offset = (page - 1) * limit;

            // 2. Obtener reviews paginadas
            const { count, rows } = await Review.findAndCountAll({
                where: { product_id: product.id },
                include: [{
                    model: User,
                    as: 'User',
                    attributes: ['id', 'name'] // Solo mostramos el nombre del usuario
                }],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            // 3. Calcular promedio de estrellas (Rating)
            const aggregation = await Review.findAll({
                where: { product_id: product.id },
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']
                ],
                raw: true
            });

            const averageRating = aggregation[0]?.avgRating || 0;

            return {
                total: count,
                reviews: rows,
                averageRating: parseFloat(averageRating)
            };

        } catch (error) {
            throw error;
        }
    }

    async getUserReviews(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const { count, rows } = await Review.findAndCountAll({
            where: { user_id: userId },
            include: [{
                model: Product,
                as: 'Product',
                attributes: ['id', 'name', 'barcode', 'image_url']
            }],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        return { total: count, reviews: rows };
    }

    async createOrUpdateReview({ userId, productData, barcode, rating, comment }) {
        // 1. Asegurar que el producto existe
        const [product] = await Product.findOrCreate({
            where: { barcode },
            defaults: {
                name: productData?.name || 'Producto desconocido',
                image_url: productData?.imageUrl,
                brand: productData?.brand,
                category: 'General'
            }
        });

        // 2. Buscar si el usuario ya opinó sobre este producto
        const existingReview = await Review.findOne({
            where: {
                user_id: userId,
                product_id: product.id
            }
        });

        if (existingReview) {
            // ACTUALIZAR
            existingReview.rating = rating;
            existingReview.comment = comment;
            await existingReview.save();
            return { isNew: false, review: existingReview };
        } else {
            // CREAR
            const newReview = await Review.create({
                user_id: userId,
                product_id: product.id,
                rating,
                comment
            });
            return { isNew: true, review: newReview };
        }
    }

    async deleteReview(userId, reviewId) {
        const deleted = await Review.destroy({
            where: {
                id: reviewId,
                user_id: userId // Seguridad: solo el dueño borra
            }
        });
        return deleted > 0;
    }
}

module.exports = new ReviewService();