/**
 * Script para ejecutar la migración que añade campos de tipo_pedido y proveedor_id a la tabla Pedidos
 */
require('dotenv').config();
const { sequelize } = require('./src/utils/database');
const addTipoPedidoAndProveedor = require('./src/migrations/add-tipo-pedido-and-proveedor');

async function ejecutarMigracion() {
  console.log('Iniciando migración para añadir tipo de pedido y proveedor...');
  
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Ejecutar la migración
    await addTipoPedidoAndProveedor.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
}

ejecutarMigracion();