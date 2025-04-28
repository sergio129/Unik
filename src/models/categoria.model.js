// Modelo para categorías de productos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Categoria = sequelize.define('Categoria', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  categoria_padre_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'id'
    }
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Nivel jerárquico de la categoría (1 para principales, >1 para subcategorías)'
  }
}, {
  tableName: 'categorias',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Relación auto-referencial para subcategorías
Categoria.hasMany(Categoria, {
  as: 'subcategorias',
  foreignKey: 'categoria_padre_id'
});

Categoria.belongsTo(Categoria, {
  as: 'categoria_padre',
  foreignKey: 'categoria_padre_id'
});

module.exports = Categoria;