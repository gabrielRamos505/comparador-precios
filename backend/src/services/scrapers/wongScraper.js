const axios = require('axios');

class WongScraper {
    constructor() {
        // Wong usa VTEX, similar a Metro y Plaza Vea
        this.baseUrl = 'https://www.wong.pe/api/catalog_system/pub/products/search';
    }

    async searchProducts(query) {
        try {
            console.log(`   🏬 (API) Buscando en Wong: "${query}"`);

            const encodedQuery = encodeURIComponent(query);
            const url = `${this.baseUrl}/${encodedQuery}`;

            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.wong.pe/',
                    'Origin': 'https://www.wong.pe'
                }
            });

            if (!response.data || response.data.length === 0) {
                console.log(`      ⚠️ Wong: Sin resultados`);
                return [];
            }

            const products = response.data.slice(0, 10).map(item => {
                const price = item.items[0]?.sellers[0]?.commertialOffer?.Price || 0;
                const link = item.link ? `https://www.wong.pe${item.link}` : null;

                return {
                    platform: 'Wong',
                    name: item.productName,
                    price: price,
                    currency: 'PEN',
                    url: link,
                    imageUrl: item.items[0]?.images[0]?.imageUrl,
                    shipping: 0,
                    available: true,
                };
            }).filter(item => item !== null);

            if (products.length > 0) {
                console.log(`      ✅ Wong: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Wong: Sin resultados`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Wong Error (API): ${error.message}`);
            return [];
        }
    }
}

module.exports = new WongScraper();