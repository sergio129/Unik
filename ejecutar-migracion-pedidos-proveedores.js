/**
 * Script para ejecutar la migración que convierte el módulo de pedidos para usar exclusivamente con proveedores
 */
require('dotenv').config();
const { sequelize } = require('./src/utils/database');
const migrarPedidosAProveedores = require('./src/migrations/convert-pedidos-to-proveedores');

async function ejecutarMigracion() {
  console.log('Iniciando migración para convertir pedidos a uso exclusivo con proveedores...');
  
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Ejecutar la migración
    await migrarPedidosAProveedores.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
}

ejecutarMigracion();