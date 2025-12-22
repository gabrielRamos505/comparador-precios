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

            // ✅ URL CORREGIDA: Usar /{query}?_q={query}&map=ft en lugar de /busca?ft=
            const cleanQuery = query.toLowerCase().replace(/\s+/g, '+');
            const url = `${this.baseUrl}/${cleanQuery}?_q=${cleanQuery}&map=ft`;

            // Timeout reducido: 15s (más rápido en Render)
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (e) {
                console.log('      ⚠️ Wong: Timeout al cargar página (15s)');
                return [];
            }

            // Timeout reducido: 10s (fallar rápido si no hay datos)
            try {
                await page.waitForSelector('meta[property^="og:"]', { timeout: 10000 });
            } catch (e) {
                console.log('      ⚠️ Wong: Timeout esperando meta tags (10s)');
                return [];
            }

            // ✅ EXTRACCIÓN MEJORADA: Usar meta tags Open Graph
            const products = await page.evaluate(() => {
                const items = [];

                try {
                    // Estrategia 1: Buscar productos en meta tags individuales
                    const metaTags = document.querySelectorAll('meta[data-react-helmet="true"]');
                    const productData = {};

                    metaTags.forEach(meta => {
                        const property = meta.getAttribute('property') || meta.getAttribute('name');
                        const content = meta.getAttribute('content');

                        if (property && content) {
                            productData[property] = content;
                        }
                    });

                    // Si encontramos datos del producto en meta tags
                    if (productData['og:title'] && productData['product:price:amount']) {
                        const price = parseFloat(productData['product:price:amount']);

                        if (price > 0) {
                            items.push({
                                platform: 'Wong',
                                name: productData['og:title'],
                                price: price,
                                currency: productData['product:price:currency'] || 'PEN',
                                url: productData['og:url'] || window.location.href,
                                imageUrl: productData['og:image'] || null,
                                available: true,
                                shipping: 0
                            });
                        }
                    }

                    // Estrategia 2: Fallback a selectores VTEX si meta tags no funcionan
                    if (items.length === 0) {
                        const cards = document.querySelectorAll('.vtex-product-summary-2-x-container, .vtex-search-result-3-x-galleryItem');

                        cards.forEach(card => {
                            if (items.length >= 10) return;

                            const nameEl = card.querySelector('.vtex-product-summary-2-x-productBrand, .vtex-product-summary-2-x-brandName');
                            const priceEl = card.querySelector('.vtex-product-summary-2-x-currencyInteger, [class*="sellingPrice"]');
                            const linkEl = card.querySelector('a[href*="/p"]');

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
                                        url: link || window.location.href,
                                        imageUrl: null,
                                        available: true,
                                        shipping: 0
                                    });
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error extracting Wong products:', error);
                }

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