require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./src/config/database');

// ---------------------------------------------------
// IMPORTAR MODELOS
// ---------------------------------------------------
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const SearchHistory = require('./src/models/SearchHistory');
const Favorite = require('./src/models/Favorite');
const PriceAlert = require('./src/models/PriceAlert');
const Review = require('./src/models/Review');
const Notification = require('./src/models/Notification');
const PriceHistory = require('./src/models/PriceHistory'); // ✅ Modelo crítico para gráficas

// Verificación rápida de API Keys en consola
console.log('------------------------------------------------');
console.log('🔑 SYSTEM CHECKS:');
console.log(`   🔹 SERPAPI_KEY: ${process.env.SERPAPI_KEY ? 'LOADED ✅' : 'MISSING ❌'}`);
console.log(`   🔹 GEMINI_KEY : ${process.env.GEMINI_API_KEY ? 'LOADED ✅' : 'MISSING ❌'}`);
console.log('------------------------------------------------');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------
app.use(cors());

// Aumentamos el límite a 50mb para permitir subir fotos desde el celular en base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logger de peticiones (útil para depurar)
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// ---------------------------------------------------
// CONFIGURACIÓN DE ASOCIACIONES (RELACIONES DB)
// ---------------------------------------------------
const setupAssociations = () => {
    // 1. Historial de Búsqueda
    SearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
    SearchHistory.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
    User.hasMany(SearchHistory, { foreignKey: 'user_id' });
    Product.hasMany(SearchHistory, { foreignKey: 'product_id' });

    // 2. Favoritos
    Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
    Favorite.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
    User.hasMany(Favorite, { foreignKey: 'user_id' });
    Product.hasMany(Favorite, { foreignKey: 'product_id' });

    // 3. Alertas de Precio
    PriceAlert.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
    PriceAlert.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
    User.hasMany(PriceAlert, { foreignKey: 'user_id' });
    Product.hasMany(PriceAlert, { foreignKey: 'product_id' });

    // 4. Reseñas (Reviews)
    Review.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
    Review.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
    User.hasMany(Review, { foreignKey: 'user_id' });
    Product.hasMany(Review, { foreignKey: 'product_id' });

    // 5. Notificaciones
    Notification.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
    User.hasMany(Notification, { foreignKey: 'user_id' });

    // 6. Historial de Precios (Evolución temporal)
    PriceHistory.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
    Product.hasMany(PriceHistory, { foreignKey: 'product_id' });

    console.log('✅ Database associations configured successfully');
};

setupAssociations();

// ---------------------------------------------------
// INICIALIZACIÓN DE BASE DE DATOS
// ---------------------------------------------------
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected successfully');

        // Sincronizar modelos con la DB
        // alter: true -> actualiza las tablas si agregaste columnas nuevas sin borrar datos
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');
    } catch (error) {
        console.error('❌ Error connecting/syncing database:', error.message);
    }
})();

// ---------------------------------------------------
// RUTAS DE LA API
// ---------------------------------------------------
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products')); // Incluye búsqueda, barcode e IA
app.use('/api/history', require('./src/routes/history'));
app.use('/api/favorites', require('./src/routes/favorites'));
app.use('/api/price-alerts', require('./src/routes/priceAlerts'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/notifications', require('./src/routes/notifications'));

// ---------------------------------------------------
// RUTAS DE UTILIDAD
// ---------------------------------------------------
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Comparador RA API is healthy',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to AR Shopping API 🚀' });
});

// ---------------------------------------------------
// MANEJO DE ERRORES GLOBAL
// ---------------------------------------------------
app.use((err, req, res, next) => {
    console.error('❌ Global Server Error:', err.message);
    // console.error(err.stack); // Descomentar en desarrollo si necesitas ver el stack completo
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});

// ---------------------------------------------------
// INICIO DEL SERVIDOR
// ---------------------------------------------------
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}\n`);
});

// 🔧 CONFIGURACIÓN DE TIMEOUT
// Los scrapers (Plaza Vea, Tottus, etc.) pueden tardar.
// Aumentamos el timeout a 5 minutos (300,000 ms) para evitar que el servidor corte la conexión.
server.setTimeout(300000);

// Manejo de cierre limpio (Graceful Shutdown)
process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping server...');
    await sequelize.close();
    console.log('✅ Database connection closed.');
    process.exit(0);
});