/**
 * Migración para corregir la incompatibilidad de tipos entre las columnas pedido_id en SeguimientoPedidos
 * y la columna id en Pedidos
 */
const { sequelize } = require('../utils/database');

async function up() {
    try {
        console.log('Iniciando migración para corregir la tabla SeguimientoPedidos...');
        
        // Verificar si la tabla existe
        const [tablas] = await sequelize.query("SHOW TABLES LIKE 'SeguimientoPedidos'");
        const tablaExiste = tablas.length > 0;
        
        if (tablaExiste) {
            console.log('La tabla SeguimientoPedidos existe, procediendo a corregir...');
            
            // Verificar si hay datos en la tabla que debamos respaldar
            const [conteo] = await sequelize.query("SELECT COUNT(*) as total FROM SeguimientoPedidos");
            const tieneRegistros = conteo[0].total > 0;
            
            if (tieneRegistros) {
                console.log(`La tabla tiene ${conteo[0].total} registros que se respaldarán temporalmente`);
                
                // Crear tabla temporal para respaldo
                await sequelize.query(`
                    CREATE TABLE IF NOT EXISTS SeguimientoPedidos_temp (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        pedido_id VARCHAR(50) NOT NULL,
                        estado_anterior ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
                        estado_nuevo ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') NOT NULL,
                        fecha DATETIME NOT NULL,
                        comentario TEXT,
                        usuario_id INT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    )
                `);
                
                // Copiar datos a la tabla temporal
                await sequelize.query(`
                    INSERT INTO SeguimientoPedidos_temp (
                        id, pedido_id, estado_anterior, estado_nuevo, fecha, 
                        comentario, usuario_id, created_at, updated_at
                    )
                    SELECT 
                        id, pedido_id, estado_anterior, estado_nuevo, fecha, 
                        comentario, usuario_id, created_at, updated_at
                    FROM SeguimientoPedidos
                `);
                
                console.log('Datos respaldados en tabla temporal');
            }

            // Eliminar la tabla existente con el problema
            console.log('Eliminando tabla SeguimientoPedidos...');
            await sequelize.query("DROP TABLE IF EXISTS SeguimientoPedidos");
            
            // Crear la tabla desde cero con los tipos correctos
            console.log('Creando tabla SeguimientoPedidos con tipos correctos...');
            await sequelize.query(`
                CREATE TABLE SeguimientoPedidos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id VARCHAR(50) NOT NULL,
                    estado_anterior ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
                    estado_nuevo ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') NOT NULL,
                    fecha DATETIME NOT NULL,
                    comentario TEXT,
                    usuario_id INT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    INDEX idx_pedido_id (pedido_id),
                    INDEX idx_created_at (created_at),
                    CONSTRAINT fk_seguimiento_pedido_id FOREIGN KEY (pedido_id) 
                        REFERENCES Pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT fk_seguimiento_usuario_id FOREIGN KEY (usuario_id) 
                        REFERENCES Usuarios(id)
                )
            `);
            
            // Restaurar los datos si había registros
            if (tieneRegistros) {
                console.log('Restaurando datos a la nueva tabla...');
                await sequelize.query(`
                    INSERT INTO SeguimientoPedidos (
                        id, pedido_id, estado_anterior, estado_nuevo, fecha, 
                        comentario, usuario_id, created_at, updated_at
                    )
                    SELECT 
                        id, pedido_id, estado_anterior, estado_nuevo, fecha, 
                        comentario, usuario_id, created_at, updated_at
                    FROM SeguimientoPedidos_temp
                `);
                
                // Eliminar tabla temporal
                await sequelize.query("DROP TABLE IF EXISTS SeguimientoPedidos_temp");
                console.log('Datos restaurados y tabla temporal eliminada');
            }
            
            console.log('Tabla SeguimientoPedidos corregida exitosamente.');
        } else {
            console.log('La tabla SeguimientoPedidos no existe, creándola desde cero...');
            
            await sequelize.query(`
                CREATE TABLE SeguimientoPedidos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id VARCHAR(50) NOT NULL,
                    estado_anterior ENUM('pendiente', 'en_proceso', 'completado', 'cancelado'),
                    estado_nuevo ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') NOT NULL,
                    fecha DATETIME NOT NULL,
                    comentario TEXT,
                    usuario_id INT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    INDEX idx_pedido_id (pedido_id),
                    INDEX idx_created_at (created_at),
                    CONSTRAINT fk_seguimiento_pedido_id FOREIGN KEY (pedido_id) 
                        REFERENCES Pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT fk_seguimiento_usuario_id FOREIGN KEY (usuario_id) 
                        REFERENCES Usuarios(id)
                )
            `);
            
            console.log('Tabla SeguimientoPedidos creada correctamente.');
        }
        
        console.log('Migración completada con éxito.');
        return true;
    } catch (error) {
        console.error('Error durante la migración:', error);
        return false;
    }
}

// Función down para revertir la migración (no se implementa completamente por precaución)
async function down() {
    console.log('Advertencia: La función down no está diseñada para revertir esta migración específica de corrección.');
    return true;
}

module.exports = {
    up,
    down
};

// Ejecutar la migración directamente si es llamado como script independiente
if (require.main === module) {
    up()
        .then(resultado => {
            if (resultado) {
                console.log('Migración ejecutada exitosamente');
                process.exit(0);
            } else {
                console.error('Falló la ejecución de la migración');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Error grave durante la migración:', error);
            process.exit(1);
        });
}