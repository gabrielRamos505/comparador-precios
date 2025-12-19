class ProductNameCleaner {
    clean(originalName, brand) {
        if (!originalName || typeof originalName !== 'string') return '';

        // 1. Quitar marcas conocidas duplicadas en el nombre
        let name = originalName.toLowerCase();
        if (brand) {
            const brandLower = brand.toLowerCase();
            name = name.replace(brandLower, '').trim();
        }

        // 2. Palabras a eliminar que ensucian la busqueda en PlazaVea/Metro
        const stopWords = [
            'botella', 'lata', 'pack', 'caja', 'bolsa', 'paquete', 'unidad',
            'gaseosa', 'bebida', 'refresco', 'sabor', 'original', 'sin azucar',
            'no retornable', 'retornable', 'descartable', 'plastico', 'vidrio',
            // Palabras en ingles comunes en OFF
            'bottle', 'can', 'box', 'bag'
        ];

        stopWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            name = name.replace(regex, '');
        });

        // 3. Limpieza de caracteres especiales (conservar puntos para 1.5L)
        name = name.replace(/[^\w\s\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // 4. Reconstrucción inteligente: MARCA + NOMBRE LIMPIO
        let finalQuery = name;
        if (brand && !finalQuery.includes(brand.toLowerCase())) {
            finalQuery = `${brand} ${finalQuery}`;
        }

        // Limitar longitud: Max 4 palabras para evitar "0 encotrados"
        const words = finalQuery.split(' ');
        if (words.length > 4) {
            finalQuery = words.slice(0, 4).join(' ');
        }

        return finalQuery.trim();
    }
}

module.exports = new ProductNameCleaner();