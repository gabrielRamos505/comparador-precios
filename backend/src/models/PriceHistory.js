const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PriceHistory = sequelize.define('PriceHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
    },
    platform: {
        type: DataTypes.STRING, // Ej: "Plaza Vea", "Mercado Libre"
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2), // Ej: 15.99
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'PEN',
    },
    recorded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'price_history',
    timestamps: false, // Usamos recorded_at
    indexes: [
        {
            fields: ['product_id']
        },
        {
            fields: ['recorded_at']
        }
    ]
});

module.exports = PriceHistory;