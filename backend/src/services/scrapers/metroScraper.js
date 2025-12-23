const axios = require('axios');

class MetroScraper {
    constructor() {
        this.baseUrl = 'https://www.metro.pe/api/catalog_system/pub/products/search';
    }

    async searchProducts(query) {
        try {
            console.log(`   🏬 (API) Buscando en Metro: "${query}"`);

            // Limpiar query para URL
            const encodedQuery = encodeURIComponent(query);
            const url = `${this.baseUrl}/${encodedQuery}`;

            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.metro.pe/',
                }
            });

            if (!response.data || !Array.isArray(response.data)) {
                console.log(`      ⚠️ Metro: Respuesta no válida o vacía`);
                return [];
            }

            // Mapeamos la respuesta VTEX a nuestro formato
            const products = response.data.map(item => {
                const seller = item.items[0]?.sellers[0]?.commertialOffer;
                if (!seller || !seller.AvailableQuantity) return null;

                // ✅ FIX CRÍTICO: Manejo correcto de URLs
                let link = item.link;
                if (link) {
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                        // Ya tiene protocolo completo, usar tal cual
                        // NO hacer nada
                    } else if (link.startsWith('/')) {
                        // Es ruta relativa con barra inicial: "/producto/abc"
                        link = `https://www.metro.pe${link}`;
                    } else {
                        // Es ruta relativa sin barra: "producto/abc"
                        link = `https://www.metro.pe/${link}`;
                    }
                } else {
                    // Si no tiene link, generar URL de búsqueda
                    link = `https://www.metro.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`;
                }

                return {
                    id: item.productId,
                    platform: 'Metro',
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
                console.log(`      ✅ Metro: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Metro: Sin resultados`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Metro Error (API): ${error.message}`);
            return [];
        }
    }
}

module.exports = new MetroScraper();