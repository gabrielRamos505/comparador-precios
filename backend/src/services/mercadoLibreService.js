const axios = require('axios');

class MercadoLibreService {
    constructor() {
        // Perú: MLM (México), MLA (Argentina), MLB (Brasil), MCO (Colombia)
        this.siteId = 'MLM'; // Cambiar según país
        this.baseUrl = 'https://api.mercadolibre.com';
    }

    async searchByBarcode(barcode) {
        try {
            // Buscar por código de barras
            const response = await axios.get(
                `${this.baseUrl}/sites/${this.siteId}/search`,
                {
                    params: {
                        q: barcode,
                        limit: 10,
                    },
                }
            );

            if (response.data.results && response.data.results.length > 0) {
                return response.data.results.map(item => this._formatProduct(item));
            }

            return [];
        } catch (error) {
            console.error('Error fetching from Mercado Libre:', error.message);
            return [];
        }
    }

    async searchByName(productName) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/sites/${this.siteId}/search`,
                {
                    params: {
                        q: productName,
                        limit: 10,
                    },
                }
            );

            if (response.data.results && response.data.results.length > 0) {
                return response.data.results.map(item => this._formatProduct(item));
            }

            return [];
        } catch (error) {
            console.error('Error searching Mercado Libre:', error.message);
            return [];
        }
    }

    _formatProduct(item) {
        return {
            id: item.id,
            platform: 'Mercado Libre',
            name: item.title,
            price: item.price,
            currency: item.currency_id,
            shipping: item.shipping?.free_shipping ? 0 : 5.0, // Estimado
            url: item.permalink,
            imageUrl: item.thumbnail,
            condition: item.condition,
            available: item.available_quantity > 0,
            seller: item.seller?.nickname || 'Vendedor',
            rating: item.seller?.seller_reputation?.level_id || null,
        };
    }

    async getItemDetails(itemId) {
        try {
            const response = await axios.get(`${this.baseUrl}/items/${itemId}`);
            return this._formatProduct(response.data);
        } catch (error) {
            console.error('Error getting item details:', error.message);
            return null;
        }
    }
}

module.exports = new MercadoLibreService();
