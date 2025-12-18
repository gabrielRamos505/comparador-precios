require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testJsonMode() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: { responseMimeType: "application/json" }
        });

        console.log('--- Probando JSON Mode ---');
        const result = await model.generateContent("Identifica un producto: Agua Cielo 625ml. Responde en JSON con productName, brand y quantity.");
        const response = await result.response;
        console.log('✅ Respuesta:', response.text());

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testJsonMode();
