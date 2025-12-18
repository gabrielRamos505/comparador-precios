require('dotenv').config();
const axios = require('axios');

async function testFetch() {
    const key = process.env.GEMINI_API_KEY;
    const urls = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`
    ];

    for (const url of urls) {
        console.log(`\n--- Probando URL: ${url.replace(key, 'REDACTED')} ---`);
        try {
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "Hola, responde brevemente." }] }]
            });
            console.log('✅ Éxito:', response.data.candidates[0].content.parts[0].text);
        } catch (error) {
            console.log('❌ Error:', error.response ? error.response.status : error.message);
            if (error.response && error.response.data) {
                console.log('Detalle:', JSON.stringify(error.response.data));
            }
        }
    }
}

testFetch();
