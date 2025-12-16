const aiService = require('../services/aiService');
const productService = require('../services/productService');

class AIController {
    async identifyAndSearch(req, res) {
        try {
            const { imageBase64 } = req.body;

            if (!imageBase64) {
                return res.status(400).json({
                    success: false,
                    error: 'Image is required',
                });
            }

            console.log('📸 AI: Received image for identification');

            // 1. Identificar producto con IA
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult.success) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to identify product',
                });
            }

            // 2. Buscar precios con el nombre identificado
            console.log(`🔍 AI: Searching prices for "${aiResult.productName}"`);

            const prices = await productService.searchProductByName(aiResult.productName);

            res.json({
                success: true,
                data: {
                    productName: aiResult.productName,
                    confidence: aiResult.confidence,
                    prices: prices,
                },
            });
        } catch (error) {
            console.error('❌ AI Controller Error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}

module.exports = new AIController();
