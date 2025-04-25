const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductoCompuesto = sequelize.define('ProductoCompuesto', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    producto_padre_codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'productos',
        key: 'codigo'
      }
    },
    producto_hijo_codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'productos',
        key: 'codigo'
      }
    },
    cantidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1
    },
    unidad_medida_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'unidades_medida',
        key: 'id'
      }
    }
  }, {
    tableName: 'productos_compuestos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  });

  return ProductoCompuesto;
};