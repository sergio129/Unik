/**
 * Migration to fix Pedidos table structure
 * This migration ensures that the Pedidos table has the correct structure
 * matching the Pedido model definition, including cliente_id and total columns
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, check if cliente_id column exists
      const columns = await queryInterface.describeTable('Pedidos');
      
      // Add cliente_id column if it doesn't exist
      if (!columns.cliente_id) {
        await queryInterface.addColumn('Pedidos', 'cliente_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'clientes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });

        console.log('Added cliente_id column to Pedidos table');
      }

      // Add total column if it doesn't exist
      if (!columns.total) {
        await queryInterface.addColumn('Pedidos', 'total', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        });

        console.log('Added total column to Pedidos table');
        
        // Update total values based on subtotal
        await queryInterface.sequelize.query(`
          UPDATE Pedidos SET total = subtotal + impuestos WHERE total = 0;
        `);
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Error in migration:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert changes if needed
      const columns = await queryInterface.describeTable('Pedidos');
      
      if (columns.total) {
        await queryInterface.removeColumn('Pedidos', 'total');
        console.log('Removed total column from Pedidos table');
      }

      // Be cautious about removing cliente_id as it might break references
      // Only remove if explicitly needed
      // if (columns.cliente_id) {
      //   await queryInterface.removeColumn('Pedidos', 'cliente_id');
      //   console.log('Removed cliente_id column from Pedidos table');
      // }

      return Promise.resolve();
    } catch (error) {
      console.error('Error in migration rollback:', error);
      return Promise.reject(error);
    }
  }
};