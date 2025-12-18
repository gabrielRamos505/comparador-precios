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
            // 1. Obtener info base de OpenFoodFacts
            const productInfo = await openFoodFactsService.getProductByBarcode(barcode);

            if (!productInfo) {
                throw new Error('Producto no encontrado en OpenFoodFacts');
            }

            console.log(`📦 Product identified: ${productInfo.name} (${productInfo.brand || 'Marca desconocida'})`);

            // 2. Buscar precios usando el nombre
            const priceResults = await this.searchPricesByName(productInfo.name);

            // 3. Guardar historial si hay usuario
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

        const batch1 = [
            { name: 'Metro', scraper: metroScraper },
            { name: 'Wong', scraper: wongScraper }
        ];

        const batch2 = [
            { name: 'Plaza Vea', scraper: plazaVeaScraper },
            { name: 'Tottus', scraper: tottusScraper }
        ];

        const processBatch = async (batch) => {
            const promises = batch.map(async (store) => {
                try {
                    console.log(`   👉 Consultando ${store.name}...`);
                    const products = await store.scraper.searchProducts(productName);
                    if (products.length > 0) {
                        console.log(`      ✅ ${store.name}: ${products.length} encontrados`);
                        return products;
                    } else {
                        console.log(`      ⚠️ ${store.name}: Sin resultados`);
                        return [];
                    }
                } catch (error) {
                    console.error(`      ❌ Error en ${store.name}: ${error.message}`);
                    return [];
                }
            });
            return Promise.all(promises);
        };

        const results1 = await processBatch(batch1);
        results.push(...results1.flat());

        const results2 = await processBatch(batch2);
        results.push(...results2.flat());

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ⏱️ Scraping finalizado en ${duration}s. Total items: ${results.length}`);

        return results;
    }
}


module.exports = new ProductAggregatorService();
