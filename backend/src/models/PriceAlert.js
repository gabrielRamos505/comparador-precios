const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const PriceAlert = sequelize.define('PriceAlert', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Product,
            key: 'id',
        },
    },
    platform: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    target_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    current_price: {
        type: DataTypes.DECIMAL(10, 2),
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'price_alerts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Relaciones
PriceAlert.belongsTo(User, { foreignKey: 'user_id' });
PriceAlert.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = PriceAlert;
