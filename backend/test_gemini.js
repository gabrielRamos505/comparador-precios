require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('--- Probando generación de contenido ---');
        const result = await model.generateContent("Di 'Hola mundo' en JSON.");
        const response = await result.response;
        console.log('✅ Respuesta recibida:', response.text());

    } catch (error) {
        console.error('❌ Error completo:', error);
    }
}

testModel();
