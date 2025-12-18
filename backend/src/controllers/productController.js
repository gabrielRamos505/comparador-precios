const productAggregatorService = require('../services/productAggregatorService');
const aiService = require('../services/aiService');
const historyService = require('../services/historyService');
const PriceHistory = require('../models/PriceHistory'); // ✅ Importar modelo
const Product = require('../models/Product');         // ✅ Importar modelo

class ProductController {

    // ---------------------------------------------------------
    // BÚSQUEDA POR CÓDIGO DE BARRAS
    // ---------------------------------------------------------
    async searchByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const userId = req.user?.userId || null;

            console.log(`🔍 Controller: Buscando barcode ${barcode} (User: ${userId})`);

            // El servicio ya se encarga de:
            // 1. Buscar en OpenFoodFacts
            // 2. Buscar precios (Scraping)
            // 3. Guardar en el historial (si hay userId)
            const result = await productAggregatorService.searchByBarcode(barcode, userId);

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

            // Aquí solo buscamos precios. No guardamos historial porque
            // la búsqueda por texto suele ser exploratoria.
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
    // BÚSQUEDA POR IMAGEN
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

            // 1. Validar
            if (!aiService.validateImage(imageBase64)) {
                return res.status(400).json({ success: false, error: 'Imagen inválida o muy pesada' });
            }

            // 2. Identificar
            const aiResult = await aiService.identifyProduct(imageBase64);

            if (!aiResult.success) {
                return res.status(422).json({ success: false, error: aiResult.error || 'No se pudo identificar el producto' });
            }

            // 3. Buscar precios
            const searchResults = await productAggregatorService.searchByName(aiResult.productName);

            // 4. Guardar en Historial (Lógica idéntica al AIController)
            if (userId) {
                try {
                    // Usamos la mejor imagen disponible (de la tienda o null)
                    const bestImage = searchResults.length > 0 ? searchResults[0].imageUrl : null;
                    const brandFallback = searchResults.length > 0 ? searchResults[0].platform : 'Generico';

                    await historyService.addSearchHistory(
                        userId,
                        {
                            name: aiResult.productName,
                            brand: aiResult.brand || brandFallback,
                            imageUrl: bestImage,
                            category: aiResult.category
                        },
                        aiResult.barcode // Barcode temporal generado por AI
                    );
                } catch (hError) {
                    console.error('⚠️ Error guardando historial de imagen:', hError.message);
                }
            }

            res.json({
                success: true,
                data: {
                    identifiedProduct: aiResult.productName,
                    confidence: aiResult.confidence,
                    barcode: aiResult.barcode, // 👈 CRÍTICO: Para que Flutter lo reciba
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
                order: [['recorded_at', 'ASC']], // Orden cronológico para gráficas
                attributes: ['price', 'platform', 'recorded_at']
            });

            // 3. Formatear para el frontend (Agrupar por tienda es útil para gráficas de líneas)
            // Estructura: { "Plaza Vea": [{price: 10, date: ...}, ...], "Metro": [...] }
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
                data: historyByPlatform, // Formato fácil para Chart.js
                rawData: history // Datos crudos por si acaso
            });

        } catch (error) {
            console.error('Error getting price history:', error);
            res.status(500).json({ success: false, error: 'Error al obtener historial de precios' });
        }
    }
}

module.exports = new ProductController();