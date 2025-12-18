const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Analizando Mercado Libre...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📍 Navegando a Mercado Libre...');

    const searchUrl = 'https://listado.mercadolibre.com.pe/agua-cielo';

    console.log(`URL: ${searchUrl}\n`);

    await page.goto(searchUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('⏳ Esperando 10 segundos...\n');
    await new Promise(r => setTimeout(r, 10000));

    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    const analysis = await page.evaluate(() => {
        return {
            // Buscar elementos de productos
            polyCards: document.querySelectorAll('.poly-card, .ui-search-result, [class*="ui-search-result"]').length,
            searchResults: document.querySelectorAll('.ui-search-result__wrapper, .ui-search-result__content').length,

            // Top clases más comunes
            topClasses: (() => {
                const classCount = {};

                document.querySelectorAll('[class*="ui-search"]').forEach(el => {
                    try {
                        const className = el.getAttribute('class');
                        if (className && typeof className === 'string') {
                            const classes = className.split(' ').filter(c =>
                                c.includes('ui-search')
                            );
                            classes.forEach(cls => {
                                classCount[cls] = (classCount[cls] || 0) + 1;
                            });
                        }
                    } catch (e) { }
                });

                return Object.entries(classCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 20)
                    .map(([cls, count]) => `${cls} (${count})`);
            })()
        };
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ANÁLISIS DE MERCADO LIBRE');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🔢 Contadores:');
    console.log(`   - Poly cards / search results: ${analysis.polyCards}`);
    console.log(`   - Search result wrappers: ${analysis.searchResults}`);

    console.log('\n📋 Top 20 clases "ui-search":');
    analysis.topClasses.forEach((cls, i) => {
        console.log(`   ${i + 1}. ${cls}`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Extraer productos con información detallada
    const products = await page.evaluate(() => {
        const extractedProducts = [];

        // ✅ Selector principal de MercadoLibre
        const containers = document.querySelectorAll('.poly-card, .ui-search-result, [class*="ui-search-result__content"]');

        console.log(`🔍 Encontrados ${containers.length} contenedores`);

        containers.forEach((container, index) => {
            if (index >= 12) return;

            try {
                // Buscar título/nombre
                const titleSelectors = [
                    '.poly-component__title',
                    '.ui-search-item__title',
                    'h2.ui-search-item__title',
                    'a.ui-search-link',
                    '[class*="item__title"]'
                ];

                let name = null;
                for (const sel of titleSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        name = el.textContent.trim();
                        break;
                    }
                }

                // Buscar precio
                const priceSelectors = [
                    '.andes-money-amount__fraction',
                    '.price-tag-fraction',
                    '[class*="price-tag-fraction"]',
                    '[class*="money-amount__fraction"]'
                ];

                let priceText = '';
                for (const sel of priceSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        priceText = el.textContent.trim();
                        break;
                    }
                }

                // Buscar moneda
                const currencyEl = container.querySelector('.andes-money-amount__currency-symbol, [class*="currency-symbol"]');
                const currency = currencyEl ? currencyEl.textContent.trim() : 'S/';

                const price = parseFloat(priceText.replace(/[,\.]/g, ''));

                // Buscar URL
                const linkEl = container.querySelector('a');
                const url = linkEl ? linkEl.href : null;

                // Buscar imagen
                const imgEl = container.querySelector('img');
                const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

                // Buscar envío gratis
                const freeShipping = container.querySelector('[class*="free-shipping"]') !== null;

                if (name && price && !isNaN(price) && price > 0) {
                    extractedProducts.push({
                        name: name.substring(0, 100),
                        price: price,
                        currency: currency,
                        url: url,
                        imageUrl: imageUrl,
                        freeShipping: freeShipping
                    });
                }
            } catch (e) {
                console.error('Error:', e.message);
            }
        });

        return extractedProducts;
    });

    if (products.length > 0) {
        console.log(`✅ PRODUCTOS EXTRAÍDOS: ${products.length}\n`);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   💰 ${p.currency} ${p.price.toFixed(2)}`);
            if (p.freeShipping) console.log(`   🚚 Envío gratis`);
            console.log('');
        });
    } else {
        console.log('❌ No se extrajeron productos\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⏸️  Presiona CTRL+C para cerrar\n');
})();
