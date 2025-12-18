const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class MercadoLibreScraper {
    async searchByName(productName) {
        // Limpieza igual que en el otro archivo
        let cleanQuery = productName.replace(/[^\w\s.]/g, '').split(' ').slice(0, 4).join('%20');
        const url = `https://listado.mercadolibre.com.pe/${cleanQuery}_Orden_price_asc`;

        console.log(`   🛒 ML (Scraping): "${decodeURIComponent(cleanQuery)}"`);

        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1366, height: 768 });

            // Navegar
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

            // Extraer datos visualmente
            const products = await page.evaluate(() => {
                const items = [];
                const cards = document.querySelectorAll('.ui-search-layout__item');

                cards.forEach((card, index) => {
                    if (index >= 8) return;

                    const nameEl = card.querySelector('.ui-search-item__title');
                    const linkEl = card.querySelector('a.ui-search-link');
                    const priceEl = card.querySelector('.ui-search-price__part .andes-money-amount__fraction');
                    const imgEl = card.querySelector('img.ui-search-result-image__element');

                    if (nameEl && priceEl) {
                        const priceText = priceEl.textContent.replace(/\./g, '').replace(',', '.');
                        items.push({
                            name: nameEl.textContent.trim(),
                            price: parseFloat(priceText),
                            currency: 'PEN',
                            platform: 'Mercado Libre',
                            url: linkEl ? linkEl.href : '',
                            imageUrl: imgEl ? imgEl.src : '',
                            available: true
                        });
                    }
                });
                return items;
            });

            console.log(`      ✅ ML Scraping: ${products.length} productos`);
            return products;

        } catch (e) {
            console.error('      ❌ ML Scraping Error:', e.message);
            return [];
        } finally {
            await browser.close();
        }
    }
}

module.exports = new MercadoLibreScraper();