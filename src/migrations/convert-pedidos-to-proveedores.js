/**
 * Migración para convertir la tabla Pedidos para que maneje exclusivamente pedidos a proveedores
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Primero, actualizar todos los pedidos existentes que sean de cliente
      // para no violar la restricción NOT NULL en proveedor_id
      await queryInterface.sequelize.query(`
        UPDATE Pedidos 
        SET proveedor_id = 1 
        WHERE tipo_pedido = 'cliente' AND proveedor_id IS NULL
      `);

      // Eliminar la columna cliente_id
      await queryInterface.removeColumn('Pedidos', 'cliente_id');

      // Eliminar la columna tipo_pedido
      await queryInterface.removeColumn('Pedidos', 'tipo_pedido');

      // Modificar columna proveedor_id para hacerla NOT NULL
      await queryInterface.changeColumn('Pedidos', 'proveedor_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID del proveedor al que se hace el pedido'
      });

      console.log('Migración completada: La tabla Pedidos ahora maneja exclusivamente pedidos a proveedores');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Volver a añadir columna tipo_pedido
      await queryInterface.addColumn('Pedidos', 'tipo_pedido', {
        type: Sequelize.ENUM('cliente', 'proveedor'),
        allowNull: false,
        defaultValue: 'proveedor',
        comment: 'Tipo de pedido: pedido de cliente o a proveedor'
      });

      // Volver a añadir columna cliente_id
      await queryInterface.addColumn('Pedidos', 'cliente_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Clientes',
          key: 'id'
        },
        comment: 'ID del cliente que realiza el pedido (solo para tipo_pedido=cliente)'
      });

      // Modificar columna proveedor_id para permitir NULL
      await queryInterface.changeColumn('Pedidos', 'proveedor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID del proveedor al que se hace el pedido (solo para tipo_pedido=proveedor)'
      });

      console.log('Rollback completado: La tabla Pedidos restaurada para manejar pedidos de clientes y proveedores');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en el rollback de la migración:', error);
      return Promise.reject(error);
    }
  }
};