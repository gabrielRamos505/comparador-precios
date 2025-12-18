const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
            model: 'users',
            key: 'id',
        },
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
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

module.exports = SearchHistory;