const productAggregatorService = require('../services/productAggregatorService');
const aiService = require('../services/aiService');
const historyService = require('../services/historyService');
const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');

class ProductController {

    // ---------------------------------------------------------
    // IDENTIFICACIÓN DUAL (Mejorada para soportar GET/POST)
    // ---------------------------------------------------------
    async identifyDual(req, res) {
        try {
            // ✅ Extraer datos de forma segura según el método HTTP
            const barcode = req.params.barcode || req.body?.barcode || null;
            const image = req.body?.image || null; // Solo existe en POST
            const userId = req.user?.userId || null;

            console.log(`📥 [${req.method}] IdentifyDual: barcode=${barcode}, hasImage=${!!image}`);

            // 1. Intentar buscar en DB Local por Barcode
            if (barcode && barcode !== 'unknown' && !barcode.startsWith('AI-')) {
                const product = await Product.findOne({ where: { barcode } });
                if (product) {
                    console.log('✅ Encontrado en DB Local');
                    const currentPrices = await productAggregatorService.searchByName(product.name);
                    return res.json({
                        success: true,
                        data: { product, prices: currentPrices }
                    });
                }
            }

            // 2. Si no hay imagen (GET request) y no se encontró en DB
            if (!image) {
                if (barcode && barcode !== 'unknown') {
                    console.log('🔎 Buscando barcode en la web (sin imagen)...');
                    const result = await productAggregatorService.searchByBarcode(barcode, userId, null);
                    return res.json({ success: true, data: result });
                }
                return res.status(400).json({
                    success: false,
                    error: 'Se requiere código de barras o imagen para identificar el producto.'
                });
            }

            // 3. Procesar con IA (Gemini) - Solo si hay imagen (POST request)
            console.log('🤖 Iniciando Gemini AI Vision...');
            const imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');

            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult || aiResult.success === false) {
                return res.status(422).json({
                    success: false,
                    error: 'La IA no pudo reconocer el producto'
                });
            }

            // 4. Buscar precios con el nombre de la IA
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            // 5. Guardar en Historial si hay usuario
            if (userId) {
                const finalImg = (searchResults?.length > 0) ? searchResults[0].imageUrl : aiResult.imageUrl;
                await historyService.addSearchHistory(userId, {
                    name: aiResult.name,
                    brand: aiResult.brand || 'Genérico',
                    imageUrl: finalImg,
                    category: aiResult.category
                }, barcode || aiResult.id).catch(e => console.error('Error historial:', e.message));
            }

            // 6. Respuesta Unificada
            return res.json({
                success: true,
                data: {
                    product: {
                        name: aiResult.name,
                        brand: aiResult.brand,
                        barcode: barcode || aiResult.id,
                        category: aiResult.category,
                        source: 'IA Vision'
                    },
                    prices: searchResults || [],
                    confidence: aiResult.confidence || 'high'
                }
            });

        } catch (error) {
            console.error('❌ Error en identifyDual:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR CÓDIGO DE BARRAS (LEGACY / DIRECTO)
    // ---------------------------------------------------------
    async searchByBarcode(req, res) {
        try {
            const barcode = req.params.barcode || req.body?.barcode;
            const userId = req.user?.userId || null;
            let imageBase64 = req.body?.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null;

            const result = await productAggregatorService.searchByBarcode(barcode, userId, imageBase64);
            res.json({ success: true, data: result });
        } catch (error) {
            const statusCode = error.message.includes('no encontrado') ? 404 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (TEXTO)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // BÚSQUEDA POR IMAGEN (DIRECTA)
    // ---------------------------------------------------------
    async searchByImage(req, res) {
        try {
            const userId = req.user?.userId || null;
            let imageBase64 = req.file
                ? req.file.buffer.toString('base64')
                : (req.body?.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null);

            if (!imageBase64) return res.status(400).json({ success: false, error: 'Imagen requerida' });

            const aiResult = await aiService.identifyProduct(imageBase64);
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            if (userId) {
                await historyService.addSearchHistory(userId, {
                    name: aiResult.name,
                    imageUrl: (searchResults && searchResults.length > 0) ? searchResults[0].imageUrl : aiResult.imageUrl,
                    brand: aiResult.brand
                }, aiResult.id);
            }

            res.json({
                success: true,
                data: {
                    identifiedProduct: aiResult.name,
                    searchResults: searchResults
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async testUrls(req, res) {
        const testUrls = {
            'Metro': 'https://www.metro.pe/busca/?ft=coca+cola',
            'Plaza Vea': 'https://www.plazavea.com.pe/busca?ft=coca+cola',
            'Wong': 'https://www.wong.pe/busca?ft=coca+cola',
            'Tottus': 'https://www.tottus.com.pe/tottus-pe/search/?text=coca+cola',
        };

        res.json({ urls: testUrls });
    }
    // ---------------------------------------------------------
    // HISTORIAL DE PRECIOS
    // ---------------------------------------------------------
    async getPriceHistory(req, res) {
        try {
            const { barcode } = req.params;
            const product = await Product.findOne({ where: { barcode } });

            if (!product) {
                return res.status(404).json({ success: false, error: 'Producto no registrado en historial' });
            }

            const history = await PriceHistory.findAll({
                where: { product_id: product.id },
                order: [['recorded_at', 'ASC']]
            });

            res.json({ success: true, data: history });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ProductController();