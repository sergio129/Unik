// Script para ejecutar la migración que crea la tabla DetallesPedido
const { sequelize } = require('./src/utils/database');
const createDetallesPedidoTable = require('./src/migrations/create-detalles-pedido-table');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración para crear la tabla DetallesPedido...');
    
    // Ejecutar la migración
    await createDetallesPedidoTable.up(sequelize.getQueryInterface(), require('sequelize'));
    
    console.log('✅ Migración completada exitosamente. La tabla DetallesPedido ha sido creada.');
    
    // Cerrar la conexión a la base de datos
    await sequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
    
    // Cerrar la conexión a la base de datos
    await sequelize.close();
    
    process.exit(1);
  }
}

// Ejecutar la migración
ejecutarMigracion();