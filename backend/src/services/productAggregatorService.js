const openFoodFactsService = require('./openFoodFactsService');
const serpApiService = require('./serpApiService');
const historyService = require('./historyService');

class ProductAggregatorService {
    async searchByBarcode(barcode, userId = null) {
        console.log(`🔍 Searching for barcode: ${barcode}`);

        // 1. Obtener información del producto desde Open Food Facts
        const productInfo = await openFoodFactsService.getProductByBarcode(barcode);

        if (!productInfo) {
            throw new Error('Producto no encontrado');
        }

        console.log(`📦 Product: ${productInfo.name} (${productInfo.brand})`);

        // 2. Buscar precios REALES usando SerpAPI
        const priceResults = await serpApiService.searchAllPlatforms(productInfo.name);

        if (priceResults.length === 0) {
            throw new Error('No se encontraron precios para este producto');
        }

        // 3. Guardar en historial (si hay userId)
        if (userId) {
            try {
                await historyService.addSearchHistory(userId, productInfo, barcode);
                console.log(`✅ Added to search history`);
            } catch (error) {
                console.error('Error saving to history:', error.message);
            }
        }

        // 4. Formatear precios para la respuesta
        const prices = priceResults.map(result => ({
            id: result.id,
            platform: result.platform,
            price: result.price,
            shipping: result.shipping,
            currency: result.currency,
            url: result.url,
            available: result.available,
            updatedAt: new Date().toISOString(),
        }));

        return {
            product: productInfo,
            prices: prices,
        };
    }

    async searchByName(productName) {
        console.log(`🔍 Searching for product: ${productName}`);

        // Buscar en Open Food Facts
        const results = await openFoodFactsService.searchProducts(productName);
        return results;
    }
}

module.exports = new ProductAggregatorService();
