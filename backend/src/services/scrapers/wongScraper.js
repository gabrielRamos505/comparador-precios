const axios = require('axios');

class WongScraper {
    constructor() {
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
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

                // ✅ FIX CRÍTICO: Manejo correcto de URLs
                let link = item.link;
                if (link) {
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                        // Ya tiene protocolo completo
                        // NO hacer nada
                    } else if (link.startsWith('/')) {
                        // Es ruta relativa con barra inicial
                        link = `https://www.wong.pe${link}`;
                    } else {
                        // Es ruta relativa sin barra
                        link = `https://www.wong.pe/${link}`;
                    }
                } else {
                    // Si no tiene link, generar URL de búsqueda
                    link = `https://www.wong.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`;
                }

                return {
                    id: item.productId || `wong-${Date.now()}-${Math.random()}`,
                    platform: 'Wong',
                    name: item.productName,
                    price: price,
                    currency: 'PEN',
                    url: link, // ✅ URL ya procesada correctamente
                    imageUrl: item.items[0]?.images[0]?.imageUrl,
                    shipping: 0,
                    available: true,
                };
            }).filter(item => item.price > 0);

            if (products.length > 0) {
                console.log(`      ✅ Wong: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Wong: Sin productos con precio válido`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Wong Error (API): ${error.message}`);
            return [];
        }
    }
}

module.exports = new WongScraper();