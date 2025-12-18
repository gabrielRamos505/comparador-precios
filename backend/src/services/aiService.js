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

            // 2. Configurar Modelo con MODO JSON (Mucho más estable)
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-flash-latest',
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            // 3. Prompt optimizado para detectar CANTIDAD/PESO
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

EJEMPLOS:
- Imagen: Botella de agua Cielo de 625ml -> {"productName": "Agua Cielo Sin Gas", "brand": "Cielo", "quantity": "625ml", "confidence": "high"}
- Imagen: Paquete de Arroz Costeño -> {"productName": "Arroz Costeño Extra", "brand": "Costeño", "quantity": "750g", "confidence": "high"}

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

            // 5. Parseo directo (Ya no necesitamos regex complejo gracias a JSON mode)
            let aiData;
            try {
                aiData = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parsing JSON from AI:', e);
                // Fallback por si acaso
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
            }

            if (!aiData || !aiData.productName || aiData.confidence === 'low') {
                console.warn('⚠️ AI: Low confidence or no product detected');
                return {
                    success: false,
                    productName: null,
                    error: 'No se pudo identificar el producto claramente'
                };
            }

            // 6. Construir nombre completo para la búsqueda
            // Concatenamos la cantidad al nombre si existe, para ayudar a los scrapers
            let finalSearchName = aiData.productName;
            if (aiData.quantity && !finalSearchName.includes(aiData.quantity)) {
                finalSearchName = `${finalSearchName} ${aiData.quantity}`;
            }

            // Generar barcode temporal
            const timestamp = Date.now();
            const safeName = aiData.productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
            const temporaryBarcode = `AI-${safeName}-${timestamp}`;

            console.log(`✅ AI Identified: "${finalSearchName}" (${aiData.confidence})`);

            return {
                success: true,
                productName: finalSearchName, // Este nombre irá a los scrapers
                brand: aiData.brand,
                quantity: aiData.quantity,
                category: aiData.category,
                confidence: aiData.confidence,
                barcode: temporaryBarcode,
                imageUrl: null // El frontend usará la foto que tomó el usuario
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

        // Validar tamaño (aprox 5MB para ser más flexible con celulares modernos)
        const sizeInBytes = 4 * Math.ceil((imageBase64.length / 3)) * 0.5624896334383812;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 6) { // Subí el límite a 6MB para evitar rechazos innecesarios
            console.warn(`⚠️ Imagen muy grande: ${sizeInMB.toFixed(2)}MB`);
            return false;
        }

        return true;
    }
}

module.exports = new AIService();