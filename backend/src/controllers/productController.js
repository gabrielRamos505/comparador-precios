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
            // Extrae el barcode de params (URL) o del body (JSON)
            const barcode = req.params.barcode || req.body.barcode;
            const { image } = req.body;
            const userId = req.user?.userId || null;

            console.log(`🔍 Iniciando identificación dual: ${barcode || 'Sin código'}`);

            // 1. Intentar buscar en Base de Datos Local primero
            if (barcode && barcode !== 'unknown' && !barcode.startsWith('AI-')) {
                const product = await Product.findOne({ where: { barcode } });
                if (product) {
                    console.log('✅ Producto encontrado en DB local');
                    // Buscamos precios actualizados para el producto de la DB
                    const currentPrices = await productAggregatorService.searchByName(product.name);
                    return res.json({
                        success: true,
                        data: {
                            product: product,
                            prices: currentPrices
                        }
                    });
                }
            }

            // 2. Si no está en DB o es desconocido, verificar si hay imagen para IA
            if (!image) {
                // Si no hay imagen y no se encontró en DB, intentamos búsqueda web solo con barcode
                if (barcode && barcode !== 'unknown') {
                    const result = await productAggregatorService.searchByBarcode(barcode, userId, null);
                    return res.json({ success: true, data: result });
                }
                return res.status(404).json({ success: false, error: 'Producto no identificado y no se envió imagen de respaldo.' });
            }

            // 3. Procesar Imagen con IA (Gemini)
            const imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');

            if (aiService.validateImage && !aiService.validateImage(imageBase64)) {
                return res.status(400).json({ success: false, error: 'La imagen excede el tamaño permitido o es inválida' });
            }

            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult || aiResult.success === false) {
                return res.status(422).json({ success: false, error: 'La IA no pudo reconocer el producto' });
            }

            // 4. Buscar precios con el nombre identificado por la IA
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            // 5. Gestión de Historial
            if (userId) {
                try {
                    const bestImage = (searchResults && searchResults.length > 0)
                        ? searchResults[0].imageUrl
                        : aiResult.imageUrl;

                    await historyService.addSearchHistory(userId, {
                        name: aiResult.name,
                        brand: aiResult.brand || 'Genérico',
                        imageUrl: bestImage,
                        category: aiResult.category
                    }, barcode || aiResult.id);
                } catch (hError) {
                    console.error('⚠️ Error al guardar en historial:', hError.message);
                }
            }

            // 6. Respuesta final unificada
            res.json({
                success: true,
                data: {
                    product: {
                        name: aiResult.name,
                        brand: aiResult.brand,
                        barcode: barcode || aiResult.id,
                        category: aiResult.category,
                        source: 'IA Vision'
                    },
                    prices: searchResults,
                    confidence: aiResult.confidence || 'high'
                },
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
            const barcode = req.params.barcode || req.body.barcode;
            const userId = req.user?.userId || null;
            let imageBase64 = req.body.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null;

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
                : (req.body.image ? req.body.image.replace(/^data:image\/\w+;base64,/, '') : null);

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