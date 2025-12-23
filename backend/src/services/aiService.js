const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY no está configurada en .env');
            throw new Error('GEMINI_API_KEY is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Gemini AI Service initialized');
    }

    async identifyProduct(imageBase64) {
        try {
            console.log('🤖 AI: Analyzing image with Gemini Vision...');

            // 1. Limpieza base64
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            // 2. Configurar Modelo con MODO JSON
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash', // Recomendado: más rápido y estable para visión
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            // 3. Prompt optimizado
            const prompt = `Actúa como un experto en identificación de productos retail en Perú.
Analiza esta imagen y extrae los datos para un comparador de precios.

EXTRAE EXACTAMENTE ESTOS CAMPOS:
1. "productName": Nombre corto y preciso para buscar en tiendas (Marca + Producto + Variante).
2. "brand": La marca principal visible.
3. "quantity": El peso o volumen visible en el empaque (ej: "500ml", "1kg", "6 pack", "3L"). Si no es visible, usa null.
4. "category": Categoría general (Bebidas, Abarrotes, Limpieza, Tecnología, etc.).
5. "confidence": "high", "medium" o "low".

REGLAS:
- Si ves "Inca Kola", no pongas "Coca Cola". Sé preciso.
- Prioriza leer el contenido neto (ej: 625ml).
- Si la imagen es borrosa o no es un producto, responde con confidence: "low".

Responde ÚNICAMENTE con el objeto JSON.`;

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/jpeg',
                },
            };

            // 4. Generar
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log('🤖 AI Raw Response:', text);

            // 5. Parseo
            let aiData;
            try {
                aiData = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parsing JSON from AI:', e);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
            }

            if (!aiData || !aiData.productName || aiData.confidence === 'low') {
                console.warn('⚠️ AI: Low confidence or no product detected');
                return {
                    success: false,
                    name: null,
                    error: 'No se pudo identificar el producto claramente'
                };
            }

            // 6. Construir nombre completo para la búsqueda (Tu lógica original)
            let finalSearchName = aiData.productName;
            if (aiData.quantity && !finalSearchName.toLowerCase().includes(aiData.quantity.toLowerCase())) {
                finalSearchName = `${finalSearchName} ${aiData.quantity}`;
            }

            // Generar barcode temporal (Tu lógica original)
            const timestamp = Date.now();
            const safeName = aiData.productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
            const temporaryBarcode = `AI-${safeName}-${timestamp}`;

            console.log(`✅ AI Identified: "${finalSearchName}" (${aiData.confidence})`);

            // Retornamos un objeto que el Aggregator y el Controller entiendan perfectamente
            return {
                success: true,
                id: temporaryBarcode,
                name: finalSearchName, // Nombre optimizado para scrapers
                brand: aiData.brand,
                quantity: aiData.quantity,
                category: aiData.category,
                confidence: aiData.confidence,
                barcode: temporaryBarcode,
                source: 'IA Vision',
                imageUrl: null
            };

        } catch (error) {
            console.error('❌ AI Service Error:', error.message);
            return {
                success: false,
                error: 'Error procesando la imagen con IA',
                confidence: 'low'
            };
        }
    }

    validateImage(imageBase64) {
        if (!imageBase64 || typeof imageBase64 !== 'string') return false;

        // El cálculo de tamaño que tienes es excelente, lo mantenemos.
        const sizeInBytes = 4 * Math.ceil((imageBase64.length / 3)) * 0.5624896334383812;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 6) {
            console.warn(`⚠️ Imagen muy grande: ${sizeInMB.toFixed(2)}MB`);
            return false;
        }
        return true;
    }
}

module.exports = new AIService();