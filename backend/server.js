require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar base de datos y modelos
const sequelize = require('./src/config/database');
const { syncDatabase } = require('./src/models');

console.log('🔑 SERPAPI_KEY loaded:', process.env.SERPAPI_KEY ? 'YES ✅' : 'NO ❌');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Log de todas las peticiones
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Sincronizar base de datos al iniciar
syncDatabase();

// Routes
const authRouter = require('./src/routes/auth');
const historyRouter = require('./src/routes/history');
const favoritesRouter = require('./src/routes/favorites');
const priceAlertsRouter = require('./src/routes/priceAlerts');
const reviewsRouter = require('./src/routes/reviews');
const productsRouter = require('./src/routes/products');
const aiRoutes = require('./src/routes/ai');


app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/price-alerts', priceAlertsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/products', productsRouter);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Comparador RA API is running' });
});

app.get('/', (req, res) => {
    res.json({ message: 'AR Shopping API is running!' });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({
        success: false,
        error: err.message,
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
