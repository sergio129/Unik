/**
 * Modelo para la entidad Proveedor
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Proveedor = sequelize.define('Proveedor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    nit: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true
    },
    direccion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    contacto: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre de la persona de contacto'
    },
    categoria: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Categoría o tipo de proveedor'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pais: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'proveedores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Método para establecer las asociaciones del modelo
Proveedor.associate = function(models) {
    // Un proveedor tiene muchos pedidos
    Proveedor.hasMany(models.Pedido, {
        foreignKey: 'proveedor_id',
        as: 'pedidos'
    });
};

module.exports = Proveedor;