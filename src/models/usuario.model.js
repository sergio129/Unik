const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../utils/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  nombre_completo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rol: {
    type: DataTypes.ENUM('admin', 'vendedor', 'inventario'),
    allowNull: false,
    defaultValue: 'vendedor'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password) {
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    }
  }
});

// Métodos estáticos
Usuario.findByUsername = async function(username) {
  return await Usuario.findOne({ where: { username } });
};

Usuario.updateLastAccess = async function(userId) {
  try {
    await Usuario.update(
      { ultimo_acceso: new Date() },
      { where: { id: userId } }
    );
    return true;
  } catch (error) {
    console.error('Error al actualizar último acceso:', error);
    return false;
  }
};

// Método de instancia para verificar contraseña
Usuario.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Usuario;