const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY no está configurada en .env');
            throw new Error('GEMINI_API_KEY is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Gemini AI Service iniciado correctamente');
    }

    /**
     * Identifica un producto a partir de una imagen en Base64 usando Gemini.
     * @param {string} imageBase64 - Imagen en formato Base64
     * @returns {Promise<Object>} - Objeto con información del producto identificado
     */
    async identifyProduct(imageBase64) {
        try {
            console.log('🤖 AI: Analizando imagen con Gemini Vision (Perú Retail Mode)...');

            // 1. Validación de imagen
            if (!this.validateImage(imageBase64)) {
                return {
                    success: false,
                    name: null,
                    error: 'Imagen inválida o demasiado grande (máx 5MB)',
                    confidence: 'low'
                };
            }

            // 2. Limpieza del string base64
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            // 3. ✅ CORRECCIÓN CRÍTICA: Modelo y tokens actualizados
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-flash-latest', // ✅ Modelo más reciente
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2000, // ✅ AUMENTADO de 500 a 2000
                    topP: 0.95,
                    topK: 40,
                }
            });

            // 4. Prompt optimizado para retail peruano
            const prompt = `Actúa como un experto en retail peruano. Analiza esta imagen de producto y extrae datos para un comparador de precios.

IMPORTANTE: Responde SOLO con un objeto JSON válido, sin texto adicional antes o después.

Formato requerido:
{
  "productName": "Nombre comercial completo (Marca + Producto + Variante)",
  "brand": "Marca principal del producto",
  "quantity": "Contenido neto (ej: '1.5L', '500g', '6 pack') o null si no es legible",
  "category": "Una de: Bebidas, Abarrotes, Limpieza, Lácteos, Cuidado Personal, Tecnología, Snacks",
  "confidence": "high si el producto es claro, medium si hay dudas, low si no es retail"
}

REGLAS CRÍTICAS:
- Identifica correctamente marcas peruanas (Bell's, Gloria, Inca Kola, Pilsen, Cielo, San Luis, etc.)
- Si es marca propia de supermercado (Tottus, Metro, Wong, Plaza Vea), menciónalo
- No inventes información que no veas claramente
- Para bebidas, especifica el sabor si es visible (ej: "Inca Kola Sin Azúcar 1.5L")
- Si no puedes identificar el producto claramente, usa confidence: "low"

Responde ÚNICAMENTE con el JSON, sin markdown ni explicaciones.`;

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/jpeg',
                },
            };

            // 5. Ejecución de la IA
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log('🤖 AI Respuesta Raw:', text.substring(0, 500)); // ✅ Aumentado para debug

            // 6. Parseo seguro del JSON
            let aiData;
            try {
                // Limpiar markdown si existe
                let cleanText = text.trim();

                // Remover bloques de código markdown si existen
                if (cleanText.startsWith('```json')) {
                    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                } else if (cleanText.startsWith('```')) {
                    cleanText = cleanText.replace(/```\n?/g, '');
                }

                // Intento directo de parseo
                aiData = JSON.parse(cleanText.trim());
            } catch (e) {
                console.warn('⚠️ Primer intento de parseo falló, intentando rescate...');

                // Intento de rescate: buscar el JSON en el texto
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        aiData = JSON.parse(jsonMatch[0]);
                    } catch (e2) {
                        console.error('❌ AI: No se pudo parsear JSON después del rescate');
                        console.error('Texto recibido:', text);
                        return {
                            success: false,
                            name: null,
                            error: 'La IA no devolvió un formato JSON válido',
                            confidence: 'low',
                            rawResponse: text.substring(0, 200) // ✅ Para debug
                        };
                    }
                } else {
                    console.error('❌ AI: No se encontró JSON en la respuesta');
                    console.error('Texto recibido:', text);
                    return {
                        success: false,
                        name: null,
                        error: 'La IA no devolvió un formato JSON válido',
                        confidence: 'low',
                        rawResponse: text.substring(0, 200) // ✅ Para debug
                    };
                }
            }

            // 7. Validación de datos mínimos
            if (!aiData || !aiData.productName) {
                console.warn('⚠️ AI: Respuesta sin nombre de producto');
                return {
                    success: false,
                    name: null,
                    error: 'No se pudo identificar el producto',
                    confidence: 'low'
                };
            }

            // 8. Validación de confianza
            if (aiData.confidence === 'low') {
                console.warn('⚠️ AI: Baja confianza en la identificación');
                return {
                    success: false,
                    name: aiData.productName || null,
                    error: 'No se pudo identificar el producto con claridad',
                    confidence: 'low'
                };
            }

            // 9. Construcción del nombre final optimizado para scrapers
            let finalSearchName = aiData.productName.trim();

            // Si el nombre no incluye la cantidad y existe, agregarla
            if (aiData.quantity && !finalSearchName.toLowerCase().includes(aiData.quantity.toLowerCase())) {
                finalSearchName = `${finalSearchName} ${aiData.quantity}`;
            }

            // 10. Generación de ID temporal único
            const timestamp = Date.now();
            const safeName = aiData.productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
            const temporaryBarcode = `AI-${safeName}-${timestamp}`;

            console.log(`✅ AI Identificado: "${finalSearchName}" (Confianza: ${aiData.confidence})`);

            // 11. Respuesta estandarizada
            return {
                success: true,
                id: temporaryBarcode,
                name: finalSearchName,
                brand: aiData.brand || 'Genérico',
                quantity: aiData.quantity || null,
                category: aiData.category || 'General',
                confidence: aiData.confidence,
                barcode: temporaryBarcode,
                source: 'Gemini AI Vision',
                imageUrl: null // Se llenará con el primer resultado de búsqueda
            };

        } catch (error) {
            console.error('❌ Error en AIService.identifyProduct:', error.message);
            console.error('Stack:', error.stack);

            // Errores específicos de la API de Gemini
            if (error.message.includes('API key') || error.message.includes('PERMISSION_DENIED')) {
                return {
                    success: false,
                    name: null,
                    error: 'Error de configuración del servicio de IA (API Key inválida)',
                    confidence: 'low'
                };
            }

            if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('RESOURCE_EXHAUSTED')) {
                return {
                    success: false,
                    name: null,
                    error: 'Límite de uso de IA alcanzado temporalmente. Intenta en unos minutos.',
                    confidence: 'low'
                };
            }

            if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('is not found')) {
                return {
                    success: false,
                    name: null,
                    error: 'Modelo de IA no disponible temporalmente',
                    confidence: 'low'
                };
            }

            return {
                success: false,
                name: null,
                error: 'Error de comunicación con el servicio de IA',
                confidence: 'low'
            };
        }
    }

    /**
     * Valida si el base64 es una imagen válida y no excede el tamaño permitido.
     * @param {string} imageBase64 - String en Base64
     * @returns {boolean} - true si es válida
     */
    validateImage(imageBase64) {
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            console.warn('⚠️ Imagen rechazada: no es un string válido');
            return false;
        }

        // Cálculo de tamaño para Base64 (Aprox 0.75 ratio de eficiencia)
        const sizeInBytes = (imageBase64.length * (3 / 4));
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 10) { // Límite aumentado a 10MB
            console.warn(`⚠️ Imagen rechazada por tamaño: ${sizeInMB.toFixed(2)}MB (máx 10MB)`);
            return false;
        }

        // Verificar longitud mínima
        if (imageBase64.length < 100) {
            console.warn('⚠️ Imagen rechazada: demasiado pequeña');
            return false;
        }

        // Verificar encabezado común de imagen
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const validHeader = cleanBase64.startsWith('/9j/') ||      // JPEG
            cleanBase64.startsWith('iVBORw0KGgo') || // PNG
            cleanBase64.startsWith('R0lGOD') ||      // GIF
            cleanBase64.startsWith('UklGR');         // WebP

        if (!validHeader) {
            console.warn('⚠️ Imagen rechazada: formato no reconocido');
            return false;
        }

        return true;
    }

    /**
     * Método auxiliar para testing - identifica producto desde una URL de imagen
     * @param {string} imageUrl - URL pública de la imagen
     * @returns {Promise<Object>} - Resultado de identificación
     */
    async identifyProductFromUrl(imageUrl) {
        try {
            const axios = require('axios');
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');
            return await this.identifyProduct(base64Image);
        } catch (error) {
            console.error('❌ Error descargando imagen:', error.message);
            return {
                success: false,
                name: null,
                error: 'No se pudo descargar la imagen desde la URL',
                confidence: 'low'
            };
        }
    }
}

module.exports = new AIService();