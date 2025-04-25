// Script para ejecutar la migración que ajusta la estructura de la tabla Pedidos
const { sequelize } = require('./src/utils/database');
const fixPedidosTable = require('./src/migrations/fix-pedidos-table');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración para ajustar la tabla Pedidos (v2)...');
    
    // Ejecutar la migración
    await fixPedidosTable.up(sequelize.getQueryInterface(), require('sequelize'));
    
    console.log('✅ Migración completada exitosamente. La tabla Pedidos ahora está correctamente configurada.');
    
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