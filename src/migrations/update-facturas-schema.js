// update-facturas-schema.js
// Migración para actualizar el esquema de la tabla de facturas

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 1. Primero modificamos la columna estado para incluir 'anulada'
      await queryInterface.sequelize.query(
        "ALTER TABLE facturas MODIFY COLUMN estado ENUM('pendiente', 'pagada', 'anulada') DEFAULT 'pendiente';"
      );

      // 2. Modificamos la columna metodo_pago para incluir nuevos métodos
      await queryInterface.sequelize.query(
        "ALTER TABLE facturas MODIFY COLUMN metodo_pago ENUM('efectivo', 'transferencia', 'pago_movil', 'tarjeta', 'mixto', 'devolucion') DEFAULT 'efectivo';"
      );

      // 3. Añadimos la columna tipo_documento
      await queryInterface.addColumn('facturas', 'tipo_documento', {
        type: Sequelize.ENUM('factura', 'nota_credito', 'nota_debito', 'factura_electronica'),
        allowNull: true,
        defaultValue: 'factura',
        after: 'observaciones'
      });

      // 4. Añadimos la columna factura_relacionada_id
      await queryInterface.addColumn('facturas', 'factura_relacionada_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'facturas',
          key: 'id'
        },
        after: 'tipo_documento'
      });

      // 5. Añadimos los campos para factura electrónica
      await queryInterface.addColumn('facturas', 'cufe', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Código Único de Factura Electrónica',
        after: 'factura_relacionada_id'
      });

      await queryInterface.addColumn('facturas', 'qr_code', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Código QR para validación de factura electrónica',
        after: 'cufe'
      });

      await queryInterface.addColumn('facturas', 'validacion_dian', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Indica si la factura ha sido validada por la DIAN',
        after: 'qr_code'
      });

      await queryInterface.addColumn('facturas', 'fecha_validacion', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha de validación por la DIAN',
        after: 'validacion_dian'
      });

      console.log('Migración de actualización de facturas completada con éxito.');
      return true;
    } catch (error) {
      console.error('Error al ejecutar migración de facturas:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revertir todos los cambios en orden inverso
      await queryInterface.removeColumn('facturas', 'fecha_validacion');
      await queryInterface.removeColumn('facturas', 'validacion_dian');
      await queryInterface.removeColumn('facturas', 'qr_code');
      await queryInterface.removeColumn('facturas', 'cufe');
      await queryInterface.removeColumn('facturas', 'factura_relacionada_id');
      await queryInterface.removeColumn('facturas', 'tipo_documento');
      
      // Restaurar enum de método de pago original
      await queryInterface.sequelize.query(
        "ALTER TABLE facturas MODIFY COLUMN metodo_pago ENUM('efectivo', 'transferencia', 'pago_movil', 'tarjeta') DEFAULT 'efectivo';"
      );

      // Restaurar enum de estado original 
      await queryInterface.sequelize.query(
        "ALTER TABLE facturas MODIFY COLUMN estado ENUM('pendiente', 'pagada') DEFAULT 'pendiente';"
      );

      console.log('Rollback de migración de facturas completado con éxito.');
      return true;
    } catch (error) {
      console.error('Error al hacer rollback de migración de facturas:', error);
      throw error;
    }
  }
};