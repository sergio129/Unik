// Modelo para clientes
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tipo_documento: {
    type: DataTypes.ENUM('CC', 'CE', 'NIT', 'TI', 'PP'),
    allowNull: true,
    comment: 'CC=Cédula de Ciudadanía, CE=Cédula de Extranjería, NIT=Número de Identificación Tributaria, TI=Tarjeta de Identidad, PP=Pasaporte'
  },
  documento: {
    type: DataTypes.STRING(20),
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
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'clientes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Método estático para buscar por documento
Cliente.findByDocumento = async function(documento) {
  return await Cliente.findOne({ where: { documento } });
};

// Método estático para buscar clientes activos
Cliente.findActivos = async function() {
  return await Cliente.findAll({ where: { activo: true } });
};

// Método para establecer las asociaciones del modelo
Cliente.associate = function(models) {
  // Relación con Pedido (un cliente tiene muchos pedidos)
  Cliente.hasMany(models.Pedido, {
    foreignKey: 'cliente_id'
  });
};

module.exports = Cliente;