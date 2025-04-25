'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'reset_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'ultimo_acceso'
    });

    await queryInterface.addColumn('usuarios', 'reset_token_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'reset_token'
    });

    console.log('Columnas para recuperación de contraseña añadidas correctamente');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuarios', 'reset_token');
    await queryInterface.removeColumn('usuarios', 'reset_token_expiry');
    
    console.log('Columnas para recuperación de contraseña eliminadas correctamente');
  }
};