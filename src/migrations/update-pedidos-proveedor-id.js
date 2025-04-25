'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando actualización de la columna proveedor_id en Pedidos...');
      
      // Modificar la columna proveedor_id para permitir valores NULL
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN proveedor_id INT NULL;
      `);
      
      console.log('✅ Columna proveedor_id de la tabla Pedidos actualizada correctamente para permitir NULL');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error durante la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revertir cambio si es necesario (volver a NOT NULL)
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN proveedor_id INT NOT NULL;
      `);
      
      console.log('Columna proveedor_id revertida a NOT NULL');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al revertir la migración:', error);
      return Promise.reject(error);
    }
  }
};