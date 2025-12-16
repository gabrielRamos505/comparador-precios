const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    async identifyProduct(imageBase64) {
        try {
            console.log('🤖 AI: Analyzing image with Gemini Vision...');

            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Analyze this product image and provide ONLY the product name and brand in this exact format:
"[Brand] [Product Name] [Size/Variant if visible]"

Examples:
- "Coca Cola 2L"
- "iPhone 15 Pro Max 256GB"
- "Nike Air Max 270"
- "Samsung Galaxy Buds Pro"

If you can see the size, color, or variant, include it. Be concise and accurate.`;

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg',
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const productName = response.text().trim().replace(/"/g, '');

            console.log(`✅ AI: Identified as "${productName}"`);

            return {
                success: true,
                productName: productName,
                confidence: 'high',
            };
        } catch (error) {
            console.error('❌ AI Error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = new AIService();
