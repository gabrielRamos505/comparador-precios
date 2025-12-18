const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
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
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('price_drop', 'system', 'welcome', 'alert'),
        defaultValue: 'system',
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'notifications',
    timestamps: false, // Usamos created_at manual
    indexes: [
        {
            fields: ['user_id'] // Para búsquedas rápidas por usuario
        },
        {
            fields: ['is_read'] // Para filtrar leídas/no leídas rápido
        }
    ]
});

module.exports = Notification;