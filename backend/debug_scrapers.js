const axios = require('axios');

async function debugTottus() {
    try {
        console.log('--- CUSTOM DEBUG TOTTUS ---');
        const url = 'https://www.tottus.com.pe/api/catalog_system/pub/products/search/coca%20cola';
        // Agregamos User-Agent móvil a veces ayuda
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.tottus.com.pe/'
            }
        });
        console.log(`Tottus Status: ${response.status}`);
        console.log(`Tottus Data Type: ${typeof response.data}`);
        if (Array.isArray(response.data)) {
            console.log(`Tottus Items: ${response.data.length}`);
        } else {
            console.log(`Tottus Body:`, response.data.slice(0, 200));
        }
    } catch (error) {
        console.log(`Tottus Error: ${error.message}`);
        if (error.response) console.log(`Status: ${error.response.status}`);
    }
}

async function checkWongHTML() {
    try {
        console.log('\n--- CHECK WONG HTML ---');
        const response = await axios.get('https://www.wong.pe/busca?ft=coca%20cola', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const html = response.data;
        if (html.includes('product-item') || html.includes('vtex-product-summary')) {
            console.log('✅ Wong returns SSR HTML with products (Cheerio is viable)');
        } else {
            console.log('⚠️ Wong HTML might be empty or CSR only.');
            console.log('Snippet:', html.slice(0, 500));
        }
    } catch (error) {
        console.log(`Wong Error: ${error.message}`);
    }
}

debugTottus();
checkWongHTML();
