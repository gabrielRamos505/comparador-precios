const openFoodFactsService = require('./openFoodFactsService');
const serpApiService = require('./serpApiService');
const mercadoLibreService = require('./mercadoLibreService');


// Importar Scrapers
const plazaVeaScraper = require('./scrapers/plazaVeaScraper');
const wongScraper = require('./scrapers/wongScraper');
const metroScraper = require('./scrapers/metroScraper');
const tottusScraper = require('./scrapers/tottusScraper');
const historyService = require('./historyService');
const aiService = require('./aiService');


class ProductAggregatorService {

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (Método público principal)
    // ---------------------------------------------------------
    async searchByName(productName, options = {}) {
        console.log(`🔍 SearchByName called for: "${productName}"`);

        try {
            // Delegar a searchPricesByName que tiene toda la lógica
            const prices = await this.searchPricesByName(productName);

            // Retornamos directamente el array para compatibilidad con Flutter (List<dynamic>)
            return prices;
        } catch (error) {
            console.error(`❌ Error in searchByName: ${error.message}`);
            return {
                success: false,
                productName: productName,
                totalResults: 0,
                prices: [],
                error: error.message
            };
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR CÓDIGO DE BARRAS
    // ---------------------------------------------------------
    async searchByBarcode(barcode, userId = null) {
        console.log(`🔍 Searching for barcode: ${barcode}`);

        try {
            // 1. Intentar con OpenFoodFacts (Alimentos)
            let productInfo = await openFoodFactsService.getProductByBarcode(barcode);

            // 2. Fallback: Si no es alimento, buscar en Google/Amazon (Objetos)
            if (!productInfo) {
                console.log('   ⚠️ No encontrado en OpenFoodFacts. Intentando fallback (Objetos)...');

                // Intentamos buscar el código en Google Shopping/Amazon a través de SerpAPI
                // A veces Google reconoce el código y devuelve el producto
                const fallbackResults = await serpApiService.searchAllPlatforms(barcode);

                if (fallbackResults && fallbackResults.length > 0) {
                    // Tomamos el primer resultado como la "identificación" del producto
                    const bestMatch = fallbackResults[0];
                    console.log(`   ✅ Identificado por Fallback: "${bestMatch.name}"`);

                    productInfo = {
                        id: barcode,
                        barcode: barcode,
                        name: bestMatch.name,
                        brand: bestMatch.platform, // Usamos la tienda como "brand" temporal
                        imageUrl: bestMatch.imageUrl,
                        source: 'Web Search Fallback'
                    };
                } else {
                    // Intento final con Amazon Scraper directo si SerpAPI falla
                    const amazonResults = await require('./amazonScraperService').searchProduct(barcode);
                    if (amazonResults && amazonResults.length > 0) {
                        const bestMatch = amazonResults[0];
                        console.log(`   ✅ Identificado por Amazon: "${bestMatch.name}"`);
                        productInfo = {
                            id: barcode,
                            barcode: barcode,
                            name: bestMatch.name,
                            brand: 'Amazon',
                            imageUrl: bestMatch.imageUrl,
                            source: 'Amazon Fallback'
                        };
                    }
                }
            }

            if (!productInfo) {
                throw new Error('Producto no encontrado en ninguna base de datos (OFF, Google, Amazon)');
            }

            console.log(`📦 Product identified: ${productInfo.name} (${productInfo.brand || 'Marca desconocida'})`);

            // 3. Buscar precios usando el nombre identificado
            const priceResults = await this.searchPricesByName(productInfo.name);

            // 4. Guardar historial si hay usuario
            if (userId) {
                historyService.addSearchHistory(userId, productInfo, barcode).catch(e =>
                    console.error('   ⚠️ Error guardando historial:', e.message)
                );
            }

            return {
                product: productInfo,
                prices: priceResults,
            };

        } catch (error) {
            console.error(`❌ Error en searchByBarcode: ${error.message}`);
            throw error;
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR IMAGEN (IA)
    // ---------------------------------------------------------
    async searchByImage(imageBase64, userId = null) {
        try {
            console.log('📸 AI: Analizando imagen...');
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult.success || !aiResult.productName) {
                console.warn('⚠️ AI could not identify product');
                return { product: null, prices: [] };
            }

            console.log(`🔍 AI: Identificado como "${aiResult.productName}" (${aiResult.confidence}%)`);

            const prices = await this.searchPricesByName(aiResult.productName);

            return {
                product: {
                    name: aiResult.productName,
                    barcode: null,
                    confidence: aiResult.confidence,
                    imageUrl: aiResult.imageUrl || null
                },
                prices: prices,
            };
        } catch (error) {
            console.error('❌ AI Search Error:', error.message);
            throw error;
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (LÓGICA CENTRAL INTERNA)
    // ---------------------------------------------------------
    async searchPricesByName(productName) {
        const allPrices = [];
        const errors = [];

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔍 INICIANDO BÚSQUEDA AGREGADA: "${productName}"`);
        console.log(`${'='.repeat(60)}\n`);

        const results = await Promise.allSettled([
            this.searchMercadoLibre(productName),
            this.searchSerpAPI(productName),
            this.searchPeruvianStores(productName)
        ]);

        results.forEach((result, index) => {
            const sources = ['Mercado Libre', 'SerpAPI', 'Tiendas Peruanas'];
            const sourceName = sources[index];

            if (result.status === 'fulfilled') {
                if (result.value.length > 0) {
                    allPrices.push(...result.value);
                }
            } else {
                errors.push({ platform: sourceName, error: result.reason.message });
            }
        });

        if (errors.length > 0) {
            console.log('\n⚠️ Reporte de errores en servicios:');
            errors.forEach(err => console.log(`   - ${err.platform}: ${err.error}`));
        }

        allPrices.sort((a, b) => a.price - b.price);
        const uniquePrices = this.removeDuplicates(allPrices);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`💰 RESULTADO FINAL: ${uniquePrices.length} opciones encontradas`);

        if (uniquePrices.length > 0) {
            const minPrice = uniquePrices[0].price;
            const maxPrice = uniquePrices[uniquePrices.length - 1].price;
            const bestStore = uniquePrices[0].platform;
            console.log(`💵 Mejor Precio: S/ ${minPrice.toFixed(2)} en ${bestStore}`);
            console.log(`📈 Precio Máximo: S/ ${maxPrice.toFixed(2)}`);
        } else {
            console.log(`⚠️ No se encontraron precios disponibles.`);
        }
        console.log(`${'='.repeat(60)}\n`);

        return uniquePrices;
    }

    removeDuplicates(products) {
        const uniqueMap = new Map();

        products.forEach(item => {
            const key = item.url ? item.url : `${item.platform}-${item.name.toLowerCase().trim()}`;

            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        });

        return Array.from(uniqueMap.values());
    }

    async searchMercadoLibre(productName) {
        try {
            console.log(`🛒 [1/3] Consultando Mercado Libre...`);
            const results = await mercadoLibreService.searchByName(productName);
            return results || [];
        } catch (error) {
            console.error(`   ❌ ML Error: ${error.message}`);
            return [];
        }
    }

    async searchSerpAPI(productName) {
        try {
            console.log(`🌐 [2/3] Consultando Google Shopping...`);
            const results = await serpApiService.searchAllPlatforms(productName);
            return results || [];
        } catch (error) {
            console.error(`   ❌ SerpAPI Error: ${error.message}`);
            return [];
        }
    }

    async searchPeruvianStores(productName) {
        console.log(`🇵🇪 [3/3] Iniciando scraping de supermercados...`);

        const startTime = Date.now();
        const results = [];

        // Definimos las tiendas y sus scrapers
        const stores = [
            { name: 'Metro', scraper: metroScraper },
            { name: 'Plaza Vea', scraper: plazaVeaScraper },
            { name: 'Wong', scraper: wongScraper },
            { name: 'Tottus', scraper: tottusScraper }
        ];

        try {
            // PROMISE.ALL: Ejecutamos TODOS en paralelo
            // Metro/PV consumen 0 CPU (API). Wong/Tottus consumen CPU (Puppeteer).
            // Esto reduce el tiempo total de Suma(Tiempos) a Max(Tiempos).
            const promises = stores.map(store =>
                store.scraper.searchProducts(productName)
                    .then(products => ({
                        status: 'fulfilled',
                        store: store.name,
                        products: products
                    }))
                    .catch(error => ({
                        status: 'rejected',
                        store: store.name,
                        error: error.message
                    }))
            );

            const outcomes = await Promise.all(promises);

            outcomes.forEach(outcome => {
                if (outcome.status === 'fulfilled') {
                    if (outcome.products.length > 0) {
                        console.log(`      ✅ ${outcome.store}: ${outcome.products.length} encontrados`);
                        results.push(...outcome.products);
                    } else {
                        console.log(`      ⚠️ ${outcome.store}: Sin resultados`);
                    }
                } else {
                    console.error(`      ❌ Error en ${outcome.store}: ${outcome.error}`);
                }
            });

        } catch (error) {
            console.error('❌ Error crítico en scraping paralelo:', error);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ⏱️ Scraping finalizado en ${duration}s. Total items: ${results.length}`);

        return results;
    }
}


module.exports = new ProductAggregatorService();
