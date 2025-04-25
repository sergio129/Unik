// Modelo para productos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');
const Categoria = require('./categoria.model');

const Producto = sequelize.define('Producto', {
  codigo: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  lote: {
    type: DataTypes.STRING(50),
    allowNull: true,  // Cambio: ahora es opcional
    defaultValue: ''  // Valor por defecto
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,  // Cambio: ahora es opcional
    defaultValue: 0   // Valor por defecto
  },
  precio_compra: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: true,  // Cambio: ahora es opcional
    defaultValue: 0,  // Valor por defecto
    field: 'cantidad' // Este campo se usará como stock en la aplicación
  },
  peso: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  volumen: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  stock_minimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  imagen_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'id'
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  unidad_medida: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'unidad'
  }
}, {
  tableName: 'productos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Para mantener compatibilidad con el código existente que usa "stock"
Object.defineProperty(Producto.prototype, 'stock', {
  get() {
    return this.cantidad;
  },
  set(value) {
    this.setDataValue('cantidad', value);
  }
});

// Establecer relaciones
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

module.exports = Producto;