'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando corrección de la columna id en tabla Pedidos...');
      
      // Primero, verificar la estructura actual de la tabla
      const tableDescription = await queryInterface.describeTable('Pedidos');
      console.log('Estructura actual de la tabla Pedidos:', JSON.stringify(tableDescription, null, 2));
      
      // Verificar si la columna id no es autoincremental
      if (tableDescription.id && tableDescription.id.autoIncrement !== true) {
        console.log('La columna id no está configurada como autoincremental, aplicando corrección...');
        
        // Primero, eliminar cualquier clave primaria existente
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE Pedidos DROP PRIMARY KEY;
          `);
          console.log('Clave primaria anterior eliminada correctamente');
        } catch (error) {
          // Si no tiene clave primaria, ignorar el error
          console.log('Nota: No se encontró clave primaria anterior para eliminar');
        }
        
        // Luego, modificar la columna id para que sea autoincremental y clave primaria
        await queryInterface.sequelize.query(`
          ALTER TABLE Pedidos MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY;
        `);
        console.log('✅ Columna id de la tabla Pedidos configurada como autoincremental y clave primaria');
      } else {
        console.log('La columna id ya está configurada correctamente como autoincremental.');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error durante la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No es necesario revertir este cambio
  }
};