/**
 * Modelo para la entidad SeguimientoPedido
 * Registra el historial de cambios de estado de un pedido
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const SeguimientoPedido = sequelize.define('SeguimientoPedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_id: {
        type: DataTypes.STRING(50),  // Cambiado a STRING para coincidir con Pedidos.id
        allowNull: false,
        references: {
            model: 'Pedidos',
            key: 'id'
        },
        comment: 'ID del pedido al que pertenece este seguimiento'
    },
    estado_anterior: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
        allowNull: true,
        comment: 'Estado anterior del pedido'
    },
    estado_nuevo: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
        allowNull: false,
        comment: 'Nuevo estado del pedido'
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora del cambio de estado'
    },
    comentario: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentario o razón del cambio de estado'
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Usuarios',
            key: 'id'
        },
        comment: 'ID del usuario que realizó el cambio'
    }
}, {
    tableName: 'SeguimientoPedidos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['pedido_id'] },
        { fields: ['created_at'] }
    ]
});

// Añadir método associate para establecer relaciones con otros modelos
SeguimientoPedido.associate = function(models) {
    // Relación con Usuario (un seguimiento pertenece a un usuario)
    SeguimientoPedido.belongsTo(models.Usuario, {
        foreignKey: 'usuario_id',
        as: 'usuario'
    });
    
    // Relación con Pedido (un seguimiento pertenece a un pedido)
    SeguimientoPedido.belongsTo(models.Pedido, {
        foreignKey: 'pedido_id',
        as: 'pedido'
    });
};

// Sincronizar el modelo para asegurar que los cambios se apliquen correctamente
sequelize.sync({ alter: false });

module.exports = SeguimientoPedido;