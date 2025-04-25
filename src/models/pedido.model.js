/**
 * Modelo para la entidad Pedido
 * Rediseñado para gestionar exclusivamente pedidos a proveedores
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Pedido = sequelize.define('Pedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Código único del pedido (formato: PP + YYMM + número secuencial)'
    },
    proveedor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID del proveedor al que se hace el pedido'
    },
    fecha_pedido: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha en que se realizó el pedido'
    },
    fecha_entrega_estimada: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha estimada de entrega del pedido'
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendiente',
        comment: 'Estado actual del pedido'
    },
    prioridad: {
        type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
        allowNull: false,
        defaultValue: 'media',
        comment: 'Nivel de prioridad del pedido'
    },
    origen: {
        type: DataTypes.ENUM('reposicion', 'nuevo_producto', 'urgencia', 'promocion', 'otro'),
        allowNull: false,
        defaultValue: 'reposicion',
        comment: 'Categoría del pedido a proveedor'
    },
    direccion_entrega: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Dirección de entrega del pedido'
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre el pedido'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Subtotal del pedido antes de impuestos y descuentos'
    },
    impuestos: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de impuestos aplicados'
    },
    descuento: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de descuentos aplicados'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Monto total del pedido (subtotal + impuestos - descuento)'
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        comment: 'ID del usuario que registró el pedido'
    }
}, {
    tableName: 'Pedidos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['codigo'] },
        { fields: ['proveedor_id'] },
        { fields: ['estado'] },
        { fields: ['fecha_pedido'] }
    ]
});

// Método para establecer las asociaciones del modelo
Pedido.associate = function(models) {
    // Relación con DetallePedido (un pedido tiene muchos detalles)
    Pedido.hasMany(models.DetallePedido, {
        foreignKey: 'pedido_id',
        sourceKey: 'id',
        as: 'detalles'
    });
    
    // Relación con SeguimientoPedido (un pedido tiene muchos seguimientos)
    Pedido.hasMany(models.SeguimientoPedido, {
        foreignKey: 'pedido_id',
        as: 'seguimientos'
    });
    
    // Relación con Usuario (un pedido pertenece a un usuario que lo registró)
    Pedido.belongsTo(models.Usuario, {
        foreignKey: 'usuario_id'
    });
};

// Sincronizar el modelo con la base de datos para asegurar que no haya campos antiguos en caché
sequelize.sync({ alter: false });

module.exports = Pedido;