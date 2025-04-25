/**
 * Modelo para la entidad DetallePedido
 * Representa los productos incluidos en un pedido a proveedor
 * Versión simplificada sin campos de precios
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const DetallePedido = sequelize.define('DetallePedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: 'Pedidos',
            key: 'id'
        },
        comment: 'ID del pedido al que pertenece este detalle'
    },
    producto_codigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: 'productos',
            key: 'codigo'
        },
        comment: 'Código del producto incluido en el pedido'
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Cantidad del producto'
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'recibido'),
        allowNull: false,
        defaultValue: 'pendiente',
        comment: 'Estado de este item del pedido'
    },
    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del detalle de pedido'
    },
    fecha_recepcion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de recepción del producto'
    },
    notas: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Notas adicionales sobre este producto del pedido'
    }
}, {
    tableName: 'detalles_pedido',
    timestamps: false,
    indexes: [
        { fields: ['pedido_id'] },
        { fields: ['producto_codigo'] }
    ]
});

// Método para establecer las asociaciones
DetallePedido.associate = function(models) {
    // Un detalle de pedido pertenece a un pedido
    DetallePedido.belongsTo(models.Pedido, {
        foreignKey: 'pedido_id',
        targetKey: 'id'
    });
    
    // Un detalle de pedido está relacionado con un producto
    DetallePedido.belongsTo(models.Producto, {
        foreignKey: 'producto_codigo',
        targetKey: 'codigo'
    });
};

module.exports = DetallePedido;