/**
 * Migración para corregir el problema de truncamiento de datos en la columna fecha_creacion de la tabla clientes
 */
const { sequelize } = require('../utils/database');

async function ejecutarMigracion() {
    try {
        console.log('Iniciando migración para corregir la columna fecha_creacion en la tabla clientes...');
        
        // Verificar si la tabla existe
        const [tablas] = await sequelize.query("SHOW TABLES LIKE 'clientes'");
        const tablaExiste = tablas.length > 0;
        
        if (tablaExiste) {
            console.log('La tabla clientes existe, corrigiendo la columna fecha_creacion...');
            
            // Verificar el tipo actual de la columna
            const [columnasInfo] = await sequelize.query(`
                SHOW COLUMNS FROM clientes WHERE Field = 'fecha_creacion'
            `);
            
            if (columnasInfo.length > 0) {
                console.log(`Tipo actual de columna fecha_creacion: ${columnasInfo[0].Type}`);
            }
            
            // Primero, conviértela a un tipo que acepte cualquier valor (VARCHAR)
            console.log('Convirtiendo fecha_creacion a VARCHAR para evitar truncamiento...');
            await sequelize.query(`
                ALTER TABLE clientes 
                MODIFY COLUMN fecha_creacion VARCHAR(50) NULL
            `);
            
            // Verificar si hay valores inválidos y corregirlos
            console.log('Identificando registros con formato de fecha inválido...');
            const [registrosInvalidos] = await sequelize.query(`
                SELECT id, fecha_creacion 
                FROM clientes 
                WHERE fecha_creacion NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}.*$'
            `);
            
            console.log(`Se encontraron ${registrosInvalidos.length} registros con formato de fecha potencialmente inválido`);
            
            // Actualizar los registros inválidos con una fecha válida actual
            if (registrosInvalidos.length > 0) {
                console.log('Actualizando registros con formato de fecha inválido...');
                for (const registro of registrosInvalidos) {
                    console.log(`Corrigiendo registro ID ${registro.id} con fecha_creacion: ${registro.fecha_creacion}`);
                    await sequelize.query(`
                        UPDATE clientes 
                        SET fecha_creacion = NOW() 
                        WHERE id = ${registro.id}
                    `);
                }
            }
            
            // Convertir la columna de nuevo a DATETIME
            console.log('Convirtiendo fecha_creacion de nuevo a DATETIME...');
            await sequelize.query(`
                ALTER TABLE clientes 
                MODIFY COLUMN fecha_creacion DATETIME NULL
            `);
            
            console.log('Columna fecha_creacion corregida exitosamente.');
        } else {
            console.log('La tabla clientes no existe, no se requiere migración.');
        }
        
        console.log('Migración completada con éxito.');
        return true;
    } catch (error) {
        console.error('Error durante la migración:', error);
        return false;
    }
}

module.exports = {
    ejecutarMigracion
};

// Si este archivo se ejecuta directamente
if (require.main === module) {
    ejecutarMigracion()
        .then(resultado => {
            if (resultado) {
                console.log('Migración ejecutada exitosamente');
            } else {
                console.error('Falló la ejecución de la migración');
            }
            process.exit(resultado ? 0 : 1);
        })
        .catch(error => {
            console.error('Error grave durante la migración:', error);
            process.exit(1);
        });
}