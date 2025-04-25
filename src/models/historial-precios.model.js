const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HistorialPrecios = sequelize.define('HistorialPrecios', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    producto_codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'productos',
        key: 'codigo'
      }
    },
    precio_anterior: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    precio_nuevo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tipo_precio: {
      type: DataTypes.ENUM('compra', 'venta'),
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    motivo: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'historial_precios',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false
  });

  // Add association method to properly set up relationships
  HistorialPrecios.associate = function(models) {
    HistorialPrecios.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  };

  return HistorialPrecios;
};