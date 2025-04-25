const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CodigoBarras = sequelize.define('CodigoBarras', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    producto_codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'productos',
        key: 'codigo'
      }
    },
    tipo: {
      type: DataTypes.ENUM('EAN13', 'EAN8', 'CODE128', 'UPC', 'QR', 'OTHER'),
      allowNull: false,
      defaultValue: 'EAN13'
    },
    principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'codigos_barras',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  });

  return CodigoBarras;
};