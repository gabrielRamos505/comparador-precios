const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PriceAlert = sequelize.define('PriceAlert', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' }
    },
    platform: { // Tienda (Plaza Vea, Metro, etc.)
        type: DataTypes.STRING,
        allowNull: false,
    },
    target_price: { // Precio al que quiero comprar
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    initial_price: { // Precio cuando creé la alerta (para calcular ahorro)
        type: DataTypes.DECIMAL(10, 2),
    },
    status: {
        type: DataTypes.ENUM('active', 'triggered', 'inactive'),
        defaultValue: 'active',
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'price_alerts',
    timestamps: false,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] } // Útil para que el CRON JOB busque solo las 'active'
    ]
});

module.exports = PriceAlert;