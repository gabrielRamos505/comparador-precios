const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class WongScraper {
    constructor() {
        this.baseUrl = 'https://www.wong.pe';
    }

    async searchProducts(query) {
        let browser;
        try {
            console.log(`   🏬 (Puppeteer) Buscando en Wong: "${query}"`);

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

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            const url = `${this.baseUrl}/busca?ft=${encodeURIComponent(query)}`;

            // Timeout Aumentado por solicitud: 12s -> 45s
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            } catch (e) {
                console.log('      ⚠️ Wong: Timeout al cargar página (45s)');
                return [];
            }

            // Timeout Selector Aumentado: 5s -> 30s
            try {
                await page.waitForSelector('.vtex-product-summary-2-x-container, .product-item', { timeout: 30000 });
            } catch (e) {
                console.log('      ⚠️ Wong: Timeout esperando selector (30s)');
                return [];
            }

            const products = await page.evaluate(() => {
                const items = [];
                const cards = document.querySelectorAll('.vtex-product-summary-2-x-container, .product-item');

                cards.forEach(card => {
                    if (items.length >= 5) return;

                    const nameEl = card.querySelector('.vtex-product-summary-2-x-brandName, .product-name');
                    const priceEl = card.querySelector('.vtex-product-summary-2-x-currencyInteger, .product-price');
                    const linkEl = card.querySelector('a');

                    if (nameEl && priceEl) {
                        const name = nameEl.innerText.trim();
                        const priceText = priceEl.innerText.replace(/[^\d.]/g, '');
                        const price = parseFloat(priceText);
                        const link = linkEl ? linkEl.href : null;

                        if (name && !isNaN(price) && price > 0) {
                            items.push({
                                platform: 'Wong',
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
                console.log(`      ✅ Wong: ${products.length} encontrados (Min: S/ ${Math.min(...products.map(p => p.price)).toFixed(2)})`);
            } else {
                console.log(`      ⚠️ Wong: Sin resultados visibles`);
            }

            return products;

        } catch (error) {
            console.error(`      ❌ Wong Error: ${error.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new WongScraper();