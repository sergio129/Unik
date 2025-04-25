/**
 * Migración para añadir campos adicionales a la tabla Pedidos
 * Estos campos son para los datos de contacto y condiciones de pago
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando migración para añadir campos adicionales a la tabla Pedidos...');
      
      // Añadir campo persona_contacto
      await queryInterface.addColumn('Pedidos', 'persona_contacto', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Persona de contacto para la recepción del pedido'
      });
      console.log('Campo persona_contacto añadido');
      
      // Añadir campo condiciones_pago
      await queryInterface.addColumn('Pedidos', 'condiciones_pago', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'credito_30',
        comment: 'Condiciones de pago del pedido (contado, credito_30, credito_60, etc.)'
      });
      console.log('Campo condiciones_pago añadido');
      
      // Añadir campo metodo_envio
      await queryInterface.addColumn('Pedidos', 'metodo_envio', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'proveedor',
        comment: 'Método de envío del pedido (proveedor, propio, mensajeria, etc.)'
      });
      console.log('Campo metodo_envio añadido');
      
      // Añadir campo notas_adicionales
      await queryInterface.addColumn('Pedidos', 'notas_adicionales', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre el pedido'
      });
      console.log('Campo notas_adicionales añadido');

      console.log('✅ Migración completada: campos adicionales añadidos a la tabla Pedidos');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Eliminar los campos en orden inverso
      await queryInterface.removeColumn('Pedidos', 'notas_adicionales');
      await queryInterface.removeColumn('Pedidos', 'metodo_envio');
      await queryInterface.removeColumn('Pedidos', 'condiciones_pago');
      await queryInterface.removeColumn('Pedidos', 'persona_contacto');
      
      console.log('Rollback completado: campos adicionales eliminados de la tabla Pedidos');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en el rollback de la migración:', error);
      return Promise.reject(error);
    }
  }
};