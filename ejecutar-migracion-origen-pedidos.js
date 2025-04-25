/**
 * Script para ejecutar la migración que actualiza el campo origen en la tabla Pedidos
 * para adaptarlo a categorías de pedidos a proveedores
 */
const { sequelize } = require('./src/utils/database');
const updatePedidoOrigenToCategoria = require('./src/migrations/update-pedido-origen-to-categoria');

async function ejecutarMigracion() {
  console.log('Iniciando migración para actualizar el campo origen en la tabla Pedidos...');
  
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Ejecutar la migración
    await updatePedidoOrigenToCategoria.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la migración
ejecutarMigracion();