const { Review, Product, User } = require('../models');
const { Op } = require('sequelize');

class ReviewService {
    // Crear o actualizar review
    async createOrUpdateReview(userId, productData, barcode, rating, comment) {
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

            // 2. Buscar review existente
            let review = await Review.findOne({
                where: {
                    user_id: userId,
                    product_id: product.id,
                },
            });

            if (review) {
                // Actualizar
                review.rating = rating;
                review.comment = comment;
                await review.save();
                return { review, isNew: false };
            } else {
                // Crear
                review = await Review.create({
                    user_id: userId,
                    product_id: product.id,
                    rating: rating,
                    comment: comment,
                });
                return { review, isNew: true };
            }
        } catch (error) {
            console.error('Error creating/updating review:', error);
            throw error;
        }
    }

    // Obtener reviews de un producto
    async getProductReviews(productId) {
        try {
            const reviews = await Review.findAll({
                where: { product_id: productId },
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return reviews;
        } catch (error) {
            console.error('Error getting product reviews:', error);
            throw error;
        }
    }

    // Obtener reviews del usuario
    async getUserReviews(userId) {
        try {
            const reviews = await Review.findAll({
                where: { user_id: userId },
                include: [
                    {
                        model: Product,
                        attributes: ['id', 'barcode', 'name', 'brand', 'image_url'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return reviews;
        } catch (error) {
            console.error('Error getting user reviews:', error);
            throw error;
        }
    }

    // Obtener promedio de calificación de un producto
    async getProductAverageRating(productId) {
        try {
            const reviews = await Review.findAll({
                where: { product_id: productId },
                attributes: ['rating'],
            });

            if (reviews.length === 0) {
                return { average: 0, count: 0 };
            }

            const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
            const average = sum / reviews.length;

            return {
                average: Math.round(average * 10) / 10, // 1 decimal
                count: reviews.length,
            };
        } catch (error) {
            console.error('Error getting average rating:', error);
            throw error;
        }
    }

    // Eliminar review
    async deleteReview(userId, reviewId) {
        try {
            const deleted = await Review.destroy({
                where: {
                    id: reviewId,
                    user_id: userId,
                },
            });

            return deleted > 0;
        } catch (error) {
            console.error('Error deleting review:', error);
            throw error;
        }
    }
}

module.exports = new ReviewService();
