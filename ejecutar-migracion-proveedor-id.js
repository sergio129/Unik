// Script para ejecutar la migración que permite NULL en proveedor_id
const { sequelize } = require('./src/utils/database');
const updatePedidosProveedorId = require('./src/migrations/update-pedidos-proveedor-id');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración para actualizar el campo proveedor_id en la tabla Pedidos...');
    
    // Ejecutar la migración
    await updatePedidosProveedorId.up(sequelize.getQueryInterface(), require('sequelize'));
    
    console.log('✅ Migración completada exitosamente. El campo proveedor_id ahora acepta valores NULL.');
    
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