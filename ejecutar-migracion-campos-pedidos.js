/**
 * Script para ejecutar la migración que añade campos adicionales a la tabla Pedidos
 */
const { sequelize } = require('./src/utils/database');
const addCamposPedidos = require('./src/migrations/add-campos-pedidos');

async function ejecutarMigracion() {
  console.log('Iniciando migración para añadir campos adicionales a la tabla Pedidos...');
  
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Ejecutar la migración
    await addCamposPedidos.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
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