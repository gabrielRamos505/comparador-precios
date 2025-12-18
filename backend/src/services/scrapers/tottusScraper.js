const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class TottusScraper {
    constructor() {
        this.baseUrl = 'https://www.tottus.com.pe';
        this.lastRequestTime = 0;
    }

    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = 6000; // Tottus es sensible, aumentamos un poco el delay

        if (timeSinceLastRequest < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
        }

        this.lastRequestTime = Date.now();
    }

    cleanProductName(productName) {
        const stopWords = ['sin', 'con', 'x', 'ml', 'gr', 'kg', 'lt', 'pack', 'unidad', 'botella'];

        // Normalización: Eliminar tildes para la URL de búsqueda
        const normalized = productName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const words = normalized
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\d+/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !stopWords.includes(word));

        return words.slice(0, 3).join('%20');
    }

    async searchProducts(productName) {
        await this.rateLimit();
        let browser;

        try {
            const keywords = this.cleanProductName(productName);
            if (keywords.length < 3) return [];

            console.log(`   🛍️ Buscando en Tottus: "${decodeURIComponent(keywords)}"`);

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
            });

            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            // Headers para simular navegación real
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'es-PE,es-419;q=0.9,es;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            });

            // ✅ URL moderna de búsqueda en Tottus
            const searchUrl = `${this.baseUrl}/buscar?q=${keywords}`;
            console.log(`      📍 URL: ${searchUrl}`);

            // 1. Evitar Timeout esperando trackers
            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // 2. Esperar selectores (Soporta estructura antigua y nueva de Tottus)
            console.log('      ⏳ Esperando renderizado...');
            try {
                // Tottus usa 'li' con clases específicas o divs de VTEX
                await page.waitForSelector('li[class*="product"], div[class*="product-summary"], div[class*="card"]', { timeout: 15000 });
            } catch (e) {
                console.log('      ⚠️ Timeout esperando selector inicial (puede que no haya resultados o requiera scroll)');
            }

            // 3. Scroll agresivo (Tottus es muy pesado con lazy load)
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 150;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight || totalHeight > 2500) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // 4. Extracción Robusta con selectores de anclaje .pod-link
            const products = await page.evaluate(() => {
                const items = [];
                // Selector principal en Tottus (es un enlace que envuelve la tarjeta)
                const containers = document.querySelectorAll('a.pod-link');

                if (containers.length === 0) return [];

                containers.forEach((container, index) => {
                    if (index >= 8) return;

                    try {
                        // Nombre
                        // El nombre suele estar en el segundo tag <b>
                        const bTags = container.querySelectorAll('b');
                        const name = bTags.length >= 2 ? bTags[1].textContent.trim() : (bTags[0]?.textContent.trim() || null);

                        // Precio
                        // Buscamos el span que contenga el símbolo de moneda S/
                        const allSpans = container.querySelectorAll('span');
                        let price = 0;
                        for (const span of allSpans) {
                            if (span.innerText.includes('S/ ')) {
                                const priceText = span.innerText.replace(/[^\d.]/g, '');
                                price = parseFloat(priceText);
                                if (price > 0) break;
                            }
                        }

                        // URL (Es el href del mismo contenedor)
                        const url = container.href;

                        // Imagen
                        const imgEl = container.querySelector('img');
                        const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

                        // Validación básica
                        if (name && price > 0) {
                            items.push({ name, price, url, imageUrl });
                        }
                    } catch (e) {
                        // Ignorar errores puntuales
                    }
                });

                return items;
            });

            const formattedProducts = products.map(p => ({
                name: p.name,
                price: p.price,
                currency: 'PEN',
                url: p.url || this.baseUrl,
                imageUrl: p.imageUrl,
                platform: 'Tottus',
                available: true
            }));

            if (formattedProducts.length > 0) {
                const minPrice = Math.min(...formattedProducts.map(p => p.price));
                console.log(`      ✅ Tottus: ${formattedProducts.length} productos (desde S/ ${minPrice.toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Tottus: Sin resultados visibles`);
            }

            return formattedProducts;

        } catch (error) {
            console.error(`      ❌ Tottus Error: ${error.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new TottusScraper();