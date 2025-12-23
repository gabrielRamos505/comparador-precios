const axios = require('axios');

class OpenFoodFactsService {
    constructor() {
        // ✅ CAMBIO CRÍTICO: Usar base de datos MUNDIAL (tiene más productos)
        this.baseUrl = 'https://world.openfoodfacts.org/api/v2';
    }

    async getProductByBarcode(barcode) {
        try {
            console.log(`📡 OpenFoodFacts: Consultando ${barcode}...`);

            const response = await axios.get(
                `${this.baseUrl}/product/${barcode}.json`,
                {
                    headers: {
                        'User-Agent': 'ComparadorRA - App - Version 1.0',
                    },
                    timeout: 8000
                }
            );

            if (response.data.status === 1) {
                const product = response.data.product;

                // 1️⃣ EXTRACCIÓN INTELIGENTE DEL NOMBRE
                const originalName = this._extractBestName(product);

                // 2️⃣ EXTRACCIÓN DE MARCA (sin hardcodear)
                const brand = this._extractBrand(product, originalName);

                // 3️⃣ EXTRACCIÓN DE CANTIDAD
                const quantity = product.quantity || product.product_quantity || '';

                // 4️⃣ CONSTRUCCIÓN DEL NOMBRE DE BÚSQUEDA
                const searchName = this._buildSearchName(originalName, brand, quantity);

                console.log(`📦 Producto OpenFoodFacts:`);
                console.log(`   Original: "${originalName}"`);
                console.log(`   Marca: "${brand}"`);
                console.log(`   Cantidad: "${quantity}"`);
                console.log(`   Búsqueda: "${searchName}"`);

                return {
                    id: product.code || barcode,
                    barcode: barcode,
                    name: searchName, // 🎯 Este nombre va a los scrapers
                    nameOriginal: originalName,
                    brand: brand,
                    quantity: quantity,
                    category: this._extractCategory(product),
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

    /**
     * 🧠 MÉTODO INTELIGENTE: Extrae el mejor nombre disponible
     */
    _extractBestName(product) {
        // Prioridad: Nombre en español > Nombre en inglés > Nombre genérico
        const candidates = [
            product.product_name_es,
            product.product_name_es_PE, // Específico de Perú
            product.product_name,
            product.product_name_en,
            product.generic_name_es,
            product.generic_name,
            product.brands // Fallback extremo
        ];

        for (const name of candidates) {
            if (name && typeof name === 'string' && name.trim().length > 3) {
                return name.trim();
            }
        }

        return 'Producto desconocido';
    }

    /**
     * 🏷️ MÉTODO INTELIGENTE: Extrae la marca sin hardcodear
     */
    _extractBrand(product, productName) {
        // 1. Intentar obtener marca del campo oficial
        if (product.brands && product.brands.trim()) {
            // Limpiar: "Gloria,Nestlé" → "Gloria"
            const mainBrand = product.brands.split(',')[0].trim();
            if (mainBrand) return mainBrand;
        }

        // 2. Intentar extraer del nombre usando mayúsculas
        const words = productName.split(' ');
        for (const word of words) {
            // Si una palabra está toda en mayúsculas y tiene más de 2 letras, probablemente es la marca
            if (word === word.toUpperCase() && word.length > 2 && /^[A-Z]+$/.test(word)) {
                return word;
            }
        }

        // 3. Tomar la primera palabra como marca (común en productos)
        const firstWord = words[0];
        if (firstWord && firstWord.length > 2) {
            // Capitalizar: "gloria" → "Gloria"
            return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
        }

        return null;
    }

    /**
     * 🏗️ MÉTODO INTELIGENTE: Construye nombre óptimo para búsqueda
     */
    _buildSearchName(originalName, brand, quantity) {
        let searchName = originalName;

        // ✅ REGLA 1: Si la marca NO está en el nombre, agregarla al inicio
        if (brand && !searchName.toLowerCase().includes(brand.toLowerCase())) {
            searchName = `${brand} ${searchName}`;
        }

        // ✅ REGLA 2: Si la cantidad NO está en el nombre, agregarla
        if (quantity && !searchName.toLowerCase().includes(quantity.toLowerCase())) {
            // Limpiar cantidad: "1 kg" → "1kg"
            const cleanQuantity = quantity.replace(/\s+/g, '').toLowerCase();
            searchName = `${searchName} ${cleanQuantity}`;
        }

        // ✅ REGLA 3: Limpieza suave (solo caracteres extraños, mantener palabras clave)
        searchName = searchName
            .replace(/[^\w\sáéíóúñ.]/gi, ' ') // Permitir acentos y puntos
            .replace(/\s+/g, ' ') // Múltiples espacios → 1 espacio
            .trim();

        // ✅ REGLA 4: Límite de longitud (máximo 6 palabras)
        const words = searchName.split(' ');
        if (words.length > 6) {
            searchName = words.slice(0, 6).join(' ');
        }

        return searchName;
    }

    /**
     * 📂 MÉTODO: Extrae categoría inteligente
     */
    _extractCategory(product) {
        const categories = product.categories || '';
        const categoriesLower = categories.toLowerCase();

        // Mapeo de categorías OFF → Categorías locales
        const categoryMap = {
            'yogurt': 'Lácteos',
            'yoghurt': 'Lácteos',
            'leche': 'Lácteos',
            'queso': 'Lácteos',
            'mantequilla': 'Lácteos',
            'agua': 'Bebidas',
            'gaseosa': 'Bebidas',
            'jugo': 'Bebidas',
            'refresco': 'Bebidas',
            'cerveza': 'Bebidas',
            'vino': 'Bebidas',
            'arroz': 'Abarrotes',
            'fideo': 'Abarrotes',
            'pasta': 'Abarrotes',
            'aceite': 'Abarrotes',
            'conserva': 'Abarrotes',
            'galleta': 'Snacks',
            'chocolate': 'Snacks',
            'dulce': 'Snacks',
            'caramelo': 'Snacks',
            'shampoo': 'Higiene Personal',
            'jabón': 'Higiene Personal',
            'pasta dental': 'Higiene Personal',
            'detergente': 'Limpieza',
            'lejía': 'Limpieza',
            'limpiador': 'Limpieza',
        };

        for (const [keyword, category] of Object.entries(categoryMap)) {
            if (categoriesLower.includes(keyword)) {
                return category;
            }
        }

        return 'General';
    }

    /**
     * 🔍 BÚSQUEDA POR TEXTO (mantener para compatibilidad)
     */
    async searchProducts(query) {
        try {
            const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl`;

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
                    const originalName = this._extractBestName(product);
                    const brand = this._extractBrand(product, originalName);
                    const quantity = product.quantity || '';
                    const searchName = this._buildSearchName(originalName, brand, quantity);

                    return {
                        id: product.code,
                        barcode: product.code,
                        name: searchName,
                        nameOriginal: originalName,
                        brand: brand,
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