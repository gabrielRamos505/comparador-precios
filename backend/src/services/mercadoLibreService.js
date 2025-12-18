const axios = require('axios');

class MercadoLibreService {
    constructor() {
        this.siteId = 'MPE'; // Perú
        this.baseUrl = 'https://api.mercadolibre.com';
        this.lastRequestTime = 0;
    }

    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = 2000; // Subimos a 2 segundos para evitar bloqueo

        if (timeSinceLastRequest < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    cleanProductName(productName) {
        // ❌ NO BORRAR NÚMEROS: Son vitales para diferenciar "625ml" de "20L"
        const stopWords = [
            'sin', 'con', 'x', 'pack', 'unidad', 'unidades', 'botella', 'lata',
            'envase', 'frasco', 'bolsa', 'caja', 'gas', 'oferta', 'promo'
        ];

        // Normalizar texto
        let clean = productName.toLowerCase()
            .replace(/[^\w\s.]/g, ' ') // Permitir puntos para decimales (1.5L)
            .replace(/\s+/g, ' ');

        const words = clean.split(' ');

        // Filtramos palabras vacías, pero MANTENEMOS números y unidades (ml, lt, kg)
        const relevantWords = words.filter(word => {
            const isStopWord = stopWords.includes(word);
            const isShort = word.length < 2; // Permitir "3l", "1kg"
            const isNumber = /\d/.test(word); // Si tiene número, es importante
            return (!isStopWord && !isShort) || isNumber;
        });

        // Tomamos las primeras 4 palabras relevantes
        return relevantWords.slice(0, 4).join(' ');
    }

    async searchByName(productName) {
        await this.rateLimit();

        try {
            const cleanQuery = this.cleanProductName(productName);

            if (cleanQuery.length < 2) {
                console.log('      ⚠️ Mercado Libre: Query muy corto');
                return [];
            }

            console.log(`   🛒 Buscando en Mercado Libre: "${cleanQuery}"`);

            const response = await axios.get(
                `${this.baseUrl}/sites/${this.siteId}/search`,
                {
                    params: {
                        q: cleanQuery,
                        limit: 15,
                        condition: 'new',
                        sort: 'price_asc'
                    },
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        // Headers importantes para evitar 403
                        'Referer': 'https://www.mercadolibre.com.pe/',
                        'x-format-new': 'true'
                    }
                }
            );

            if (!response.data || !response.data.results || response.data.results.length === 0) {
                console.log('      ⚠️ Mercado Libre: Sin resultados');
                return [];
            }

            // Filtrado inteligente: Validar que el título contenga al menos una palabra clave numérica si la hay
            const queryHasNumber = /\d/.test(cleanQuery);
            const results = response.data.results.filter(item => {
                if (!queryHasNumber) return true;
                // Si busco "625ml", el resultado debe tener algún número
                return /\d/.test(item.title);
            });

            const formattedProducts = results
                .slice(0, 8)
                .map(item => this._formatProduct(item));

            if (formattedProducts.length > 0) {
                const minPrice = Math.min(...formattedProducts.map(p => p.price));
                console.log(`      ✅ Mercado Libre: ${formattedProducts.length} productos (desde S/ ${minPrice.toFixed(2)})`);
            } else {
                console.log('      ⚠️ Mercado Libre: Resultados no relevantes');
            }

            return formattedProducts;

        } catch (error) {
            // Manejo específico del bloqueo
            if (error.response?.status === 403) {
                console.error('      ❌ Mercado Libre: API Bloqueada temporalmente (403).');
            } else {
                console.error(`      ❌ Mercado Libre Error: ${error.message}`);
            }
            return [];
        }
    }

    _formatProduct(item) {
        // Lógica mejorada para imágenes HD
        let imageUrl = item.thumbnail;
        if (item.thumbnail) {
            // Convertir thumbnail (I.jpg) a imagen grande (O.jpg)
            imageUrl = item.thumbnail.replace(/-I\.jpg$/i, '-O.jpg');
            // Asegurar HTTPS
            if (imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');
            }
        }

        return {
            name: item.title,
            price: item.price,
            currency: item.currency_id,
            platform: 'Mercado Libre',
            url: item.permalink,
            imageUrl: imageUrl,
            available: true,
            shipping: item.shipping?.free_shipping ? 0 : 10
        };
    }
}

module.exports = new MercadoLibreService();