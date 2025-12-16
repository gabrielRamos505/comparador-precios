const User = require('./User');
const Product = require('./Product');
const SearchHistory = require('./SearchHistory');
const Favorite = require('./Favorite');
const PriceAlert = require('./PriceAlert');
const Review = require('./Review');

// Sincronizar modelos (solo en desarrollo)
const syncDatabase = async () => {
    try {
        // alter: true actualiza tablas sin borrar datos
        // force: true BORRA Y RECREA (¡CUIDADO!)
        await User.sync({ alter: true });
        await Product.sync({ alter: true });
        await SearchHistory.sync({ alter: true });
        await Favorite.sync({ alter: true });
        await PriceAlert.sync({ alter: true });
        await Review.sync({ alter: true });
        console.log('✅ Database models synchronized');
    } catch (error) {
        console.error('❌ Error syncing database:', error.message);
    }
};

module.exports = {
    User,
    Product,
    SearchHistory,
    Favorite,
    PriceAlert,
    Review,
    syncDatabase,
};
