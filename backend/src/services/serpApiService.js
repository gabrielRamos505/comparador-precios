const SerpApi = require('google-search-results-nodejs');

class SerpApiService {
    constructor() {
        this.apiKey = process.env.SERPAPI_KEY;
        if (this.apiKey) {
            this.search = new SerpApi.GoogleSearch(this.apiKey);
            console.log(`🔑 SerpAPI Key configured: YES ✅`);
        } else {
            console.log(`🔑 SerpAPI Key configured: NO ❌ (Se omitirá este servicio)`);
        }
    }

    async searchAllPlatforms(productName) {
        if (!this.apiKey) return [];

        try {
            // Limpieza básica para Google
            const cleanQuery = productName
                .toLowerCase()
                .replace(/\b(botella|lata|pack|caja|bolsa)\b/g, '')
                .trim();

            console.log(`🌐 SerpAPI: Buscando "${cleanQuery}" en Google Shopping...`);

            const params = {
                engine: "google_shopping",
                q: cleanQuery,
                // ❌ ELIMINADO: gl: "pe" causaba el crash
                // gl: "pe", 
                hl: "es-419",
                location: "Lima, Lima Region, Peru", // ✅ Esto es suficiente para ubicar precios en Perú
                google_domain: "google.com.pe",
                num: 10
            };

            const results = await this._makeRequest(params);

            if (!results || results.length === 0) {
                console.log('   ⚠️ SerpAPI: Sin resultados');
                return [];
            }

            const formattedResults = results.map(item => ({
                id: item.product_id || `gs-${Math.random().toString(36).substr(2, 9)}`,
                platform: item.source || 'Google Shopping',
                name: item.title,
                price: this._extractPrice(item),
                currency: 'PEN',
                url: item.link,
                imageUrl: item.thumbnail,
                shipping: 0,
                available: true
            }));

            const validResults = formattedResults.filter(p => p.price > 0);

            console.log(`   ✅ SerpAPI: ${validResults.length} resultados`);
            return validResults;

        } catch (error) {
            // Logueamos el error pero NO dejamos que tumbe el servidor
            console.error(`   ⚠️ SerpAPI Error Controlado: ${error.message}`);
            return [];
        }
    }

    _makeRequest(params) {
        return new Promise((resolve, reject) => {
            try {
                // 🛡️ ENVOLVEMOS EN TRY-CATCH PARA EVITAR CRASH DEL SERVIDOR
                this.search.json(params, (data) => {
                    // Verificamos si data existe, a veces la librería falla sin devolver data
                    if (!data) {
                        return resolve([]);
                    }

                    if (data.error) {
                        // Si SerpAPI devuelve error, lo capturamos suavemente
                        console.warn(`   ⚠️ SerpAPI API Response: ${data.error}`);
                        return resolve([]);
                    } else if (data.shopping_results) {
                        resolve(data.shopping_results);
                    } else {
                        resolve([]);
                    }
                });
            } catch (libError) {
                // Si la librería lanza una excepción síncrona
                console.error(`   ❌ SerpAPI Lib Error: ${libError.message}`);
                resolve([]);
            }
        });
    }

    _extractPrice(item) {
        if (item.extracted_price) return item.extracted_price;
        if (item.price) {
            const clean = item.price.toString().replace(/[^\d.]/g, '');
            return parseFloat(clean) || 0;
        }
        return 0;
    }
}

module.exports = new SerpApiService();