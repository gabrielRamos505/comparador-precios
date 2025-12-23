const axios = require('axios');

class PlazaVeaScraper {
    constructor() {
        this.baseUrl = 'https://www.plazavea.com.pe/api/catalog_system/pub/products/search';
    }

    async searchProducts(query) {
        try {
            console.log(`   🏬 (API) Buscando en Plaza Vea: "${query}"`);

            const encodedQuery = encodeURIComponent(query);
            const url = `${this.baseUrl}/${encodedQuery}`;

            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.plazavea.com.pe/',
                    'Origin': 'https://www.plazavea.com.pe',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.data || !Array.isArray(response.data)) {
                console.log(`      ⚠️ Plaza Vea: Respuesta vacía o inválida`);
                return [];
            }

            const products = response.data.map(item => {
                const seller = item.items[0]?.sellers[0]?.commertialOffer;
                if (!seller || !seller.AvailableQuantity) return null;

                // ✅ FIX CRÍTICO: Manejo correcto de URLs
                let link = item.link;
                if (link) {
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                        // Ya tiene protocolo completo
                        // NO hacer nada
                    } else if (link.startsWith('/')) {
                        // Es ruta relativa con barra inicial
                        link = `https://www.plazavea.com.pe${link}`;
                    } else {
                        // Es ruta relativa sin barra
                        link = `https://www.plazavea.com.pe/${link}`;
                    }
                } else {
                    // Si no tiene link, generar URL de búsqueda
                    link = `https://www.plazavea.com.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`;
                }

                return {
                    id: item.productId,
                    platform: 'Plaza Vea',
                    name: item.productName,
                    price: seller.Price,
                    currency: 'PEN',
                    url: link, // ✅ URL ya procesada correctamente
                    imageUrl: item.items[0]?.images[0]?.imageUrl,
                    shipping: 0,
                    available: true,
                };
            }).filter(item => item !== null);

            if (products.length > 0) {
                console.log(`      ✅ Plaza Vea: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Plaza Vea: Sin resultados`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Plaza Vea Error (API): ${error.message}`);
            return [];
        }
    }
}

module.exports = new PlazaVeaScraper();