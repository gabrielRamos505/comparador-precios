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
    // BÚSQUEDA POR CÓDIGO DE BARRAS (CON FALLBACK DE IA)
    // ---------------------------------------------------------
    async searchByBarcode(barcode, userId = null, imageBase64 = null) {
        console.log(`🔍 Searching for barcode: ${barcode}`);

        try {
            let productInfo = null;

            // 1. Intentar con OpenFoodFacts (Alimentos)
            // Solo si el barcode no parece ser un ID temporal de IA
            if (barcode && !barcode.startsWith('AI-')) {
                productInfo = await openFoodFactsService.getProductByBarcode(barcode);
            }

            // 2. Fallback 1: Si no está en OFF, intentar con IA (Si hay imagen disponible)
            if (!productInfo && imageBase64) {
                console.log('   🔄 OFF falló. Intentando identificar con IA Gemini...');
                const aiResult = await aiService.identifyProduct(imageBase64);

                if (aiResult && aiResult.name) {
                    productInfo = {
                        id: aiResult.id,
                        barcode: barcode,
                        name: aiResult.name,
                        brand: aiResult.brand,
                        imageUrl: aiResult.imageUrl,
                        source: 'IA Vision Fallback'
                    };
                }
            }

            // 3. Fallback 2: Si aún no hay info, buscar en Google/Amazon (Objetos)
            if (!productInfo) {
                console.log('   ⚠️ No identificado por OFF ni IA. Intentando Fallback Web...');

                const fallbackResults = await serpApiService.searchAllPlatforms(barcode);

                if (fallbackResults && fallbackResults.length > 0) {
                    const bestMatch = fallbackResults[0];
                    productInfo = {
                        id: barcode,
                        barcode: barcode,
                        name: bestMatch.name,
                        brand: bestMatch.platform,
                        imageUrl: bestMatch.imageUrl,
                        source: 'Web Search Fallback'
                    };
                } else {
                    // Intento final con Amazon Scraper directo
                    try {
                        const amazonScraper = require('./amazonScraperService');
                        const amazonResults = await amazonScraper.searchProduct(barcode);
                        if (amazonResults && amazonResults.length > 0) {
                            const bestMatch = amazonResults[0];
                            productInfo = {
                                id: barcode,
                                barcode: barcode,
                                name: bestMatch.name,
                                brand: 'Amazon',
                                imageUrl: bestMatch.imageUrl,
                                source: 'Amazon Fallback'
                            };
                        }
                    } catch (e) {
                        console.error('   ❌ Amazon Fallback falló');
                    }
                }
            }

            if (!productInfo) {
                throw new Error('No se pudo identificar el producto con ninguna de las herramientas (OFF, IA, Web).');
            }

            console.log(`📦 Product identified: ${productInfo.name} via ${productInfo.source}`);

            // 4. Buscar precios usando el nombre identificado
            const priceResults = await this.searchPricesByName(productInfo.name);

            // 5. Guardar historial si hay usuario
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
    // BÚSQUEDA POR IMAGEN (IA DIRECTA)
    // ---------------------------------------------------------
    async searchByImage(imageBase64, userId = null) {
        try {
            console.log('📸 AI: Analizando imagen...');
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult || !aiResult.name) {
                console.warn('⚠️ AI could not identify product');
                return { product: null, prices: [] };
            }

            console.log(`🔍 AI: Identificado como "${aiResult.name}"`);

            const prices = await this.searchPricesByName(aiResult.name);

            return {
                product: {
                    name: aiResult.name,
                    brand: aiResult.brand,
                    barcode: aiResult.barcode,
                    source: aiResult.source,
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
                if (result.value && result.value.length > 0) {
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

        // ✅ VALIDAR URLs
        const validatedPrices = this.validateUrls(uniquePrices, productName);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`💰 RESULTADO FINAL: ${validatedPrices.length} opciones encontradas`);

        if (validatedPrices.length > 0) {
            const minPrice = validatedPrices[0].price;
            const maxPrice = validatedPrices[validatedPrices.length - 1].price;
            console.log(`💵 Mejor Precio: S/ ${minPrice.toFixed(2)}`);
            console.log(`📈 Precio Máximo: S/ ${maxPrice.toFixed(2)}`);
        }
        console.log(`${'='.repeat(60)}\n`);

        return validatedPrices;
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

    validateUrls(products, searchQuery) {
        return products.map(product => {
            if (!product.url ||
                product.url === 'null' ||
                product.url === 'undefined' ||
                !product.url.startsWith('http')) {

                const encodedQuery = encodeURIComponent(searchQuery);
                const storeUrls = {
                    'Metro': `https://www.metro.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`,
                    'Plaza Vea': `https://www.plazavea.com.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`,
                    'Wong': `https://www.wong.pe/${encodedQuery}?_q=${encodedQuery}&map=ft`,
                    'Tottus': `https://www.tottus.com.pe/tottus-pe/buscar?Ntt=${encodedQuery}`,
                    'Google Shopping': `https://www.google.com/search?q=${encodedQuery}+precio+peru&tbm=shop`,
                    'Mercado Libre': `https://listado.mercadolibre.com.pe/${encodedQuery.replace(/%20/g, '-')}`
                };

                product.url = storeUrls[product.platform] || `https://www.google.com/search?q=${encodedQuery}+${product.platform}+peru`;
            }
            return product;
        }).filter(p => p.url && p.url.startsWith('http'));
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
        const stores = [
            { name: 'Metro', scraper: metroScraper },
            { name: 'Plaza Vea', scraper: plazaVeaScraper },
            { name: 'Wong', scraper: wongScraper },
            { name: 'Tottus', scraper: tottusScraper }
        ];

        try {
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
                    if (outcome.products && outcome.products.length > 0) {
                        console.log(`      ✅ ${outcome.store}: ${outcome.products.length} encontrados`);
                        results.push(...outcome.products);
                    }
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