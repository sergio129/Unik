/**
 * Migración para crear las tablas necesarias para el sistema de notificaciones
 */
const mysql = require('mysql2/promise');
const config = require('../config/db.config');

/**
 * Ejecuta la migración para crear las tablas de notificaciones
 */
async function up() {
    const connection = await mysql.createConnection(config);
    
    try {
        console.log('Iniciando migración de tablas de notificaciones...');
        
        // Crear tabla de notificaciones
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notificaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                mensaje TEXT NOT NULL,
                tipo VARCHAR(50) NOT NULL,
                entidad_tipo VARCHAR(50) NULL,
                entidad_id INT NULL,
                url VARCHAR(255) NULL,
                url_externa BOOLEAN DEFAULT FALSE,
                prioridad ENUM('baja', 'normal', 'alta') DEFAULT 'normal',
                leido BOOLEAN DEFAULT FALSE,
                fecha DATETIME NOT NULL,
                INDEX (usuario_id),
                INDEX (tipo),
                INDEX (entidad_tipo, entidad_id),
                INDEX (fecha),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log('Tabla de notificaciones creada correctamente');
        
        // Crear tabla de acciones de notificaciones
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notificacion_acciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notificacion_id INT NOT NULL,
                accion VARCHAR(50) NOT NULL,
                etiqueta VARCHAR(100) NOT NULL,
                es_primaria BOOLEAN DEFAULT FALSE,
                INDEX (notificacion_id),
                FOREIGN KEY (notificacion_id) REFERENCES notificaciones(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log('Tabla de acciones de notificaciones creada correctamente');
        
        // Añadir trigger para notificaciones de pedidos retrasados
        await connection.execute(`
            CREATE OR REPLACE EVENT check_pedidos_retrasados
            ON SCHEDULE EVERY 1 DAY
            STARTS CURRENT_DATE + INTERVAL 1 DAY
            DO
            BEGIN
                DECLARE done INT DEFAULT FALSE;
                DECLARE pedido_id INT;
                DECLARE pedido_codigo VARCHAR(20);
                DECLARE pedido_fecha_entrega_estimada DATE;
                DECLARE pedido_usuario_id INT;
                
                DECLARE cur CURSOR FOR 
                    SELECT p.id, p.codigo, p.fecha_entrega_estimada, p.usuario_id
                    FROM pedidos p
                    WHERE p.estado = 'pendiente' 
                        AND p.fecha_entrega_estimada < CURDATE()
                        AND p.id NOT IN (
                            SELECT n.entidad_id 
                            FROM notificaciones n 
                            WHERE n.entidad_tipo = 'pedido' 
                                AND n.tipo = 'pedido_retrasado'
                                AND DATE(n.fecha) = CURDATE()
                        );
                
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                
                OPEN cur;
                
                pedidos_loop: LOOP
                    FETCH cur INTO pedido_id, pedido_codigo, pedido_fecha_entrega_estimada, pedido_usuario_id;
                    
                    IF done THEN
                        LEAVE pedidos_loop;
                    END IF;
                    
                    -- Insertar notificación de pedido retrasado
                    INSERT INTO notificaciones (
                        usuario_id, 
                        titulo, 
                        mensaje, 
                        tipo, 
                        entidad_tipo, 
                        entidad_id, 
                        url, 
                        prioridad, 
                        leido, 
                        fecha
                    )
                    VALUES (
                        pedido_usuario_id,
                        CONCAT('Pedido retrasado: ', pedido_codigo),
                        CONCAT('El pedido ', pedido_codigo, ' ha superado la fecha de entrega estimada (', pedido_fecha_entrega_estimada, ')'),
                        'pedido_retrasado',
                        'pedido',
                        pedido_id,
                        CONCAT('/pedidos/pedidos.html?id=', pedido_id),
                        'alta',
                        FALSE,
                        NOW()
                    );
                    
                    -- Obtener el ID de la notificación insertada
                    SET @last_notification_id = LAST_INSERT_ID();
                    
                    -- Insertar acciones para la notificación
                    INSERT INTO notificacion_acciones (notificacion_id, accion, etiqueta, es_primaria)
                    VALUES 
                        (@last_notification_id, 'ver_pedido', 'Ver pedido', 1),
                        (@last_notification_id, 'descartar', 'Descartar', 0);
                    
                END LOOP;
                
                CLOSE cur;
            END;
        `);
        
        console.log('Evento para comprobar pedidos retrasados creado correctamente');
        
        console.log('Migración de tablas de notificaciones completada con éxito');
    } catch (error) {
        console.error('Error durante la migración de tablas de notificaciones:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

/**
 * Revierte la migración eliminando las tablas de notificaciones
 */
async function down() {
    const connection = await mysql.createConnection(config);
    
    try {
        console.log('Revertiendo migración de tablas de notificaciones...');
        
        // Eliminar evento de comprobación de pedidos retrasados
        await connection.execute(`DROP EVENT IF EXISTS check_pedidos_retrasados`);
        console.log('Evento de comprobación de pedidos retrasados eliminado');
        
        // Eliminar tabla de acciones de notificaciones
        await connection.execute(`DROP TABLE IF EXISTS notificacion_acciones`);
        console.log('Tabla de acciones de notificaciones eliminada');
        
        // Eliminar tabla de notificaciones
        await connection.execute(`DROP TABLE IF EXISTS notificaciones`);
        console.log('Tabla de notificaciones eliminada');
        
        console.log('Reversión de migración de tablas de notificaciones completada con éxito');
    } catch (error) {
        console.error('Error durante la reversión de migración de tablas de notificaciones:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

module.exports = { up, down };