const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const SearchHistory = sequelize.define('SearchHistory', {
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
    barcode: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    searched_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'search_history',
    timestamps: false,
});

// Relaciones
SearchHistory.belongsTo(User, { foreignKey: 'user_id' });
SearchHistory.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = SearchHistory;
