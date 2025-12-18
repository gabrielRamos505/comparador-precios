const fs = require('fs');
try {
    const buf = fs.readFileSync('models_list.json');
    let c = buf.toString('utf16le').replace(/^\uFEFF/, '').trim();
    const data = JSON.parse(c);
    console.log('--- MODELOS QUE SOPORTAN GENERATE CONTENT ---');
    data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
            console.log(`- ${m.name} (${m.displayName})`);
        }
    });
} catch (e) {
    console.error(e);
}
