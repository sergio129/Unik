const { sequelize } = require('./src/utils/database');
const migration = require('./src/migrations/add-password-reset-fields');

async function ejecutarMigracion() {
    try {
        console.log('Iniciando migración para añadir campos de recuperación de contraseña...');
        
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        
        console.log('Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error al ejecutar la migración:', error);
        process.exit(1);
    }
}

ejecutarMigracion();