const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Sesion = sequelize.define('Sesion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_expiracion: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'sesiones',
  timestamps: false
});

// Métodos estáticos
Sesion.verifyToken = async function(token) {
  return await Sesion.findOne({ 
    where: { 
      token, 
      activa: true, 
      fecha_expiracion: { 
        [sequelize.Sequelize.Op.gt]: new Date() 
      } 
    } 
  });
};

Sesion.deactivate = async function(token) {
  try {
    await Sesion.update(
      { activa: false },
      { where: { token } }
    );
    return true;
  } catch (error) {
    console.error('Error al desactivar sesión:', error);
    return false;
  }
};

Sesion.getActiveSessions = async function(userId) {
  return await Sesion.findAll({ 
    where: { 
      usuario_id: userId, 
      activa: true, 
      fecha_expiracion: { 
        [sequelize.Sequelize.Op.gt]: new Date() 
      } 
    },
    attributes: ['id', 'ip_address', 'user_agent', 'fecha_creacion', 'fecha_expiracion']
  });
};

module.exports = Sesion;