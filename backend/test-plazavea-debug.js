const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Analizando Plaza Vea (versión mejorada)...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📍 Navegando a Plaza Vea...');

    await page.goto('https://www.plazavea.com.pe/bebidas/aguas/cielo', {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('⏳ Esperando que aparezcan productos...\n');

    // ✅ Esperar hasta 30 segundos a que aparezca al menos un precio
    let attempts = 0;
    let productsFound = false;

    while (attempts < 30 && !productsFound) {
        await new Promise(r => setTimeout(r, 1000)); // Esperar 1 segundo

        productsFound = await page.evaluate(() => {
            // Buscar si hay precios visibles
            const bodyText = document.body.textContent || '';
            return bodyText.includes('S/') && bodyText.includes('CIELO');
        });

        attempts++;

        if (attempts % 5 === 0) {
            console.log(`   ⏳ Esperando... (${attempts}s)`);
        }
    }

    if (productsFound) {
        console.log(`   ✅ Productos detectados después de ${attempts} segundos\n`);
    } else {
        console.log('   ⚠️ Timeout esperando productos (30s)\n');
    }

    // ✅ Hacer scroll para activar lazy loading
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 3000));

    // ✅ Análisis completo del DOM
    const analysis = await page.evaluate(() => {
        return {
            // Buscar TODOS los elementos que contienen "CIELO"
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

            // Buscar elementos con clase "product"
            productClassElements: document.querySelectorAll('[class*="product"]').length,

            // Buscar precios (S/)
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

            // Buscar imágenes de productos
            productImages: Array.from(document.querySelectorAll('img'))
                .filter(img => {
                    const src = img.src || img.getAttribute('data-src') || '';
                    const alt = img.alt || '';
                    return src.includes('cielo') || alt.includes('CIELO') || alt.includes('Agua');
                })
                .slice(0, 3)
                .map(img => ({
                    src: (img.src || '').substring(0, 80),
                    alt: img.alt,
                    parentClass: img.parentElement?.getAttribute('class')?.substring(0, 60) || 'sin clase'
                }))
        };
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ANÁLISIS DETALLADO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🏷️  Elementos con "CIELO":');
    analysis.cieloElements.forEach((el, i) => {
        console.log(`\n${i + 1}. <${el.tag.toLowerCase()}> - "${el.text}"`);
        console.log(`   Clase: ${el.class}`);
        console.log(`   Parent: <${el.parent}> (${el.parentClass})`);
    });

    console.log('\n💰 Elementos con precios (S/):');
    analysis.pricesFound.forEach((el, i) => {
        console.log(`\n${i + 1}. <${el.tag.toLowerCase()}> - "${el.text}"`);
        console.log(`   Clase: ${el.class}`);
    });

    console.log('\n📸 Imágenes de productos:');
    analysis.productImages.forEach((img, i) => {
        console.log(`\n${i + 1}. ${img.alt || 'Sin alt'}`);
        console.log(`   Src: ${img.src}`);
        console.log(`   Parent class: ${img.parentClass}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');

    // ✅ Intentar extraer productos de manera inteligente
    console.log('\n🔍 Extrayendo productos...\n');

    const products = await page.evaluate(() => {
        const extractedProducts = [];

        // Estrategia: Buscar imágenes de productos y subir en el DOM
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
            const src = img.src || img.getAttribute('data-src') || '';
            const alt = img.alt || '';
            return src.includes('cielo') || alt.includes('CIELO') || alt.includes('Agua');
        });

        images.slice(0, 8).forEach(img => {
            try {
                let container = img.parentElement;
                let depth = 0;

                while (container && depth < 8) {
                    const text = container.textContent || '';

                    // Si el contenedor tiene precio Y nombre del producto
                    if (text.includes('S/') && (text.includes('CIELO') || text.includes('Agua'))) {

                        // Extraer precio
                        const priceMatch = text.match(/S\/\s*(\d+(?:\.\d{2})?)/);
                        const price = priceMatch ? priceMatch[0] : null;

                        // Extraer nombre (buscar el elemento más específico)
                        const textElements = Array.from(container.querySelectorAll('*'));
                        const nameEl = textElements.find(el => {
                            const t = el.textContent || '';
                            return (t.includes('CIELO') || t.includes('Agua')) &&
                                t.length > 10 &&
                                t.length < 100 &&
                                !t.includes('S/') &&
                                el.children.length === 0; // Solo texto, sin hijos
                        });

                        const name = nameEl ? nameEl.textContent.trim() : null;

                        if (name && price) {
                            const className = container.getAttribute('class') || 'sin clase';

                            extractedProducts.push({
                                name: name.substring(0, 100),
                                price: price,
                                imageUrl: img.src || img.getAttribute('data-src'),
                                containerTag: container.tagName,
                                containerClass: className.substring(0, 100)
                            });

                            break;
                        }
                    }

                    container = container.parentElement;
                    depth++;
                }
            } catch (e) {
                // Ignorar
            }
        });

        return extractedProducts;
    });

    if (products.length > 0) {
        console.log(`✅ PRODUCTOS EXTRAÍDOS: ${products.length}\n`);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   💰 ${p.price}`);
            console.log(`   📦 Contenedor: <${p.containerTag.toLowerCase()}>`);
            console.log(`   🏷️  Clase: ${p.containerClass}`);
            console.log('');
        });
    } else {
        console.log('❌ No se pudieron extraer productos\n');
        console.log('💡 Inspecciona manualmente con F12 en el navegador abierto');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⏸️  Navegador abierto. Presiona CTRL+C para cerrar\n');
})();
