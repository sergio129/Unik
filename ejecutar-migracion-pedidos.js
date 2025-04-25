// Script para ejecutar la migración que corrige la columna id de la tabla Pedidos
const { sequelize } = require('./src/utils/database');
const fixPedidosIdColumn = require('./src/migrations/fix-pedidos-id-column');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración para corregir la tabla Pedidos...');
    
    // Corregir columna id en tabla Pedidos
    await fixPedidosIdColumn.up(sequelize.getQueryInterface(), require('sequelize'));
    
    console.log('✅ Migración completada exitosamente. La columna id de Pedidos ahora es autoincremental.');
    
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