require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Note: The SDK shifted how to list models. Sometimes it's better to just check common names.
        // But let's try the direct listModels if available in this version.

        console.log('--- Intentando listar modelos ---');
        // En versiones recientes el método puede variar, generalmente se usa el cliente de bajo nivel o el método directo si existe.
        // If listModels is not a function, we'll try common strings.

        // Probar nombres comunes
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp', // Experimental
            'gemini-1.0-pro-vision-latest'
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                // Simplemente ver si podemos instanciarlo y hacer una petición mínima (opcional)
                console.log(`✅ Modelo instanciado: ${modelName}`);
            } catch (e) {
                console.log(`❌ Error con ${modelName}: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('Error general:', error);
    }
}

listModels();
