/**
 * Modelo para las notificaciones del sistema
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');
const Usuario = require('./usuario.model');

const Notificacion = sequelize.define('Notificacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    titulo: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    mensaje: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'info',
        comment: 'Tipo de notificación: info, warning, success, error'
    },
    vista: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la notificación ha sido vista por el usuario'
    },
    leida: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el usuario ha leído la notificación'
    },
    datos: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos adicionales en formato JSON'
    },
    entidad_tipo: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Tipo de entidad asociada: pedido, producto, venta, etc.'
    },
    entidad_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID de la entidad asociada'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    tableName: 'notificaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Establecer relación con Usuario
Notificacion.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Usuario.hasMany(Notificacion, { foreignKey: 'usuario_id' });

// Obtener notificaciones no leídas de un usuario
Notificacion.getActiveSessions = async (usuarioId) => {
    return await Notificacion.findAll({
        where: {
            usuario_id: usuarioId,
            leida: false
        },
        order: [['created_at', 'DESC']]
    });
};

// Encontrar notificación por ID
Notificacion.findById = async (id) => {
    return await Notificacion.findByPk(id);
};

// Crear una nueva notificación
Notificacion.createNotification = async (data) => {
    return await Notificacion.create(data);
};

module.exports = Notificacion;