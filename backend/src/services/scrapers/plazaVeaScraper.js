const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PlazaVeaScraper {
    constructor() {
        this.baseUrl = 'https://www.plazavea.com.pe';
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
        const stopWords = ['sin', 'con', 'x', 'ml', 'gr', 'kg', 'lt', 'pack', 'unidad', 'botella'];

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

            console.log(`   🏪 Buscando en Plaza Vea: "${decodeURIComponent(keywords)}"`);

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

            // Headers para parecer un navegador real
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            const searchUrl = `${this.baseUrl}/${keywords}?_q=${keywords}&map=ft`;
            console.log(`      📍 URL: ${searchUrl}`);

            // 1. Optimización de carga: No esperar a networkidle0 (muy lento en sitios pesados)
            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // 2. Esperar selector genérico de VTEX (funciona en Plaza Vea, Vivanda, Promart, etc.)
            console.log('      ⏳ Esperando renderizado...');
            try {
                // Buscamos cualquier elemento que parezca un contenedor de producto
                await page.waitForSelector('div[class*="search-result"]', { timeout: 15000 });
            } catch (e) {
                console.log('      ⚠️ Timeout esperando selector principal, intentando fallback...');
            }

            // Scroll suave para activar lazy loading de imágenes
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight || totalHeight > 1500) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // 3. Extracción de datos con selectores actualizados
            const products = await page.evaluate(() => {
                const items = [];
                // Selector para Plaza Vea
                const cards = document.querySelectorAll('.Showcase');

                if (cards.length === 0) return [];

                cards.forEach((card, index) => {
                    if (index >= 8) return;

                    try {
                        // Nombre
                        const nameEl = card.querySelector('.Showcase__name');
                        const name = nameEl ? nameEl.textContent.trim() : null;

                        // Precio
                        const priceEl = card.querySelector('.Showcase__salePrice') || card.querySelector('.Showcase__price--sale');
                        let price = 0;
                        if (priceEl) {
                            const priceText = priceEl.textContent.replace(/[^\d.]/g, '');
                            price = parseFloat(priceText);
                        }

                        // URL
                        const linkEl = card.querySelector('.Showcase__link');
                        const url = linkEl ? linkEl.href : null;

                        // Imagen
                        const imgEl = card.querySelector('.Showcase__image') || card.querySelector('img');
                        const imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src) : null;

                        if (name && price > 0) {
                            items.push({ name, price, url, imageUrl });
                        }
                    } catch (err) {
                        // Ignorar errores individuales
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
                platform: 'Plaza Vea',
                available: true
            }));

            if (formattedProducts.length > 0) {
                const minPrice = Math.min(...formattedProducts.map(p => p.price));
                console.log(`      ✅ Plaza Vea: ${formattedProducts.length} productos (desde S/ ${minPrice.toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Plaza Vea: Sin resultados visibles`);
            }

            return formattedProducts;

        } catch (error) {
            console.error(`      ❌ Plaza Vea Error: ${error.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new PlazaVeaScraper();