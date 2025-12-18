/**
 * Utilidad para limpiar y optimizar nombres de productos
 */
class ProductNameCleaner {
    constructor() {
        // Palabras que NO aportan valor a la búsqueda
        this.stopWords = [
            'sin', 'con', 'x', 'y', 'de', 'del', 'la', 'el', 'los', 'las',
            'pack', 'unidad', 'unidades', 'botella', 'lata', 'envase',
            'frasco', 'bolsa', 'caja', 'paquete', 'plastico', 'vidrio',
            'retornable', 'descartable', 'oferta', 'precio', 'gratis',
            'sabor', 'natural', 'artificial', 'original', 'neto', 'contenido',
            'gas'
        ];
        // Ya no necesitamos la lista hardcoded de marcas aquí, 
        // confiaremos en la lógica de posicionamiento.
    }

    /**
     * Limpiar nombre del producto para búsqueda óptima
     */
    clean(productName, brand = null) {
        if (!productName || typeof productName !== 'string') {
            return '';
        }

        // 1. Normalización inicial
        let cleanText = productName
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/[^\w\s.]/g, ' ') // Quitar símbolos raros (menos puntos para decimales 1.5L)
            .replace(/\s+/g, ' ')
            .trim();

        // 2. Preservar unidades pegadas (ej: "500ml" -> "500 ml" para que el buscador lo entienda mejor)
        // Esto separa números de letras: "3kg" -> "3 kg"
        cleanText = cleanText.replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');

        // 3. Filtrado de palabras
        let words = cleanText.split(' ');

        const filteredWords = words.filter(word => {
            // Quitamos stopWords
            if (this.stopWords.includes(word)) return false;
            // Quitamos palabras muy cortas (1 letra) excepto números
            if (word.length < 2 && isNaN(word)) return false;
            return true;
        });

        // 4. Manejo de Marca (Ponerla al principio si existe)
        if (brand) {
            const brandClean = brand.toLowerCase().trim();
            // Quitamos la marca del array si ya estaba (para no repetirla)
            const wordsWithoutBrand = filteredWords.filter(w => !brandClean.includes(w));
            // Ponemos la marca al inicio
            wordsWithoutBrand.unshift(brandClean);
            words = wordsWithoutBrand;
        } else {
            words = filteredWords;
        }

        // 5. Selección inteligente de palabras (Max 4-5)
        // Priorizamos: Marca + Primeras palabras + Números (Cantidades)
        const finalWords = [];
        let count = 0;

        for (const word of words) {
            // Siempre incluimos números o unidades (ej: 500, ml, kg, 3)
            const isNumberOrUnit = /\d/.test(word) || ['ml', 'l', 'kg', 'g', 'oz'].includes(word);

            if (count < 4 || isNumberOrUnit) {
                finalWords.push(word);
                if (!isNumberOrUnit) count++; // Los números no "gastan" el límite de palabras de texto
            }
        }

        // 6. Reconstruir y Capitalizar
        return finalWords
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .trim();
    }

    /**
     * Versión para URLs o APIs
     */
    cleanForSearch(productName, brand = null) {
        return this.clean(productName, brand).toLowerCase();
    }
}

module.exports = new ProductNameCleaner();