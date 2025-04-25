// Modelo para movimientos de inventario
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');
const Producto = require('./producto.model');
const Usuario = require('./usuario.model');

const MovimientoInventario = sequelize.define('MovimientoInventario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  producto_codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'productos',
      key: 'codigo'
    }
  },
  tipo_movimiento: {
    type: DataTypes.ENUM('entrada', 'salida', 'ajuste'),
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  stock_anterior: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  stock_nuevo: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  documento_referencia: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Número de factura, orden de compra, etc.'
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'movimientos_inventario',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Establecer relaciones
MovimientoInventario.belongsTo(Producto, { foreignKey: 'producto_codigo', targetKey: 'codigo', as: 'producto' });
Producto.hasMany(MovimientoInventario, { foreignKey: 'producto_codigo', sourceKey: 'codigo', as: 'movimientos' });

MovimientoInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(MovimientoInventario, { foreignKey: 'usuario_id', as: 'movimientos' });

module.exports = MovimientoInventario;