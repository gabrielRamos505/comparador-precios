const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class MetroScraper {
    constructor() {
        this.baseUrl = 'https://www.metro.pe';
        this.lastRequestTime = 0;
    }

    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = 5000;

        if (timeSinceLastRequest < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
        }

        this.lastRequestTime = Date.now();
    }

    cleanProductName(productName) {
        // Agregamos más palabras clave para limpiar mejor
        const stopWords = ['sin', 'con', 'x', 'ml', 'gr', 'kg', 'lt', 'pack', 'unidad', 'botella', 'lata'];

        // Normalización: Eliminar tildes para URLs directas (Crítico para VTEX)
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

            console.log(`   🏬 Buscando en Metro: "${decodeURIComponent(keywords)}"`);

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
                ]
            });

            const page = await browser.newPage();

            // ✅ ACELERACIÓN: Bloquear recursos innecesarios
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'font', 'stylesheet', 'media', 'other'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            // Headers adicionales para evitar bloqueos
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'es-PE,es-419;q=0.9,es;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            });

            // ✅ URL correcta
            const searchUrl = `${this.baseUrl}/${keywords}?_q=${keywords}&map=ft`;
            console.log(`      📍 URL: ${searchUrl}`);

            // 1. CAMBIO CRÍTICO: Carga rápida (load) + Bloqueo de recursos
            await page.goto(searchUrl, {
                waitUntil: 'load',
                timeout: 30000
            });

            // 2. Esperar explícitamente al contenedor de productos (Versión genérica VTEX)
            console.log('      ⏳ Esperando renderizado...');
            try {
                // Esperamos que aparezca la galería o un producto
                await page.waitForSelector('div[class*="search-result"], div[class*="galleryItem"]', { timeout: 15000 });
            } catch (e) {
                console.log('      ⚠️ Timeout esperando selector inicial, intentando scroll...');
            }

            // 3. Scroll progresivo para forzar la carga de imágenes y precios (Lazy Load)
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight || totalHeight > 2000) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // 4. Extracción con selectores VTEX actualizados
            const products = await page.evaluate(() => {
                const items = [];
                // Selector principal de tarjeta de producto en VTEX
                const containers = document.querySelectorAll('.vtex-product-summary-2-x-container');

                if (containers.length === 0) return [];

                containers.forEach((container, index) => {
                    if (index >= 8) return;

                    try {
                        // Nombre
                        const nameEl = container.querySelector('.vtex-product-summary-2-x-brandName');
                        const name = nameEl ? nameEl.textContent.trim() : null;

                        // Precio (Selling Price)
                        const priceEl = container.querySelector('.vtex-product-price-1-x-sellingPriceValue');
                        let price = 0;
                        if (priceEl) {
                            const priceText = priceEl.textContent.replace(/[^\d.]/g, '');
                            price = parseFloat(priceText);
                        }

                        // URL (Crítico para evitar duplicados falsos)
                        const linkEl = container.closest('a[class*="clearLink"]') || container.querySelector('a[class*="clearLink"]');
                        const url = linkEl ? linkEl.href : null;

                        // Imagen
                        const imgEl = container.querySelector('img.vtex-product-summary-2-x-image');
                        const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

                        if (name && price > 0) {
                            items.push({ name, price, url, imageUrl });
                        }
                    } catch (e) {
                        // Error silencioso por producto
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
                platform: 'Metro',
                available: true,
                shipping: 0,
            }));

            if (formattedProducts.length > 0) {
                const minPrice = Math.min(...formattedProducts.map(p => p.price));
                console.log(`      ✅ Metro: ${formattedProducts.length} productos (desde S/ ${minPrice.toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Metro: Sin resultados visibles`);
            }

            return formattedProducts;

        } catch (error) {
            console.error(`      ❌ Metro Error: ${error.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new MetroScraper();