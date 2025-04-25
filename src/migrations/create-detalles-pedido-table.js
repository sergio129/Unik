'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando creación de la tabla DetallesPedido...');
      
      await queryInterface.createTable('DetallesPedido', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        pedido_id: {
          type: Sequelize.STRING(50), // Cambiado a STRING para coincidir con el ID de la tabla Pedidos
          allowNull: false,
          references: {
            model: 'Pedidos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        producto_id: {
          type: Sequelize.STRING(50), // Asumiendo que producto_id también es STRING
          allowNull: false
        },
        cantidad: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 1
        },
        precio_unitario: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        descuento: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });

      // Crear índices
      await queryInterface.addIndex('DetallesPedido', ['pedido_id']);
      await queryInterface.addIndex('DetallesPedido', ['producto_id']);
      
      console.log('✅ Tabla DetallesPedido creada correctamente');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error durante la creación de la tabla DetallesPedido:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.dropTable('DetallesPedido');
      console.log('Tabla DetallesPedido eliminada');
      return Promise.resolve();
    } catch (error) {
      console.error('Error al eliminar la tabla DetallesPedido:', error);
      return Promise.reject(error);
    }
  }
};