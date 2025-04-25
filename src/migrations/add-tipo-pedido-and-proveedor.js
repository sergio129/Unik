/**
 * Migración para añadir campos de tipo_pedido y proveedor_id a la tabla Pedidos
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Añadir campo tipo_pedido
      await queryInterface.addColumn('Pedidos', 'tipo_pedido', {
        type: Sequelize.ENUM('cliente', 'proveedor'),
        allowNull: false,
        defaultValue: 'cliente',
        comment: 'Tipo de pedido: pedido de cliente o a proveedor'
      });

      // Añadir campo proveedor_id
      await queryInterface.addColumn('Pedidos', 'proveedor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID del proveedor al que se hace el pedido (solo para tipo_pedido=proveedor)'
      });

      // Modificar columna cliente_id para hacerla nullable
      await queryInterface.changeColumn('Pedidos', 'cliente_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Clientes',
          key: 'id'
        }
      });

      // Añadir índices para los nuevos campos
      await queryInterface.addIndex('Pedidos', ['tipo_pedido']);
      await queryInterface.addIndex('Pedidos', ['proveedor_id']);

      console.log('Migración completada: campos tipo_pedido y proveedor_id añadidos a la tabla Pedidos');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Eliminar índices
      await queryInterface.removeIndex('Pedidos', ['proveedor_id']);
      await queryInterface.removeIndex('Pedidos', ['tipo_pedido']);

      // Restaurar columna cliente_id como no nullable
      await queryInterface.changeColumn('Pedidos', 'cliente_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Clientes',
          key: 'id'
        }
      });

      // Eliminar columnas
      await queryInterface.removeColumn('Pedidos', 'proveedor_id');
      await queryInterface.removeColumn('Pedidos', 'tipo_pedido');

      console.log('Rollback completado: campos tipo_pedido y proveedor_id eliminados de la tabla Pedidos');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en el rollback de la migración:', error);
      return Promise.reject(error);
    }
  }
};