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
                    '--disable-software-rasterizer',
                    '--disable-extensions',
                    '--window-size=1366,768'
                ]
            });

            const page = await browser.newPage();

            // Bloqueo agresivo para velocidad (NO bloquear scripts, necesitamos JSON-LD)
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // ✅ URL de búsqueda
            const searchUrl = `${this.baseUrl}/tottus-pe/buscar?Ntt=${encodeURIComponent(query)}`;

            // Timeout optimizado: 20s con domcontentloaded
            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            } catch (e) {
                console.log('      ⚠️ Tottus: Timeout al cargar página (20s)');
                return [];
            }

            // Esperar un poco para que se cargue el contenido
            await new Promise(resolve => setTimeout(resolve, 3000));

            // ✅ EXTRACCIÓN MEJORADA: Usar JSON-LD structured data
            // IMPORTANTE: Pasamos searchUrl como parámetro para usarlo dentro del evaluate
            const products = await page.evaluate((fallbackUrl) => {
                const items = [];

                try {
                    // Buscar todos los scripts JSON-LD
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

                    if (scripts.length === 0) {
                        return items; // No hay datos estructurados
                    }

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
                                            // ✅ FIX CRÍTICO: Manejo correcto de URLs
                                            let productUrl = product.url || product.offers.url || '';

                                            if (productUrl) {
                                                if (productUrl.startsWith('http://') || productUrl.startsWith('https://')) {
                                                    // Ya tiene protocolo completo
                                                    // NO hacer nada
                                                } else if (productUrl.startsWith('/')) {
                                                    // Es ruta relativa con barra inicial
                                                    productUrl = `https://www.tottus.com.pe${productUrl}`;
                                                } else {
                                                    // Es ruta relativa sin barra
                                                    productUrl = `https://www.tottus.com.pe/${productUrl}`;
                                                }
                                            } else {
                                                // Si no tiene URL, usar la URL de búsqueda como fallback
                                                productUrl = fallbackUrl;
                                            }

                                            items.push({
                                                id: product.sku || `tottus-${Math.random().toString(36).substr(2, 9)}`,
                                                platform: 'Tottus',
                                                name: product.name,
                                                price: price,
                                                currency: 'PEN',
                                                url: productUrl, // ✅ URL ya procesada correctamente
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
            }, searchUrl); // ✅ CRÍTICO: Pasar searchUrl como parámetro al evaluate

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