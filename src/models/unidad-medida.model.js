const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UnidadMedida = sequelize.define('UnidadMedida', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    simbolo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    factor_conversion: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 1
    },
    unidad_base_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'unidades_medida',
        key: 'id'
      }
    }
  }, {
    tableName: 'unidades_medida',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  });

  return UnidadMedida;
};