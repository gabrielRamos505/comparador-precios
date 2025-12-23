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
     * Identifica un producto a partir de una imagen en Base64 usando Gemini 1.5 Flash.
     */
    async identifyProduct(imageBase64) {
        try {
            console.log('🤖 AI: Analizando imagen con Gemini Vision (Perú Retail Mode)...');

            // 1. Limpieza rigurosa del string base64
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            // 2. Configuración del modelo con MODO JSON forzado
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1, // Baja temperatura para respuestas más precisas y menos creativas
                }
            });

            // 3. Prompt optimizado para scrapers de Perú (Plaza Vea, Metro, etc.)
            const prompt = `Actúa como un experto en retail peruano. Analiza la imagen y extrae datos para un comparador de precios.
            
            Debes devolver un objeto JSON con:
            1. "productName": Nombre comercial (Marca + Producto + Variante). Ej: "Inca Kola Sin Azúcar".
            2. "brand": La marca principal. Ej: "Inca Kola".
            3. "quantity": Solo el contenido neto (ej: "1.5L", "500g", "6 pack"). Si no es legible, usa null.
            4. "category": Elige una: "Bebidas", "Abarrotes", "Limpieza", "Lácteos", "Cuidado Personal", "Tecnología".
            5. "confidence": "high" si el producto es claro, "medium" si hay dudas, "low" si no es un producto retail.

            REGLAS CRÍTICAS:
            - Si es un producto de marca propia peruana (ej: Bell's, Tottus, Metro, Wong), identifícalo correctamente.
            - No inventes sabores si no los lees.
            - Responde exclusivamente en formato JSON.`;

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/jpeg',
                },
            };

            // 4. Ejecución de la IA
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log('🤖 AI Respuesta Raw:', text);

            // 5. Parseo seguro del JSON
            let aiData;
            try {
                aiData = JSON.parse(text);
            } catch (e) {
                // Intento de rescate si Gemini añade texto extra
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('La IA no devolvió un formato JSON válido');
                }
            }

            // 6. Validación de confianza
            if (!aiData || !aiData.productName || aiData.confidence === 'low') {
                console.warn('⚠️ AI: Baja confianza o producto no detectado.');
                return {
                    success: false,
                    name: null,
                    error: 'No se pudo identificar el producto con claridad'
                };
            }

            // 7. Construcción del nombre final optimizado para los scrapers de Perú
            // Si el nombre detectado no tiene la cantidad, se la pegamos al final
            let finalSearchName = aiData.productName;
            if (aiData.quantity && !finalSearchName.toLowerCase().includes(aiData.quantity.toLowerCase())) {
                finalSearchName = `${finalSearchName} ${aiData.quantity}`;
            }

            // 8. Generación de ID temporal consistente (Tu lógica original mejorada)
            const timestamp = Date.now();
            const safeName = aiData.productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
            const temporaryBarcode = `AI-${safeName}-${timestamp}`;

            console.log(`✅ AI Identificado: "${finalSearchName}" (Confianza: ${aiData.confidence})`);

            return {
                success: true,
                id: temporaryBarcode,
                name: finalSearchName,
                brand: aiData.brand,
                quantity: aiData.quantity,
                category: aiData.category,
                confidence: aiData.confidence,
                barcode: temporaryBarcode,
                source: 'Gemini AI Vision',
                imageUrl: null // El Aggregator llenará esto con el primer resultado de búsqueda
            };

        } catch (error) {
            console.error('❌ Error en AIService:', error.message);
            return {
                success: false,
                error: 'Error de comunicación con el servicio de IA',
                confidence: 'low'
            };
        }
    }

    /**
     * Valida si el base64 es una imagen válida y no excede el tamaño permitido.
     */
    validateImage(imageBase64) {
        if (!imageBase64 || typeof imageBase64 !== 'string') return false;

        // Cálculo de tamaño para Base64 (Aprox 0.75 ratio de eficiencia)
        const sizeInBytes = (imageBase64.length * (3 / 4));
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 5) { // Límite de 5MB para Gemini Flash
            console.warn(`⚠️ Imagen rechazada por tamaño: ${sizeInMB.toFixed(2)}MB`);
            return false;
        }

        // Verificar encabezado común de imagen
        const validHeader = imageBase64.startsWith('data:image/') ||
            imageBase64.startsWith('/9j/') ||
            imageBase64.startsWith('iVBORw0KGgo');

        return validHeader;
    }
}

module.exports = new AIService();