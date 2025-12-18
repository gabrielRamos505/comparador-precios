const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Analizando Wong...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📍 Navegando a Wong...');

    // ✅ URL correcta de Wong
    const searchUrl = 'https://www.wong.pe/agua%20cielo?_q=agua%20cielo&map=ft';

    await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded', // Más rápido
        timeout: 60000
    });

    console.log('⏳ Esperando productos (máx 30s)...\n');

    let attempts = 0;
    let productsFound = false;

    while (attempts < 30 && !productsFound) {
        await new Promise(r => setTimeout(r, 1000));

        productsFound = await page.evaluate(() => {
            const bodyText = document.body.textContent || '';
            return bodyText.includes('S/') && (bodyText.includes('CIELO') || bodyText.includes('Agua'));
        });

        attempts++;

        if (attempts % 5 === 0) {
            console.log(`   ⏳ ${attempts}s...`);
        }
    }

    if (productsFound) {
        console.log(`   ✅ Productos detectados (${attempts}s)\n`);
    } else {
        console.log('   ⚠️ Timeout\n');
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    const analysis = await page.evaluate(() => {
        return {
            totalDivs: document.querySelectorAll('div').length,
            totalArticles: document.querySelectorAll('article').length,

            vtexElements: document.querySelectorAll('[class*="vtex"]').length,
            productElements: document.querySelectorAll('[class*="product"]').length,
            showcaseElements: document.querySelectorAll('[class*="Showcase"]').length,

            cieloElements: Array.from(document.querySelectorAll('*'))
                .filter(el => el.textContent && el.textContent.includes('CIELO'))
                .slice(0, 5)
                .map(el => ({
                    tag: el.tagName,
                    class: el.getAttribute('class')?.substring(0, 60) || 'sin clase',
                    text: el.textContent.substring(0, 60).trim(),
                    parent: el.parentElement?.tagName,
                    parentClass: el.parentElement?.getAttribute('class')?.substring(0, 60) || 'sin clase'
                })),

            pricesFound: Array.from(document.querySelectorAll('*'))
                .filter(el => {
                    const text = el.textContent || '';
                    return text.match(/S\/\s*\d+/);
                })
                .slice(0, 5)
                .map(el => ({
                    tag: el.tagName,
                    class: el.getAttribute('class')?.substring(0, 60) || 'sin clase',
                    text: el.textContent.trim().substring(0, 40)
                })),

            productImages: Array.from(document.querySelectorAll('img'))
                .filter(img => {
                    const src = img.src || img.getAttribute('data-src') || '';
                    const alt = img.alt || '';
                    return src.toLowerCase().includes('cielo') ||
                        alt.toLowerCase().includes('cielo') ||
                        alt.toLowerCase().includes('agua');
                })
                .slice(0, 3)
                .map(img => ({
                    src: (img.src || '').substring(0, 80),
                    alt: img.alt,
                    parentClass: img.parentElement?.getAttribute('class')?.substring(0, 60) || 'sin clase'
                })),

            topClasses: (() => {
                const classCount = {};

                document.querySelectorAll('[class]').forEach(el => {
                    try {
                        const className = el.getAttribute('class');
                        if (className && typeof className === 'string') {
                            const classes = className.split(' ').filter(c =>
                                c.includes('vtex') || c.includes('Showcase') || c.includes('product')
                            );
                            classes.forEach(cls => {
                                classCount[cls] = (classCount[cls] || 0) + 1;
                            });
                        }
                    } catch (e) { }
                });

                return Object.entries(classCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15)
                    .map(([cls, count]) => `${cls} (${count})`);
            })()
        };
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ANÁLISIS DE WONG');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🔢 Elementos generales:');
    console.log(`   - <div>: ${analysis.totalDivs}`);
    console.log(`   - <article>: ${analysis.totalArticles}`);

    console.log('\n🏷️  Elementos por clase:');
    console.log(`   - [class*="vtex"]: ${analysis.vtexElements}`);
    console.log(`   - [class*="product"]: ${analysis.productElements}`);
    console.log(`   - [class*="Showcase"]: ${analysis.showcaseElements}`);

    console.log('\n📋 Top 15 clases más comunes:');
    analysis.topClasses.forEach((cls, i) => {
        console.log(`   ${i + 1}. ${cls}`);
    });

    console.log('\n🏷️  Elementos con "CIELO":');
    analysis.cieloElements.forEach((el, i) => {
        console.log(`\n${i + 1}. <${el.tag.toLowerCase()}> - "${el.text}"`);
        console.log(`   Clase: ${el.class}`);
        console.log(`   Parent: <${el.parent}> (${el.parentClass})`);
    });

    console.log('\n💰 Precios:');
    analysis.pricesFound.forEach((el, i) => {
        console.log(`${i + 1}. <${el.tag.toLowerCase()}> - "${el.text}" (${el.class})`);
    });

    console.log('\n📸 Imágenes:');
    analysis.productImages.forEach((img, i) => {
        console.log(`${i + 1}. ${img.alt || 'Sin alt'} (${img.parentClass})`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');

    const products = await page.evaluate(() => {
        const extractedProducts = [];

        // Estrategia 1: Buscar por .Showcase__content (como Plaza Vea)
        let containers = document.querySelectorAll('.Showcase__content');

        if (containers.length > 0) {
            console.log(`✅ Encontrados ${containers.length} contenedores .Showcase__content`);

            containers.forEach((container, index) => {
                if (index >= 8) return;

                try {
                    const nameElement = container.querySelector('.Showcase__name');
                    const name = nameElement ? nameElement.textContent.trim() : null;

                    const priceElement = container.querySelector('.Showcase__salePrice');
                    const priceText = priceElement ? priceElement.textContent.trim() : '';
                    const price = parseFloat(priceText.replace(/[^\d.]/g, ''));

                    const linkElement = container.querySelector('a');
                    const url = linkElement ? linkElement.href : null;

                    const imgElement = container.querySelector('img');
                    const imageUrl = imgElement ? (imgElement.src || imgElement.getAttribute('data-src')) : null;

                    if (name && price && !isNaN(price) && price > 0) {
                        extractedProducts.push({
                            name: name.substring(0, 100),
                            price: `S/ ${price.toFixed(2)}`,
                            imageUrl: imageUrl,
                            containerClass: 'Showcase__content'
                        });
                    }
                } catch (e) { }
            });
        } else {
            console.log('⚠️ No se encontró .Showcase__content, usando estrategia por imágenes');

            const images = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src || img.getAttribute('data-src') || '';
                const alt = img.alt || '';
                return src.toLowerCase().includes('cielo') ||
                    alt.toLowerCase().includes('cielo') ||
                    alt.toLowerCase().includes('agua');
            });

            images.slice(0, 8).forEach(img => {
                try {
                    let container = img.parentElement;
                    let depth = 0;

                    while (container && depth < 8) {
                        const text = container.textContent || '';

                        if (text.includes('S/') && (text.includes('CIELO') || text.includes('Agua'))) {
                            const priceMatch = text.match(/S\/\s*(\d+(?:\.\d{2})?)/);
                            const price = priceMatch ? priceMatch[0] : null;

                            const textElements = Array.from(container.querySelectorAll('*'));
                            const nameEl = textElements.find(el => {
                                const t = el.textContent || '';
                                return (t.includes('CIELO') || t.includes('Agua')) &&
                                    t.length > 10 &&
                                    t.length < 100 &&
                                    !t.includes('S/') &&
                                    el.children.length === 0;
                            });

                            const name = nameEl ? nameEl.textContent.trim() : null;

                            if (name && price) {
                                const className = container.getAttribute('class') || 'sin clase';

                                extractedProducts.push({
                                    name: name.substring(0, 100),
                                    price: price,
                                    imageUrl: img.src || img.getAttribute('data-src'),
                                    containerClass: className.substring(0, 100)
                                });

                                break;
                            }
                        }

                        container = container.parentElement;
                        depth++;
                    }
                } catch (e) { }
            });
        }

        return extractedProducts;
    });

    if (products.length > 0) {
        console.log(`✅ PRODUCTOS EXTRAÍDOS: ${products.length}\n`);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   💰 ${p.price}`);
            console.log(`   🏷️  ${p.containerClass}\n`);
        });
    } else {
        console.log('❌ No se extrajeron productos\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⏸️  Navegador abierto. Presiona CTRL+C para cerrar\n');
})();
