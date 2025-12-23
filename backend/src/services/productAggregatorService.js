const openFoodFactsService = require('./openFoodFactsService');
const serpApiService = require('./serpApiService');
const mercadoLibreService = require('./mercadoLibreService');

// Importar Scrapers
const plazaVeaScraper = require('./scrapers/plazaVeaScraper');
const wongScraper = require('./scrapers/wongScraper');
const metroScraper = require('./scrapers/metroScraper');
const tottusScraper = require('./scrapers/tottusScraper');
const amazonScraper = require('./amazonScraperService');

const historyService = require('./historyService');
const aiService = require('./aiService');

class ProductAggregatorService {

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (Método público principal)
    // ---------------------------------------------------------
    async searchByName(productName, options = {}) {
        console.log(`🔍 SearchByName llamado para: "${productName}"`);

        try {
            // Delegar a searchPricesByName que tiene toda la lógica de agregación
            const prices = await this.searchPricesByName(productName);
            return prices || [];
        } catch (error) {
            console.error(`❌ Error en searchByName: ${error.message}`);
            return [];
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR CÓDIGO DE BARRAS (CON FALLBACK DE IA MEJORADO)
    // ---------------------------------------------------------
    async searchByBarcode(barcode, userId = null, imageBase64 = null) {
        console.log(`🔍 Buscando barcode: ${barcode}`);

        try {
            let productInfo = null;

            // 1. Intentar con OpenFoodFacts (Alimentos)
            if (barcode && barcode !== 'unknown' && !barcode.startsWith('AI-')) {
                try {
                    productInfo = await openFoodFactsService.getProductByBarcode(barcode);
                    if (productInfo) {
                        console.log('✅ Producto encontrado en OpenFoodFacts');
                        // Normalizar estructura de OpenFoodFacts
                        productInfo = {
                            id: productInfo.id || barcode,
                            barcode: barcode,
                            name: productInfo.name || productInfo.product_name,
                            brand: productInfo.brand || productInfo.brands || 'Genérico',
                            category: productInfo.category || 'Alimentos',
                            imageUrl: productInfo.imageUrl || productInfo.image_url,
                            source: 'OpenFoodFacts'
                        };
                    }
                } catch (e) {
                    console.log('⚠️ OpenFoodFacts no disponible o producto no encontrado.');
                }
            }

            // 2. Fallback 1: Si no está en OFF, intentar con IA (Si hay imagen)
            if (!productInfo && imageBase64) {
                console.log('🔄 Barcode no encontrado. Iniciando IA Gemini...');
                const aiResult = await aiService.identifyProduct(imageBase64);

                if (aiResult && aiResult.success && aiResult.name) {
                    productInfo = {
                        id: aiResult.id || `AI-${Date.now()}`,
                        barcode: barcode || aiResult.barcode || `AI-${Date.now()}`,
                        name: aiResult.name,
                        brand: aiResult.brand || 'Identificado por IA',
                        category: aiResult.category || 'General',
                        imageUrl: aiResult.imageUrl || null,
                        source: 'IA Vision',
                        confidence: aiResult.confidence
                    };
                    console.log(`✅ Producto identificado por IA: ${productInfo.name}`);
                }
            }

            // 3. Fallback 2: Si aún no hay info, buscar en Web (Google/Amazon)
            if (!productInfo && barcode && barcode !== 'unknown') {
                console.log('⚠️ Intentando búsqueda Web como último recurso...');

                const fallbackResults = await serpApiService.searchAllPlatforms(barcode);

                if (fallbackResults && fallbackResults.length > 0) {
                    const bestMatch = fallbackResults[0];
                    productInfo = {
                        id: barcode,
                        barcode: barcode,
                        name: bestMatch.name || bestMatch.title || 'Producto Web',
                        brand: bestMatch.platform || 'Web Search',
                        category: 'General',
                        imageUrl: bestMatch.imageUrl || bestMatch.image || null,
                        source: 'Web Search'
                    };
                    console.log(`✅ Producto encontrado en Web: ${productInfo.name}`);
                } else {
                    // Intento final con Amazon Scraper directo
                    try {
                        const amazonResults = await amazonScraper.searchProduct(barcode);
                        if (amazonResults && amazonResults.length > 0) {
                            const bestMatch = amazonResults[0];
                            productInfo = {
                                id: barcode,
                                barcode: barcode,
                                name: bestMatch.name || bestMatch.title || 'Producto Amazon',
                                brand: 'Amazon',
                                category: 'General',
                                imageUrl: bestMatch.imageUrl || bestMatch.image || null,
                                source: 'Amazon'
                            };
                            console.log(`✅ Producto encontrado en Amazon: ${productInfo.name}`);
                        }
                    } catch (e) {
                        console.error('❌ Amazon Fallback falló:', e.message);
                    }
                }
            }

            // Error final si no se encontró nada
            if (!productInfo) {
                throw new Error('Producto no encontrado. Intenta con una imagen más clara o verifica el código de barras.');
            }

            console.log(`📦 Producto identificado: ${productInfo.name} vía ${productInfo.source}`);

            // 4. Buscar precios usando el nombre identificado
            const priceResults = await this.searchPricesByName(productInfo.name);

            // 5. Actualizar imagen del producto si no tiene y hay precios con imágenes
            if (!productInfo.imageUrl && priceResults && priceResults.length > 0) {
                const firstWithImage = priceResults.find(p => p.imageUrl || p.image);
                if (firstWithImage) {
                    productInfo.imageUrl = firstWithImage.imageUrl || firstWithImage.image;
                }
            }

            // 6. Guardar historial si hay usuario (No bloquea la respuesta)
            if (userId) {
                historyService.addSearchHistory(userId, productInfo, productInfo.barcode).catch(e =>
                    console.error('⚠️ Error guardando historial:', e.message)
                );
            }

            // ✅ RESPUESTA ESTANDARIZADA PARA FLUTTER
            return {
                product: productInfo,
                prices: priceResults || [],
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

            if (!aiResult || !aiResult.success || !aiResult.name) {
                throw new Error('La IA no pudo identificar el producto. Intenta con mejor iluminación.');
            }

            console.log(`🔍 AI: Identificado como "${aiResult.name}"`);

            const prices = await this.searchPricesByName(aiResult.name);

            const productData = {
                id: aiResult.id || `AI-${Date.now()}`,
                name: aiResult.name,
                brand: aiResult.brand || 'Identificado por IA',
                barcode: aiResult.barcode || `AI-${Date.now()}`,
                category: aiResult.category || 'General',
                source: 'Gemini AI',
                imageUrl: aiResult.imageUrl || (prices.length > 0 ? (prices[0].imageUrl || prices[0].image) : null),
                confidence: aiResult.confidence
            };

            // Guardar historial si hay usuario
            if (userId) {
                historyService.addSearchHistory(userId, productData, productData.barcode).catch(e =>
                    console.error('⚠️ Error guardando historial de imagen:', e.message)
                );
            }

            // ✅ RESPUESTA ESTANDARIZADA PARA FLUTTER
            return {
                product: productData,
                prices: prices || [],
            };
        } catch (error) {
            console.error('❌ AI Search Error:', error.message);
            throw error;
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (LÓGICA CENTRAL DE PRECIOS)
    // ---------------------------------------------------------
    async searchPricesByName(productName) {
        if (!productName) return [];

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 INICIANDO BÚSQUEDA AGREGADA: "${productName}"`);
        console.log(`${'='.repeat(60)}\n`);

        // Ejecutar todas las fuentes en paralelo para velocidad máxima
        const results = await Promise.allSettled([
            this.searchMercadoLibre(productName),
            this.searchSerpAPI(productName),
            this.searchPeruvianStores(productName)
        ]);

        const allPrices = [];
        const errors = [];
        const sources = ['Mercado Libre', 'SerpAPI', 'Supermercados Perú'];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (result.value && result.value.length > 0) {
                    allPrices.push(...result.value);
                }
            } else {
                errors.push({ platform: sources[index], error: result.reason.message });
            }
        });

        if (errors.length > 0) {
            console.log('⚠️ Errores en algunas fuentes:');
            errors.forEach(err => console.log(`   - ${err.platform}: ${err.error}`));
        }

        // 1. Eliminar duplicados por URL o Nombre
        let uniquePrices = this.removeDuplicates(allPrices);

        // 2. Ordenar por precio (Menor a Mayor)
        uniquePrices.sort((a, b) => (a.price || 999999) - (b.price || 999999));

        // 3. Validar y construir URLs finales
        const validatedPrices = this.validateUrls(uniquePrices, productName);

        console.log(`\n💰 RESULTADO: ${validatedPrices.length} opciones encontradas.`);
        if (validatedPrices.length > 0) {
            console.log(`💵 Precio Mínimo: S/ ${validatedPrices[0].price.toFixed(2)}`);
        }
        console.log(`${'='.repeat(60)}\n`);

        return validatedPrices;
    }

    // ---------------------------------------------------------
    // MÉTODOS DE SOPORTE (LIMPIEZA Y VALIDACIÓN)
    // ---------------------------------------------------------

    removeDuplicates(products) {
        const uniqueMap = new Map();
        products.forEach(item => {
            // Usamos la URL como llave primaria, si no existe usamos plataforma + nombre
            const key = item.url && item.url !== 'null'
                ? item.url
                : `${item.platform || 'unknown'}-${(item.name || item.title || '').toLowerCase().trim()}`;

            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        });
        return Array.from(uniqueMap.values());
    }

    validateUrls(products, searchQuery) {
        return products.map(product => {
            // Si la URL es inválida, generamos una búsqueda directa en la tienda
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
            console.log(`🛒 [ML] Consultando Mercado Libre Perú...`);
            return await mercadoLibreService.searchByName(productName) || [];
        } catch (error) {
            console.error(`❌ ML Error: ${error.message}`);
            return [];
        }
    }

    async searchSerpAPI(productName) {
        try {
            console.log(`🌐 [SerpAPI] Consultando Google Shopping...`);
            return await serpApiService.searchAllPlatforms(productName) || [];
        } catch (error) {
            console.error(`❌ SerpAPI Error: ${error.message}`);
            return [];
        }
    }

    async searchPeruvianStores(productName) {
        console.log(`🇵🇪 [Scrapers] Consultando supermercados en paralelo...`);
        const startTime = Date.now();

        const stores = [
            { name: 'Metro', scraper: metroScraper },
            { name: 'Plaza Vea', scraper: plazaVeaScraper },
            { name: 'Wong', scraper: wongScraper },
            { name: 'Tottus', scraper: tottusScraper }
        ];

        // Ejecutar todos los scrapers simultáneamente
        const promises = stores.map(store =>
            store.scraper.searchProducts(productName)
                .then(products => (products || []).map(p => ({
                    ...p,
                    platform: p.platform || store.name
                })))
                .catch(error => {
                    console.error(`   ❌ Error en ${store.name}: ${error.message}`);
                    return [];
                })
        );

        const outcomes = await Promise.all(promises);
        const combinedResults = outcomes.flat();

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏱️ Scraping completado en ${duration}s. Items: ${combinedResults.length}`);

        return combinedResults;
    }
}

module.exports = new ProductAggregatorService();