/**
 * Servicio de caché en memoria para evitar scraping repetido
 * Reduce la carga y previene bloqueos por demasiadas peticiones
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
    }

    /**
     * Guardar datos en caché
     * @param {string} key - Clave única
     * @param {*} value - Datos a guardar
     */
    set(key, value) {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now()
        });
        console.log(`📦 Cache saved: ${key}`);
    }

    /**
     * Obtener datos del caché
     * @param {string} key - Clave a buscar
     * @returns {*} Datos guardados o null si no existe/expiró
     */
    get(key) {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Verificar si expiró
        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_DURATION) {
            this.cache.delete(key);
            console.log(`🗑️ Cache expired: ${key}`);
            return null;
        }

        console.log(`✅ Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
        return cached.data;
    }

    /**
     * Eliminar una entrada del caché
     * @param {string} key - Clave a eliminar
     */
    delete(key) {
        this.cache.delete(key);
        console.log(`🗑️ Cache deleted: ${key}`);
    }

    /**
     * Limpiar todo el caché
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🧹 Cache cleared: ${size} entries removed`);
    }

    /**
     * Obtener estadísticas del caché
     */
    getStats() {
        return {
            entries: this.cache.size,
            duration: this.CACHE_DURATION / 1000 / 60 + ' minutes'
        };
    }
}

module.exports = new CacheService();
