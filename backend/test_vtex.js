const axios = require('axios');

const stores = [
    { name: 'Metro', url: 'https://www.metro.pe/api/catalog_system/pub/products/search/coca%20cola' },
    { name: 'Plaza Vea', url: 'https://www.plazavea.com.pe/api/catalog_system/pub/products/search/coca%20cola' },
    { name: 'Tottus', url: 'https://www.tottus.com.pe/api/catalog_system/pub/products/search/coca%20cola' }
];

async function checkStores() {
    for (const store of stores) {
        try {
            console.log(`Checking ${store.name}...`);
            const response = await axios.get(store.url, {
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0' } // Basic UA to avoid simple blocks
            });

            if (response.headers['content-type'].includes('json')) {
                console.log(`✅ ${store.name}: API Accesible. Results: ${response.data.length} items`);
            } else {
                console.log(`⚠️ ${store.name}: Response is not JSON (${response.headers['content-type']})`);
            }
        } catch (error) {
            console.log(`❌ ${store.name}: Error - ${error.message}`);
        }
    }
}

checkStores();
