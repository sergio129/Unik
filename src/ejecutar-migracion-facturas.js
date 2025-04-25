// ejecutar-migracion-facturas.js
// Script para ejecutar la migración del esquema de facturas

const { sequelize } = require('./utils/database');
const migration = require('./migrations/update-facturas-schema');
const Sequelize = require('sequelize');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración de la estructura de facturas...');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
}

ejecutarMigracion();