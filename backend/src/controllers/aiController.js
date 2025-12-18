const aiService = require('../services/aiService');
const productAggregatorService = require('../services/productAggregatorService');
const historyService = require('../services/historyService');

class AIController {
    /**
     * ✅ Identificar producto por imagen y buscar precios
     */
    async identifyAndSearch(req, res) {
        try {
            const { imageBase64 } = req.body;
            // Obtener userId del token (inyectado por middleware de auth)
            const userId = req.user?.userId || null;

            if (!imageBase64) {
                return res.status(400).json({ success: false, error: 'Image is required' });
            }

            console.log(`📸 AI Request recibido. Usuario: ${userId ? userId : 'Anónimo'}`);

            // 1. Limpieza y Validación
            // Dejamos que el service limpie, pero validamos aquí para fallar rápido
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            if (!aiService.validateImage(cleanBase64)) {
                return res.status(400).json({ success: false, error: 'Imagen inválida o muy pesada' });
            }

            // 2. Identificación con IA
            console.log('🔍 Paso 1: Identificando producto con Gemini...');
            const aiResult = await aiService.identifyProduct(cleanBase64);

            if (!aiResult.success || !aiResult.productName) {
                return res.status(404).json({
                    success: false,
                    error: aiResult.error || 'No se pudo identificar el producto en la imagen',
                });
            }

            console.log(`✅ Producto detectado: "${aiResult.productName}" (Confianza: ${aiResult.confidence})`);

            // 3. Búsqueda de Precios (Scraping masivo)
            console.log(`🔍 Paso 2: Buscando precios para "${aiResult.productName}"...`);
            const prices = await productAggregatorService.searchPricesByName(aiResult.productName);

            console.log(`💰 Resultados encontrados: ${prices.length}`);

            // 4. Guardar en Historial (Solo usuarios logueados)
            if (userId) {
                try {
                    // Intentamos obtener una imagen bonita de los resultados de las tiendas
                    // Si no hay resultados, el historial quedará sin imagen (o podrías poner una default)
                    const bestImage = prices.length > 0 ? prices[0].imageUrl : null;
                    const brandFallback = prices.length > 0 ? prices[0].platform : 'Generico';

                    const productInfo = {
                        name: aiResult.productName,
                        // Si la IA no detectó marca, usamos la tienda o "Desconocida"
                        brand: aiResult.brand || brandFallback,
                        imageUrl: bestImage,
                        category: aiResult.category || 'Búsqueda por Cámara',
                        barcode: aiResult.barcode, // Barcode temporal (ej: AI-COCA-123456)
                    };

                    // Guardamos incluso si no hubo precios, para registro del usuario
                    await historyService.addSearchHistory(userId, productInfo, aiResult.barcode);
                    console.log(`✅ Historial guardado correctamente`);
                } catch (error) {
                    console.error('⚠️ No se pudo guardar el historial:', error.message);
                    // No bloqueamos la respuesta al usuario si falla el historial
                }
            }

            // 5. Responder al Frontend
            res.json({
                success: true,
                data: {
                    product: {
                        name: aiResult.productName,
                        brand: aiResult.brand,
                        category: aiResult.category,
                        barcode: aiResult.barcode,
                        confidence: aiResult.confidence
                    },
                    results: prices, // Lista de precios de PlazaVea, Metro, etc.
                },
            });

        } catch (error) {
            console.error('❌ AI Controller Error:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno procesando la imagen',
            });
        }
    }
}

module.exports = new AIController();