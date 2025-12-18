const fs = require('fs');

try {
    const buffer = fs.readFileSync('models_list.json');
    // Intentar UTF-8 primero, luego UTF-16
    let content = buffer.toString('utf8');
    if (content.includes('\u0000')) {
        content = buffer.toString('utf16le');
    }

    // Limpiar BOM
    content = content.trim().replace(/^\uFEFF/, '');

    const data = JSON.parse(content);
    console.log('Total modelos:', data.models.length);

    const flashModels = data.models.filter(m => m.name.toLowerCase().includes('flash'));
    console.log('Modelos Flash:');
    flashModels.forEach(m => console.log(`- ${m.name}`));

    const proModels = data.models.filter(m => m.name.toLowerCase().includes('pro'));
    console.log('Modelos Pro:');
    proModels.forEach(m => console.log(`- ${m.name}`));

} catch (e) {
    console.error('Error:', e.message);
}
