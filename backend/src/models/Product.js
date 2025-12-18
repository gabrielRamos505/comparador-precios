const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    barcode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // ... resto de campos igual ...
    brand: {
        type: DataTypes.STRING,
    },
    category: {
        type: DataTypes.STRING,
    },
    image_url: {
        type: DataTypes.TEXT,
    },
    description: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // ✅ MEJORA: Índices para búsqueda rápida
    indexes: [
        {
            unique: true,
            fields: ['barcode'] // Ya lo tienes implícito por unique: true, pero no hace daño
        },
        {
            fields: ['name'] // 🚀 Acelera búsquedas por nombre si las haces en el futuro
        }
    ]
});

module.exports = Product;