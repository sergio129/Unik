/**
 * Utilidad para acceso a la base de datos
 * Este archivo proporciona métodos comunes para operaciones de base de datos
 */

const dbConfig = require('../config/db.config');

// Exportar el pool de conexiones con promesas
const db = dbConfig.pool;

// Funciones de utilidad para consultas comunes
async function query(sql, params) {
    try {
        return await db.query(sql, params);
    } catch (error) {
        console.error('Error en consulta SQL:', error);
        throw error;
    }
}

/**
 * Ejecuta una transacción SQL
 * @param {Function} callback - Función que recibe la conexión y ejecuta las consultas
 * @returns {Promise} Resultado de la transacción
 */
async function transaction(callback) {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const result = await callback(connection);
        
        await connection.commit();
        return result;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en transacción SQL:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    query,
    transaction,
    pool: db
};