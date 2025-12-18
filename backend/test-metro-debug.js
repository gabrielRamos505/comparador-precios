const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Analizando Metro (búsqueda manual)...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📍 Navegando a Metro...');

    // ✅ Link exacto que mencionaste
    const searchUrl = 'https://www.metro.pe/agua%20cielo?_q=agua%20cielo&map=ft';

    console.log(`URL: ${searchUrl}\n`);

    await page.goto(searchUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('⏳ Esperando 15 segundos para carga completa...\n');
    await new Promise(r => setTimeout(r, 15000));

    // Hacer scroll
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    const analysis = await page.evaluate(() => {
        return {
            // Contar productos
            totalArticles: document.querySelectorAll('article').length,
            vtexProductSummary: document.querySelectorAll('[class*="vtex-product-summary"]').length,
            productSummaryElement: document.querySelectorAll('.vtex-product-summary-2-x-element').length,
            showcaseContent: document.querySelectorAll('.Showcase__content').length,

            // Buscar elementos con "Cielo" o "CIELO"
            cieloUpperCase: Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.includes('CIELO')
            ).length,

            cieloMixedCase: Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.toLowerCase().includes('cielo')
            ).length,

            // Buscar agua
            aguaElements: Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.toLowerCase().includes('agua')
            ).length,

            // Texto del body completo (primeros 500 caracteres)
            bodyText: document.body.textContent.substring(0, 500),

            // Título de la página
            pageTitle: document.title,

            // Primeros elementos con "cielo" (case insensitive)
            cieloElements: Array.from(document.querySelectorAll('*'))
                .filter(el => el.textContent && el.textContent.toLowerCase().includes('cielo'))
                .slice(0, 5)
                .map(el => ({
                    tag: el.tagName,
                    class: el.getAttribute('class')?.substring(0, 80) || 'sin clase',
                    text: el.textContent.substring(0, 80).trim(),
                })),

            // Top clases VTEX
            topClasses: (() => {
                const classCount = {};

                document.querySelectorAll('[class*="vtex-product-summary"]').forEach(el => {
                    try {
                        const className = el.getAttribute('class');
                        if (className) {
                            const classes = className.split(' ');
                            classes.forEach(cls => {
                                if (cls.includes('vtex-product-summary')) {
                                    classCount[cls] = (classCount[cls] || 0) + 1;
                                }
                            });
                        }
                    } catch (e) { }
                });

                return Object.entries(classCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([cls, count]) => `${cls} (${count})`);
            })()
        };
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ANÁLISIS DETALLADO DE METRO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📄 Título de página:', analysis.pageTitle);
    console.log('\n🔢 Contadores:');
    console.log(`   - <article>: ${analysis.totalArticles}`);
    console.log(`   - [class*="vtex-product-summary"]: ${analysis.vtexProductSummary}`);
    console.log(`   - .vtex-product-summary-2-x-element: ${analysis.productSummaryElement}`);
    console.log(`   - .Showcase__content: ${analysis.showcaseContent}`);

    console.log('\n🔍 Búsqueda de contenido:');
    console.log(`   - Elementos con "CIELO" (mayúscula): ${analysis.cieloUpperCase}`);
    console.log(`   - Elementos con "cielo" (cualquier case): ${analysis.cieloMixedCase}`);
    console.log(`   - Elementos con "agua": ${analysis.aguaElements}`);

    if (analysis.topClasses.length > 0) {
        console.log('\n📋 Top 10 clases vtex-product-summary:');
        analysis.topClasses.forEach((cls, i) => {
            console.log(`   ${i + 1}. ${cls}`);
        });
    }

    if (analysis.cieloElements.length > 0) {
        console.log('\n🏷️  Primeros elementos con "cielo":');
        analysis.cieloElements.forEach((el, i) => {
            console.log(`\n${i + 1}. <${el.tag}>`);
            console.log(`   Clase: ${el.class}`);
            console.log(`   Texto: "${el.text}"`);
        });
    } else {
        console.log('\n❌ NO se encontraron elementos con "cielo"');
        console.log('\n📝 Primeros 500 caracteres del body:');
        console.log(analysis.bodyText);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Intentar extraer productos
    const products = await page.evaluate(() => {
        const extractedProducts = [];

        const selectors = [
            '.vtex-product-summary-2-x-element',
            'article[class*="vtex-product-summary"]',
            '.Showcase__content',
            '[class*="product-summary"]'
        ];

        let containers = [];
        let usedSelector = '';

        for (const selector of selectors) {
            containers = document.querySelectorAll(selector);
            if (containers.length > 0) {
                usedSelector = selector;
                console.log(`✅ Encontrados ${containers.length} productos con: ${selector}`);
                break;
            }
        }

        if (containers.length === 0) {
            console.log('❌ No se encontraron contenedores de productos');
            return [];
        }

        containers.forEach((container, index) => {
            if (index >= 10) return;

            try {
                const nameSelectors = [
                    '.Showcase__name',
                    '.vtex-product-summary-2-x-productBrand',
                    '.vtex-product-summary-2-x-productNameContainer',
                    '[class*="productBrand"]',
                    '[class*="productName"]',
                    'h3'
                ];

                let name = null;
                for (const sel of nameSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        name = el.textContent.trim();
                        break;
                    }
                }

                const priceSelectors = [
                    '.Showcase__salePrice',
                    '.vtex-product-price-1-x-sellingPrice',
                    '[class*="sellingPrice"]',
                    '[class*="price"]'
                ];

                let priceText = '';
                for (const sel of priceSelectors) {
                    const el = container.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        priceText = el.textContent.trim();
                        break;
                    }
                }

                const price = parseFloat(priceText.replace(/[^\d.]/g, ''));

                const imgEl = container.querySelector('img');
                const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

                if (name && price && !isNaN(price) && price > 0) {
                    extractedProducts.push({
                        name: name.substring(0, 100),
                        price: `S/ ${price.toFixed(2)}`,
                        imageUrl: imageUrl,
                        containerClass: usedSelector
                    });
                }
            } catch (e) { }
        });

        return extractedProducts;
    });

    if (products.length > 0) {
        console.log(`✅ PRODUCTOS EXTRAÍDOS: ${products.length}\n`);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   💰 ${p.price}\n`);
        });

        const hasCielo = products.some(p => p.name.toLowerCase().includes('cielo'));
        if (hasCielo) {
            console.log('✅ Encontró productos Cielo!');
        } else {
            console.log('⚠️ No encontró productos Cielo, solo otros productos');
        }
    } else {
        console.log('❌ No se extrajeron productos\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⏸️  Navegador abierto. Inspecciona manualmente.');
    console.log('   Presiona CTRL+C para cerrar\n');
})();
