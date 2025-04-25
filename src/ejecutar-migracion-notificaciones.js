/**
 * Script para ejecutar la migración de la tabla de notificaciones
 * Este script crea la tabla de notificaciones si no existe
 */

const { sequelize } = require('./utils/database');
const Notificacion = require('./models/notificacion.model');

async function ejecutarMigracion() {
    try {
        console.log('Iniciando migración de la tabla de notificaciones...');
        
        // Forzar la sincronización de la tabla de notificaciones
        await Notificacion.sync({ force: true });
        
        console.log('Tabla de notificaciones creada con éxito');
    } catch (error) {
        console.error('Error al crear la tabla de notificaciones:', error);
    } finally {
        // Cerrar la conexión a la base de datos
        await sequelize.close();
    }
}

// Ejecutar la migración
ejecutarMigracion();