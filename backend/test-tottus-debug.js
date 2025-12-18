const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Analizando Tottus (versión mejorada)...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📍 Navegando a Tottus...');

    const searchUrl = 'https://www.tottus.com.pe/tottus-pe/buscar?Ntt=agua+cielo';

    console.log(`URL: ${searchUrl}\n`);

    await page.goto(searchUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('⏳ Esperando 15 segundos...\n');
    await new Promise(r => setTimeout(r, 15000));

    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    // Intentar extraer productos con selectores específicos de Tottus
    const products = await page.evaluate(() => {
        const extractedProducts = [];

        // ✅ Selector específico de Tottus
        const containers = document.querySelectorAll('.products-carousel-pod, .pod, [class*="carousel-pod"]');

        console.log(`🔍 Encontrados ${containers.length} contenedores .products-carousel-pod`);

        if (containers.length === 0) {
            console.log('❌ No se encontraron contenedores');
            return [];
        }

        containers.forEach((container, index) => {
            if (index >= 12) return;

            try {
                // Buscar nombre
                let name = null;

                const nameSelectors = [
                    '.pod-product-description',
                    '.pod-link',
                    '[class*="product-description"]',
                    'a[class*="link"]',
                    'h3',
                    'h2'
                ];

                for (const sel of nameSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim() && el.textContent.trim().length > 10) {
                        name = el.textContent.trim();
                        break;
                    }
                }

                // Buscar precio
                let priceText = '';

                const priceSelectors = [
                    '.pod-product-price',
                    '.pod-prices',
                    '[class*="product-price"]',
                    '[class*="price"]'
                ];

                for (const sel of priceSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        const text = el.textContent.trim();
                        if (text.includes('S/') || text.match(/\d+/)) {
                            priceText = text;
                            break;
                        }
                    }
                }

                // Extraer número del precio
                const priceMatch = priceText.match(/(\d+(?:[,\.]\d+)?)/);
                const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

                // Buscar URL
                const linkEl = container.querySelector('a');
                const url = linkEl ? linkEl.href : null;

                // Buscar imagen
                const imgEl = container.querySelector('img');
                const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('lazy-src')) : null;

                if (name && price && !isNaN(price) && price > 0) {
                    extractedProducts.push({
                        name: name.substring(0, 100),
                        price: price,
                        imageUrl: imageUrl,
                        url: url || 'https://www.tottus.com.pe'
                    });
                }
            } catch (e) {
                console.error('Error:', e.message);
            }
        });

        return extractedProducts;
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADOS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (products.length > 0) {
        console.log(`✅ PRODUCTOS EXTRAÍDOS: ${products.length}\n`);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   💰 S/ ${p.price.toFixed(2)}\n`);
        });

        const hasCielo = products.some(p => p.name.toLowerCase().includes('cielo'));
        if (hasCielo) {
            console.log('✅ Encontró productos Cielo!');
        }
    } else {
        console.log('❌ No se extrajeron productos');
        console.log('\n💡 Inspecciona manualmente con F12');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n⏸️  Presiona CTRL+C para cerrar\n');
})();
