const productAggregatorService = require('../services/productAggregatorService');
const aiService = require('../services/aiService');
const historyService = require('../services/historyService');
const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');

class ProductController {

    // ---------------------------------------------------------
    // NUEVA: IDENTIFICACIÓN DUAL (Barcode + Imagen Base64)
    // ---------------------------------------------------------
    async identifyDual(req, res) {
        try {
            const { barcode, image } = req.body;
            const userId = req.user?.userId || null;

            console.log(`🔍 Dual Search: Barcode ${barcode}`);

            // 1. Intentar por Barcode en DB primero
            if (barcode && barcode !== 'unknown') {
                const product = await Product.findOne({ where: { barcode } });
                if (product) {
                    return res.json({ success: true, data: product });
                }
            }

            // 2. Si no está o el barcode es desconocido, usar Imagen
            if (!image) {
                return res.status(404).json({ success: false, error: 'Producto no encontrado en base de datos y no se envió imagen de respaldo.' });
            }

            // Limpieza de Base64 (Tu función original)
            const imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');

            // Validación (Tu función original)
            if (aiService.validateImage && !aiService.validateImage(imageBase64)) {
                return res.status(400).json({ success: false, error: 'Imagen inválida o muy pesada' });
            }

            // Identificar con Gemini
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult || aiResult.success === false) {
                return res.status(422).json({ success: false, error: 'No se pudo identificar el producto con la imagen' });
            }

            // Buscar precios con el nombre de la IA
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            // Guardar en Historial (Lógica completa que pediste)
            if (userId) {
                try {
                    const bestImage = searchResults.length > 0 ? searchResults[0].imageUrl : aiResult.imageUrl;
                    await historyService.addSearchHistory(userId, {
                        name: aiResult.name,
                        brand: aiResult.brand || 'Genérico',
                        imageUrl: bestImage,
                        category: aiResult.category
                    }, aiResult.id);
                } catch (hError) {
                    console.error('⚠️ Error historial:', hError.message);
                }
            }

            res.json({
                success: true,
                data: {
                    identifiedProduct: aiResult.name,
                    confidence: aiResult.confidence || 'high',
                    barcode: barcode || aiResult.id,
                    searchResults: searchResults,
                },
            });

        } catch (error) {
            console.error('❌ Error Dual identify:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // --- TUS FUNCIONES ORIGINALES SIGUEN AQUÍ SIN CAMBIOS ---

    async searchByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const userId = req.user?.userId || null;
            let imageBase64 = req.body.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null;
            const result = await productAggregatorService.searchByBarcode(barcode, userId, imageBase64);
            res.json({ success: true, data: result });
        } catch (error) {
            const statusCode = error.message.includes('no encontrado') ? 404 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    async searchByName(req, res) {
        try {
            const { query } = req.query;
            if (!query) return res.status(400).json({ success: false, error: 'Query requerida' });
            const results = await productAggregatorService.searchByName(query);
            res.json({ success: true, data: results });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async searchByImage(req, res) {
        try {
            const userId = req.user?.userId || null;
            let imageBase64 = req.file ? req.file.buffer.toString('base64') : (req.body.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null);
            if (!imageBase64) return res.status(400).json({ success: false, error: 'Imagen requerida' });

            const aiResult = await aiService.identifyProduct(imageBase64);
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            if (userId) {
                await historyService.addSearchHistory(userId, { name: aiResult.name, imageUrl: searchResults[0]?.imageUrl || aiResult.imageUrl, brand: aiResult.brand });
            }

            res.json({ success: true, data: { identifiedProduct: aiResult.name, searchResults: searchResults } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getPriceHistory(req, res) {
        try {
            const { barcode } = req.params;
            const product = await Product.findOne({ where: { barcode } });
            if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
            const history = await PriceHistory.findAll({ where: { product_id: product.id }, order: [['recorded_at', 'ASC']] });
            res.json({ success: true, data: history });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ProductController();