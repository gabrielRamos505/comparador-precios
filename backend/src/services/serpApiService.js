const SerpApi = require('google-search-results-nodejs');

class SerpApiService {
    constructor() {
        this.apiKey = process.env.SERPAPI_KEY;
        console.log(`🔑 SerpAPI Key configured: ${this.apiKey ? 'YES ✅' : 'NO ❌'}`);
    }

    // Google Shopping - Precios REALES
    async searchGoogleShopping(productName) {
        try {
            return new Promise((resolve, reject) => {
                console.log(`  → Google Shopping: "${productName}"`);

                const search = new SerpApi.GoogleSearch(this.apiKey);

                const params = {
                    engine: "google_shopping",
                    q: productName,
                    location: "United States",
                    hl: "en",
                    gl: "us"
                };

                search.json(params, (data) => {
                    if (data.error) {
                        console.error('  ❌ Google Shopping error:', data.error);
                        return resolve([]);
                    }

                    if (data.shopping_results && data.shopping_results.length > 0) {
                        const results = data.shopping_results.slice(0, 10).map(item => {
                            const price = item.extracted_price || 0;

                            return {
                                id: item.product_id || `google-${Date.now()}`,
                                platform: item.source || 'Google Shopping',
                                name: item.title,
                                price: price,
                                shipping: item.delivery && item.delivery.toLowerCase().includes('free') ? 0 : 5.99,
                                currency: 'USD',
                                url: item.link,
                                imageUrl: item.thumbnail,
                                rating: item.rating || null,
                                available: true,
                            };
                        });

                        console.log(`  ✅ Google Shopping: ${results.length} results found`);
                        resolve(results);
                    } else {
                        console.log('  ⚠️  Google Shopping: No results');
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            console.error('  ❌ Google Shopping exception:', error.message);
            return [];
        }
    }

    // Walmart REAL
    async searchWalmart(productName) {
        try {
            return new Promise((resolve, reject) => {
                console.log(`  → Walmart: "${productName}"`);

                const search = new SerpApi.GoogleSearch(this.apiKey);

                const params = {
                    engine: "walmart",
                    query: productName
                };

                search.json(params, (data) => {
                    if (data.error) {
                        console.error('  ❌ Walmart error:', data.error);
                        return resolve([]);
                    }

                    if (data.organic_results && data.organic_results.length > 0) {
                        const results = data.organic_results.slice(0, 5).map(item => {
                            const priceValue = item.primary_offer?.offer_price?.price || '0';
                            const price = parseFloat(priceValue.toString().replace(/[^0-9.]/g, ''));

                            return {
                                id: item.us_item_id || `walmart-${Date.now()}`,
                                platform: 'Walmart',
                                name: item.title,
                                price: price,
                                shipping: item.primary_offer?.is_free_shipping ? 0 : 5.99,
                                currency: 'USD',
                                url: item.link,
                                imageUrl: item.thumbnail,
                                rating: item.rating || null,
                                available: true,
                            };
                        });

                        console.log(`  ✅ Walmart: ${results.length} results found`);
                        resolve(results);
                    } else {
                        console.log('  ⚠️  Walmart: No results');
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            console.error('  ❌ Walmart exception:', error.message);
            return [];
        }
    }

    // Target (vía Google Shopping)
    async searchTarget(productName) {
        try {
            return new Promise((resolve, reject) => {
                console.log(`  → Target: "${productName}"`);

                const search = new SerpApi.GoogleSearch(this.apiKey);

                const params = {
                    engine: "google_shopping",
                    q: `${productName} site:target.com`,
                    location: "United States",
                    hl: "en",
                    gl: "us"
                };

                search.json(params, (data) => {
                    if (data.error) {
                        console.error('  ❌ Target error:', data.error);
                        return resolve([]);
                    }

                    if (data.shopping_results && data.shopping_results.length > 0) {
                        const results = data.shopping_results
                            .filter(item => item.source && item.source.toLowerCase().includes('target'))
                            .slice(0, 3)
                            .map(item => {
                                const price = item.extracted_price || 0;

                                return {
                                    id: item.product_id || `target-${Date.now()}`,
                                    platform: 'Target',
                                    name: item.title,
                                    price: price,
                                    shipping: item.delivery && item.delivery.toLowerCase().includes('free') ? 0 : 5.99,
                                    currency: 'USD',
                                    url: item.link,
                                    imageUrl: item.thumbnail,
                                    rating: item.rating || null,
                                    available: true,
                                };
                            });

                        if (results.length > 0) {
                            console.log(`  ✅ Target: ${results.length} results found`);
                        } else {
                            console.log('  ⚠️  Target: No results');
                        }
                        resolve(results);
                    } else {
                        console.log('  ⚠️  Target: No results');
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            console.error('  ❌ Target exception:', error.message);
            return [];
        }
    }

    // Buscar en TODAS las plataformas que FUNCIONAN
    async searchAllPlatforms(productName) {
        console.log(`🔍 SerpAPI: Searching "${productName}" across all platforms...`);

        // Solo buscamos en Google Shopping (incluye múltiples tiendas), Walmart y Target
        const [googleResults, walmartResults, targetResults] = await Promise.allSettled([
            this.searchGoogleShopping(productName),
            this.searchWalmart(productName),
            this.searchTarget(productName),
        ]);

        const allResults = [];

        // Google Shopping (incluye Amazon, Best Buy, etc.)
        if (googleResults.status === 'fulfilled' && googleResults.value.length > 0) {
            const byPlatform = {};
            googleResults.value.forEach(result => {
                const platform = result.platform;
                // Tomar el precio más bajo por plataforma
                if (!byPlatform[platform] || result.price < byPlatform[platform].price) {
                    byPlatform[platform] = result;
                }
            });

            allResults.push(...Object.values(byPlatform));
            console.log(`✅ Google Shopping: ${Object.keys(byPlatform).length} stores`);
        }

        // Walmart
        if (walmartResults.status === 'fulfilled' && walmartResults.value.length > 0) {
            const bestWalmart = walmartResults.value.sort((a, b) =>
                (a.price + a.shipping) - (b.price + b.shipping)
            )[0];

            // Evitar duplicados
            if (!allResults.find(r => r.platform === 'Walmart')) {
                allResults.push(bestWalmart);
                console.log(`✅ Walmart: Added`);
            }
        }

        // Target
        if (targetResults.status === 'fulfilled' && targetResults.value.length > 0) {
            const bestTarget = targetResults.value.sort((a, b) =>
                (a.price + a.shipping) - (b.price + b.shipping)
            )[0];

            // Evitar duplicados
            if (!allResults.find(r => r.platform === 'Target')) {
                allResults.push(bestTarget);
                console.log(`✅ Target: Added`);
            }
        }

        console.log(`💰 TOTAL REAL PRICES: ${allResults.length} stores`);

        return allResults;
    }
}

module.exports = new SerpApiService();
