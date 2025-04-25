// Modelo para detalles de facturas
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');
const Factura = require('./factura.model');
const Producto = require('./producto.model');

const DetalleFactura = sequelize.define('DetalleFactura', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  factura_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'facturas',
      key: 'id'
    }
  },
  producto_codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'productos',
      key: 'codigo'
    }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  impuesto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  descuento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  }
}, {
  tableName: 'detalles_facturas',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Establecer relaciones
DetalleFactura.belongsTo(Factura, { foreignKey: 'factura_id', as: 'factura' });
Factura.hasMany(DetalleFactura, { foreignKey: 'factura_id', as: 'detalles' });

DetalleFactura.belongsTo(Producto, { foreignKey: 'producto_codigo', targetKey: 'codigo', as: 'producto' });
Producto.hasMany(DetalleFactura, { foreignKey: 'producto_codigo', sourceKey: 'codigo', as: 'detalles_facturas' });

module.exports = DetalleFactura;