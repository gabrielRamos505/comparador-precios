const aggregator = require('./src/services/productAggregatorService');

async function testSearch() {
    try {
        console.log('🧪 Iniciando prueba de búsqueda para: "agua cielo"');
        const results = await aggregator.searchPricesByName('agua cielo');

        console.log('\n📊 Resumen de Resultados Reales:');
        results.slice(0, 5).forEach((r, i) => {
            console.log(`${i + 1}. [${r.platform}] ${r.name}: S/ ${r.price.toFixed(2)} - URL: ${r.url.substring(0, 50)}...`);
        });

        if (results.length > 0) {
            const minPrice = results[0].price;
            if (minPrice <= 1.50) {
                console.log('\n✅ PRUEBA EXITOSA: Se detectó el precio bajo (S/ ' + minPrice.toFixed(2) + ')');
            } else {
                console.log('\n⚠️ PRUEBA PARCIAL: No se detectó el precio de S/ 1.30, pero se obtuvieron ' + results.length + ' resultados.');
            }
        } else {
            console.log('\n❌ ERROR: No se obtuvieron resultados.');
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testSearch();
