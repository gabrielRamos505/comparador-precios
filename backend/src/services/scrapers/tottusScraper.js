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

            // ✅ URL CORREGIDA: Usar /tottus-pe/buscar?Ntt= en lugar de /buscar?q=
            const url = `${this.baseUrl}/tottus-pe/buscar?Ntt=${encodeURIComponent(query)}`;

            // Timeout Aumentado por solicitud: 45s (Estándar para que Tottus termine)
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            } catch (e) {
                console.log('      ⚠️ Tottus: Timeout al cargar página (45s)');
                return [];
            }

            // ✅ NUEVA ESTRATEGIA: Esperar por JSON-LD en lugar de selectores DOM
            try {
                await page.waitForSelector('script[type="application/ld+json"]', { timeout: 30000 });
            } catch (e) {
                console.log('      ⚠️ Tottus: Timeout esperando datos estructurados (30s)');
                return [];
            }

            // ✅ EXTRACCIÓN MEJORADA: Usar JSON-LD structured data
            const products = await page.evaluate(() => {
                const items = [];

                try {
                    // Buscar todos los scripts JSON-LD
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

                    for (const script of scripts) {
                        try {
                            const data = JSON.parse(script.textContent);

                            // Buscar ItemList con productos
                            if (data['@type'] === 'ItemList' && data.itemListElement) {
                                data.itemListElement.forEach(item => {
                                    if (items.length >= 10) return;

                                    const product = item.item || item;

                                    if (product.name && product.offers) {
                                        const price = parseFloat(product.offers.price || product.offers.lowPrice || 0);

                                        if (price > 0) {
                                            items.push({
                                                platform: 'Tottus',
                                                name: product.name,
                                                price: price,
                                                currency: 'PEN',
                                                url: product.url || product.offers.url || window.location.href,
                                                imageUrl: product.image || null,
                                                available: true,
                                                shipping: 0
                                            });
                                        }
                                    }
                                });
                            }
                        } catch (parseError) {
                            // Ignorar scripts JSON-LD mal formados
                        }
                    }
                } catch (error) {
                    console.error('Error parsing JSON-LD:', error);
                }

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