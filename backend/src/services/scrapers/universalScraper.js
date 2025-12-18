const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getRandomUserAgent } = require('../../utils/userAgents');

puppeteer.use(StealthPlugin());

class UniversalScraper {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
    }

    /**
     * Rate limiting para no saturar los servidores
     */
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        // Delay aleatorio entre 2-4 segundos
        const minDelay = 2000 + Math.random() * 2000;

        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;

        // Pausa cada 10 requests
        if (this.requestCount % 10 === 0) {
            console.log(`   😴 Pausa de 10s (cada 10 sitios)...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    /**
     * Extraer información de producto de una URL usando IA
     * @param {string} url - URL de la página a scrapear
     * @param {string} productName - Nombre del producto buscado
     * @returns {Promise<Object|null>} Información del producto o null
     */
    async extractProductFromUrl(url, productName) {
        await this.rateLimit();

        let browser;

        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                ]
            });

            const page = await browser.newPage();

            // Configuración anti-detección
            await page.setUserAgent(getRandomUserAgent());
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            });

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            });

            const domain = new URL(url).hostname.replace('www.', '');
            console.log(`   📄 Scrapeando: ${domain}`);

            // Navegar con timeout corto
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            // Esperar un poco para JavaScript
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extraer el contenido visible de la página
            const pageContent = await page.evaluate(() => {
                // Remover elementos no relevantes
                const elementsToRemove = [
                    'script', 'style', 'nav', 'footer',
                    'header', 'iframe', '.ad', '.advertisement',
                    '.cookie-banner', '.popup', '.modal'
                ];

                elementsToRemove.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });

                return document.body.innerText;
            });

            // Usar Gemini para extraer el precio automáticamente
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Analiza este contenido de una página web de ecommerce peruana y extrae la información del producto.

CONTENIDO DE LA PÁGINA:
${pageContent.substring(0, 3000)}

PRODUCTO BUSCADO: ${productName}

INSTRUCCIONES:
- Encuentra el PRECIO del producto en SOLES PERUANOS (busca "S/", "S/.", "PEN", números como 29.90, 35.00, etc.)
- Encuentra el NOMBRE exacto del producto en la página
- Si hay múltiples productos, elige el que más se parezca a "${productName}"
- El precio debe ser un número decimal (ejemplo: 29.90)
- Si no encuentras un precio claro, responde "NO_PRICE"

RESPONDE SOLO EN ESTE FORMATO JSON (sin texto adicional antes o después):
{
  "name": "nombre completo del producto",
  "price": 29.90,
  "currency": "PEN"
}

Si no encuentras precio, responde:
{
  "name": "nombre del producto o descripción",
  "price": "NO_PRICE",
  "currency": "PEN"
}`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            // Parsear respuesta de la IA
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const productData = JSON.parse(jsonMatch[0]);

                if (productData.price &&
                    productData.price !== "NO_PRICE" &&
                    !isNaN(parseFloat(productData.price))) {

                    const price = parseFloat(productData.price);
                    console.log(`      ✅ ${domain}: S/ ${price.toFixed(2)}`);

                    return {
                        name: productData.name || productName,
                        price: price,
                        currency: 'PEN',
                        url: url,
                        platform: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
                        available: true,
                        shipping: 0,
                        imageUrl: null
                    };
                }
            }

            console.log(`      ⚠️ No se encontró precio en ${domain}`);
            return null;

        } catch (error) {
            const domain = new URL(url).hostname.replace('www.', '');

            if (error.message.includes('timeout')) {
                console.error(`      ⏱️ Timeout en ${domain}`);
            } else if (error.message.includes('net::')) {
                console.error(`      🌐 Error de red en ${domain}`);
            } else {
                console.error(`      ❌ Error en ${domain}:`, error.message.substring(0, 50));
            }

            return null;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Scrapear múltiples URLs en paralelo controlado
     * @param {Array} urls - Lista de objetos {url, title, domain}
     * @param {string} productName - Nombre del producto
     * @param {number} maxConcurrent - Máximo de URLs simultáneas
     * @returns {Promise<Array>} Lista de productos encontrados
     */
    async extractFromMultipleUrls(urls, productName, maxConcurrent = 2) {
        const results = [];

        console.log(`   🔄 Procesando ${urls.length} tiendas (${maxConcurrent} a la vez)...`);

        // Procesar en lotes pequeños
        for (let i = 0; i < urls.length; i += maxConcurrent) {
            const batch = urls.slice(i, i + maxConcurrent);
            const batchNumber = Math.floor(i / maxConcurrent) + 1;
            const totalBatches = Math.ceil(urls.length / maxConcurrent);

            console.log(`   📦 Lote ${batchNumber}/${totalBatches}: ${batch.map(u => u.domain).join(', ')}`);

            const promises = batch.map(urlObj =>
                this.extractProductFromUrl(urlObj.url, productName)
            );

            const batchResults = await Promise.allSettled(promises);

            batchResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            });
        }

        return results;
    }
}

module.exports = new UniversalScraper();
