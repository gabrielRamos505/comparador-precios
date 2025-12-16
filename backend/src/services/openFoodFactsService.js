const axios = require('axios');

class OpenFoodFactsService {
    constructor() {
        this.baseUrl = 'https://world.openfoodfacts.org/api/v2';
    }

    async getProductByBarcode(barcode) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/product/${barcode}.json`,
                {
                    headers: {
                        'User-Agent': 'ComparadorRA/1.0',
                    },
                }
            );

            if (response.data.status === 1) {
                const product = response.data.product;

                return {
                    id: product.code || barcode,
                    barcode: barcode,
                    name: product.product_name || product.product_name_es || 'Producto sin nombre',
                    brand: product.brands || null,
                    category: product.categories || null,
                    imageUrl: product.image_url || product.image_front_url || null,
                    description: product.generic_name || null,
                    ingredients: product.ingredients_text || null,
                    nutritionGrade: product.nutrition_grades || null,
                    source: 'Open Food Facts',
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching from Open Food Facts:', error.message);
            return null;
        }
    }

    async searchProducts(query) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/search`,
                {
                    params: {
                        search_terms: query,
                        page_size: 10,
                        fields: 'code,product_name,brands,image_url,categories',
                    },
                    headers: {
                        'User-Agent': 'ComparadorRA/1.0',
                    },
                }
            );

            if (response.data.products) {
                return response.data.products.map(product => ({
                    id: product.code,
                    barcode: product.code,
                    name: product.product_name || 'Producto sin nombre',
                    brand: product.brands || null,
                    category: product.categories || null,
                    imageUrl: product.image_url || null,
                    source: 'Open Food Facts',
                }));
            }

            return [];
        } catch (error) {
            console.error('Error searching Open Food Facts:', error.message);
            return [];
        }
    }
}

module.exports = new OpenFoodFactsService();
