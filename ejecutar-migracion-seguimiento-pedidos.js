/**
 * Script para ejecutar la migración que corrige la tabla SeguimientoPedidos
 */

const { up } = require('./src/migrations/fix-seguimiento-pedidos');
const path = require('path');

console.log('Iniciando la migración de corrección para SeguimientoPedidos...');
console.log(`Directorio actual: ${__dirname}`);
console.log(`Ruta de migración: ${path.resolve('./src/migrations/fix-seguimiento-pedidos.js')}`);

up()
  .then(success => {
    if (success) {
      console.log('✅ Migración completada exitosamente');
      process.exit(0);
    } else {
      console.error('❌ La migración falló');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  });