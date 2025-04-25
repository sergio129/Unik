/**
 * Migración para actualizar el campo origen en la tabla Pedidos
 * Cambia los valores permitidos para adaptarlo a categorías de pedidos a proveedores
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando migración para actualizar el campo origen en Pedidos...');
      
      // Primero, verificar la estructura actual de la columna origen
      const [columnaInfo] = await queryInterface.sequelize.query(`
        SHOW COLUMNS FROM Pedidos WHERE Field = 'origen'
      `);
      
      console.log('Información de la columna origen:', columnaInfo[0]);
      
      // Modificar el tipo de la columna para eliminar la restricción ENUM
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN origen VARCHAR(30) NOT NULL DEFAULT 'reposicion';
      `);
      console.log('✅ Columna origen cambiada temporalmente a VARCHAR para poder actualizarla');
      
      // Por último, volver a establecer la columna como ENUM con los nuevos valores
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN origen ENUM('reposicion', 'nuevo_producto', 'urgencia', 'promocion', 'otro') NOT NULL DEFAULT 'reposicion';
      `);
      console.log('✅ Columna origen configurada como ENUM con los nuevos valores de categorías');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Para revertir, primero convertimos a VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN origen VARCHAR(30) NOT NULL DEFAULT 'tienda';
      `);
      
      // Restauramos el ENUM original
      await queryInterface.sequelize.query(`
        ALTER TABLE Pedidos MODIFY COLUMN origen ENUM('tienda', 'telefono', 'web', 'otro') NOT NULL DEFAULT 'tienda';
      `);
      
      console.log('✅ Rollback completado: campo origen revertido a su estado anterior');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en el rollback de la migración:', error);
      return Promise.reject(error);
    }
  }
};