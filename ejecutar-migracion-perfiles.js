const { sequelize } = require('./src/utils/database');
const addPerfilUsuarios = require('./src/migrations/add-perfil-usuarios');

async function ejecutarMigracion() {
  try {
    console.log('Iniciando migración para añadir campos de perfil a usuarios...');
    
    // Ejecutar la migración
    await addPerfilUsuarios(sequelize);
    
    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

ejecutarMigracion();