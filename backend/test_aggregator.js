require('dotenv').config();
const aggregator = require('./src/services/productAggregatorService');

async function test() {
    console.log('--- STARTING AGGREGATOR TEST ---');
    try {
        const query = 'Coca Cola 3L';
        console.log(`Searching for: "${query}"...`);

        const results = await aggregator.searchPricesByName(query);

        console.log('\n--- FINAL REPORT ---');
        console.log(`Total Results: ${results.length}`);

        const byStore = {};
        results.forEach(r => {
            byStore[r.platform] = (byStore[r.platform] || 0) + 1;
        });
        console.log('By Store:', byStore);

        if (results.length > 0) {
            console.log('Top 3 Results:');
            results.slice(0, 3).forEach(r => {
                console.log(`- ${r.platform}: S/ ${r.price} (${r.name})`);
            });
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

test();
