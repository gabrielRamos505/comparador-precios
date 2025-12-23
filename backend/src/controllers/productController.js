const productAggregatorService = require('../services/productAggregatorService');
const aiService = require('../services/aiService');
const historyService = require('../services/historyService');
const PriceHistory = require('../models/PriceHistory'); // ✅ Importar modelo
const Product = require('../models/Product');         // ✅ Importar modelo

class ProductController {

    // ---------------------------------------------------------
    // BÚSQUEDA POR CÓDIGO DE BARRAS (Con Soporte de Imagen de Respaldo)
    // ---------------------------------------------------------
    async searchByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const userId = req.user?.userId || null;

            // 🆕 Recuperar imagen del body si el escáner falló
            // Esto permite que el Aggregator use la IA si OFF no encuentra el barcode
            let imageBase64 = null;
            if (req.body && req.body.image) {
                imageBase64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
            }

            console.log(`🔍 Controller: Buscando barcode ${barcode} (User: ${userId})`);

            // Pasamos el imageBase64 al servicio para que lo use como fallback
            const result = await productAggregatorService.searchByBarcode(barcode, userId, imageBase64);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('❌ Search error:', error.message);

            // Distinguir entre "No encontrado" y "Error de servidor"
            const statusCode = error.message.includes('no encontrado') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: error.message,
            });
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR NOMBRE (Texto)
    // ---------------------------------------------------------
    async searchByName(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({ success: false, error: 'Se requiere un parámetro de búsqueda (query)' });
            }

            const results = await productAggregatorService.searchByName(query);

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ---------------------------------------------------------
    // BÚSQUEDA POR IMAGEN (IA Pura)
    // ---------------------------------------------------------
    async searchByImage(req, res) {
        try {
            const userId = req.user?.userId || null;
            let imageBase64;

            // Manejar subida por Multer (archivo) o Body (string base64)
            if (req.file) {
                imageBase64 = req.file.buffer.toString('base64');
            } else if (req.body.image) {
                imageBase64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
            } else {
                return res.status(400).json({ success: false, error: 'Se requiere una imagen' });
            }

            // 1. Validar usando tu lógica de aiService
            if (!aiService.validateImage(imageBase64)) {
                return res.status(400).json({ success: false, error: 'Imagen inválida o muy pesada' });
            }

            // 2. Identificar
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult || (aiResult.success === false)) {
                return res.status(422).json({ success: false, error: 'No se pudo identificar el producto' });
            }

            // 3. Buscar precios
            const searchResults = await productAggregatorService.searchByName(aiResult.name);

            // 4. Guardar en Historial
            if (userId) {
                try {
                    const bestImage = searchResults.length > 0 ? searchResults[0].imageUrl : null;
                    const brandFallback = searchResults.length > 0 ? searchResults[0].platform : 'Generico';

                    await historyService.addSearchHistory(
                        userId,
                        {
                            name: aiResult.name,
                            brand: aiResult.brand || brandFallback,
                            imageUrl: aiResult.imageUrl || bestImage,
                            category: aiResult.category
                        },
                        aiResult.id // ID temporal de IA
                    );
                } catch (hError) {
                    console.error('⚠️ Error guardando historial de imagen:', hError.message);
                }
            }

            res.json({
                success: true,
                data: {
                    identifiedProduct: aiResult.name,
                    confidence: aiResult.confidence || 'high',
                    barcode: aiResult.id,
                    searchResults: searchResults,
                },
            });

        } catch (error) {
            console.error('Error en searchByImage:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ---------------------------------------------------------
    // HISTORIAL DE PRECIOS (GRÁFICA)
    // ---------------------------------------------------------
    async getPriceHistory(req, res) {
        try {
            const { barcode } = req.params;

            // 1. Buscar el producto por barcode
            const product = await Product.findOne({ where: { barcode } });

            if (!product) {
                return res.status(404).json({ success: false, error: 'Producto no encontrado' });
            }

            // 2. Obtener historial de precios
            const history = await PriceHistory.findAll({
                where: { product_id: product.id },
                order: [['recorded_at', 'ASC']],
                attributes: ['price', 'platform', 'recorded_at']
            });

            // 3. Formatear para el frontend
            const historyByPlatform = {};

            history.forEach(h => {
                if (!historyByPlatform[h.platform]) {
                    historyByPlatform[h.platform] = [];
                }
                historyByPlatform[h.platform].push({
                    price: h.price,
                    date: h.recorded_at
                });
            });

            res.json({
                success: true,
                data: historyByPlatform,
                rawData: history
            });

        } catch (error) {
            console.error('Error getting price history:', error);
            res.status(500).json({ success: false, error: 'Error al obtener historial de precios' });
        }
    }
}

module.exports = new ProductController();