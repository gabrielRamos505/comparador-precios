const axios = require('axios');
const productNameCleaner = require('../utils/productNameCleaner');

class OpenFoodFactsService {
    constructor() {
        // ✅ Usar el dominio de Perú para priorizar datos locales
        this.baseUrl = 'https://pe.openfoodfacts.org/api/v2';
    }

    async getProductByBarcode(barcode) {
        try {
            console.log(`📡 OpenFoodFacts: Consultando ${barcode}...`);

            const response = await axios.get(
                `${this.baseUrl}/product/${barcode}.json`,
                {
                    headers: {
                        // ⚠️ OFF es estricto. Usa un UA descriptivo con contacto si es posible
                        'User-Agent': 'ComparadorRA - App - Version 1.0 - (tu_email@gmail.com)',
                    },
                    timeout: 5000 // Timeout corto, si falla pasamos a otra cosa
                }
            );

            if (response.data.status === 1) {
                const product = response.data.product;

                // 1. Obtener datos crudos
                const originalName = product.product_name || product.product_name_es || 'Producto desconocido';
                let brand = product.brands || '';
                const quantity = product.quantity || product.product_quantity || ''; // Ej: "500 ml"

                // ✅ FIX: Si la marca está vacía, intentar extraerla del nombre del producto
                if (!brand && originalName) {
                    const nameLower = originalName.toLowerCase();
                    // Marcas comunes en Perú
                    if (nameLower.includes('cielo')) brand = 'Cielo';
                    else if (nameLower.includes('san luis')) brand = 'San Luis';
                    else if (nameLower.includes('san mateo')) brand = 'San Mateo';
                    else if (nameLower.includes('coca cola') || nameLower.includes('coca-cola')) brand = 'Coca-Cola';
                    else if (nameLower.includes('inca kola')) brand = 'Inca Kola';
                    else if (nameLower.includes('pepsi')) brand = 'Pepsi';
                    else if (nameLower.includes('sprite')) brand = 'Sprite';
                    else if (nameLower.includes('fanta')) brand = 'Fanta';
                }

                // 2. Limpieza inteligente
                // Si la marca es "Aje" y es agua, probablemente es "Cielo"
                let brandCorrection = brand;
                if (brand.toLowerCase().includes('aje') && originalName.toLowerCase().includes('agua')) {
                    brandCorrection = 'Cielo';
                }

                let cleanedName = productNameCleaner.clean(originalName, brandCorrection);

                // Si cleanedName es muy corto o genérico, intentamos mejorarlo
                if (cleanedName.length < 10 && !cleanedName.toLowerCase().includes(brandCorrection.toLowerCase())) {
                    cleanedName = `${brandCorrection} ${cleanedName}`;
                }

                // Si la cantidad no está en el nombre limpio, la agregamos para ayudar a los scrapers
                if (quantity && !cleanedName.toLowerCase().includes(quantity.toLowerCase())) {
                    cleanedName = `${cleanedName} ${quantity}`;
                }

                console.log(`📦 Producto OpenFoodFacts:`);
                console.log(`   Original: "${originalName}"`);
                console.log(`   Cantidad: "${quantity}"`);
                console.log(`   Marca/Corección: "${brandCorrection}"`);
                console.log(`   Búsqueda: "${cleanedName}"`);

                return {
                    id: product.code || barcode,
                    barcode: barcode,
                    name: cleanedName, // Nombre optimizado para buscar en PlazaVea, Metro, etc.
                    nameOriginal: originalName,
                    brand: brand,
                    quantity: quantity, // ✅ Importante para calcular precio por unidad
                    category: product.categories || null,
                    imageUrl: product.image_url || product.image_front_url || null,
                    description: product.generic_name || null,
                    nutritionGrade: product.nutrition_grades || null,
                    source: 'Open Food Facts',
                };
            }

            console.log('   ⚠️ OFF: Código de barras no encontrado');
            return null;

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.warn(`   ⚠️ OFF: Producto ${barcode} no encontrado (404)`);
            } else {
                console.error('   ❌ Error Open Food Facts:', error.message);
            }
            return null;
        }
    }

    async searchProducts(query) {
        try {
            // Usamos el endpoint clásico de búsqueda que es más flexible
            const searchUrl = `https://pe.openfoodfacts.org/cgi/search.pl`;

            const response = await axios.get(searchUrl, {
                params: {
                    search_terms: query,
                    search_simple: 1,
                    action: 'process',
                    json: 1,
                    page_size: 10,
                    fields: 'code,product_name,product_name_es,brands,image_url,categories,quantity'
                },
                headers: {
                    'User-Agent': 'ComparadorRA - App - Version 1.0',
                }
            });

            if (response.data.products && response.data.products.length > 0) {
                return response.data.products.map(product => {
                    const originalName = product.product_name || product.product_name_es || 'Sin nombre';
                    const quantity = product.quantity || '';

                    let cleanedName = productNameCleaner.clean(originalName, product.brands);
                    if (quantity) cleanedName += ` ${quantity}`;

                    return {
                        id: product.code,
                        barcode: product.code,
                        name: cleanedName,
                        nameOriginal: originalName,
                        brand: product.brands || null,
                        quantity: quantity,
                        imageUrl: product.image_url || null,
                        source: 'Open Food Facts',
                    };
                });
            }

            return [];
        } catch (error) {
            console.error('Error searching Open Food Facts:', error.message);
            return [];
        }
    }
}

module.exports = new OpenFoodFactsService();