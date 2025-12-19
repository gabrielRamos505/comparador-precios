const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class TottusScraper {
    constructor() {
        this.baseUrl = 'https://www.tottus.com.pe';
    }

    async searchProducts(query) {
        let browser;
        try {
            console.log(`   🏬 (Puppeteer) Buscando en Tottus: "${query}"`);

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
                    '--disable-gpu',
                    '--window-size=1366,768'
                ]
            });

            const page = await browser.newPage();

            // Bloqueo agresivo
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            const url = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}`;

            // Timeout Aumentado por solicitud: 45s (Estándar para que Tottus termine)
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            } catch (e) {
                console.log('      ⚠️ Tottus: Timeout al cargar página (45s)');
                return [];
            }

            // Timeout Selector Aumentado: 30s
            try {
                await page.waitForSelector('li div[class*="product-card"], a[href*="/p/"]', { timeout: 30000 });
            } catch (e) {
                console.log('      ⚠️ Tottus: Timeout esperando selector (30s)');
                return [];
            }

            const products = await page.evaluate(() => {
                const items = [];
                const cards = document.querySelectorAll('li[class*="product-card"], div[class*="product-card"]');

                cards.forEach(card => {
                    if (items.length >= 5) return;

                    const nameEl = card.querySelector('h2, div[class*="name"], span[class*="name"]');
                    const priceEl = card.querySelector('span[class*="price"], div[class*="price"]');
                    const linkEl = card.querySelector('a');

                    if (nameEl && priceEl) {
                        const name = nameEl.innerText.trim();
                        const priceText = priceEl.innerText.replace(/[^\d.]/g, '');
                        const price = parseFloat(priceText);
                        const link = linkEl ? linkEl.href : null;

                        if (name && !isNaN(price) && price > 0) {
                            items.push({
                                platform: 'Tottus',
                                name: name,
                                price: price,
                                currency: 'PEN',
                                url: link,
                                imageUrl: null,
                                available: true,
                                shipping: 0
                            });
                        }
                    }
                });
                return items;
            });

            if (products.length > 0) {
                console.log(`      ✅ Tottus: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Tottus: Sin resultados visibles`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Tottus Error: ${error.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new TottusScraper();