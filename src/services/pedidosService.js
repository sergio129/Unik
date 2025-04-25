/**
 * Servicio para manejo de pedidos
 * Incluye funcionalidades para buscar, crear y actualizar pedidos
 */

const db = require('../utils/db');

/**
 * Busca pedidos activos asociados a un número de teléfono de proveedor
 * @param {string} telefono - Número de teléfono del proveedor (sin prefijo de país)
 * @returns {Array} - Lista de pedidos activos del proveedor
 */
const buscarPedidosPorTelefono = async (telefono) => {
    try {
        // Extraer solo los dígitos del número
        const numeroLimpio = telefono.replace(/\D/g, '');
        
        // Obtener los últimos dígitos (sin el código de país)
        const ultimosDigitos = numeroLimpio.slice(-10);
        
        console.log(`Buscando pedidos para proveedor con número terminado en: ${ultimosDigitos}`);
        
        // Buscar proveedores con este número
        const [proveedores] = await db.query(
            `SELECT id, nombre FROM proveedores WHERE telefono LIKE ?`,
            [`%${ultimosDigitos}`]
        );
        
        if (!proveedores || proveedores.length === 0) {
            console.log(`No se encontraron proveedores con el número terminado en: ${ultimosDigitos}`);
            return [];
        }
        
        console.log(`Proveedores encontrados:`, proveedores);
        
        const proveedorIds = proveedores.map(p => p.id);
        
        // Buscar pedidos pendientes o en proceso de estos proveedores
        const [pedidos] = await db.query(
            `SELECT p.* 
             FROM pedidos p 
             WHERE p.proveedor_id IN (?) 
             AND p.estado IN ('pendiente', 'en_proceso')
             ORDER BY p.fecha_pedido DESC
             LIMIT 5`,
            [proveedorIds]
        );
        
        console.log(`Pedidos encontrados: ${pedidos ? pedidos.length : 0}`);
        
        // Enriquecer pedidos con detalles (sin intentar obtener los detalles del producto)
        if (pedidos && pedidos.length > 0) {
            for (const pedido of pedidos) {
                try {
                    // Primero intentar averiguar el nombre de la columna que contiene el código o ID del producto
                    const [columnas] = await db.query(
                        `SHOW COLUMNS FROM detalles_pedido`
                    );
                    
                    // Buscar columnas que probablemente contengan el ID o código del producto
                    const columnasPosibles = columnas.filter(col => 
                        col.Field.toLowerCase().includes('producto') || 
                        col.Field.toLowerCase().includes('product') ||
                        col.Field.toLowerCase().includes('codigo')
                    );
                    
                    console.log('Posibles columnas para el ID del producto:', 
                        columnasPosibles.map(col => col.Field));
                    
                    if (columnasPosibles.length > 0) {
                        // Usar la primera columna que encontramos
                        const columnaProducto = columnasPosibles[0].Field;
                        
                        // Consulta dinámica usando el nombre de columna detectado
                        const [detalles] = await db.query(
                            `SELECT d.* 
                             FROM detalles_pedido d 
                             WHERE d.pedido_id = ?`,
                            [pedido.id]
                        );
                        
                        pedido.detalles = detalles || [];
                        console.log(`Detalles obtenidos para pedido ${pedido.id}: ${detalles.length}`);
                    } else {
                        // Si no podemos determinar la columna, simplemente obtenemos todos los detalles
                        const [detalles] = await db.query(
                            `SELECT * FROM detalles_pedido WHERE pedido_id = ?`,
                            [pedido.id]
                        );
                        
                        pedido.detalles = detalles || [];
                    }
                } catch (detailError) {
                    console.error(`Error al obtener detalles para pedido ${pedido.id}:`, detailError);
                    pedido.detalles = [];
                }
            }
        }
        
        return pedidos || [];
    } catch (error) {
        console.error('Error al buscar pedidos por teléfono:', error);
        return [];
    }
};

/**
 * Actualiza el estado de un pedido y registra el cambio
 * @param {number} pedidoId - ID del pedido a actualizar
 * @param {string} nuevoEstado - Nuevo estado del pedido
 * @param {string} comentario - Comentario sobre el cambio
 * @returns {boolean} - True si la actualización fue exitosa
 */
const actualizarEstadoPedido = async (pedidoId, nuevoEstado, comentario) => {
    try {
        // Obtener el estado actual
        const [pedidoActual] = await db.query(
            `SELECT estado FROM pedidos WHERE id = ?`,
            [pedidoId]
        );
        
        if (!pedidoActual || pedidoActual.length === 0) {
            console.error(`No se encontró el pedido con ID: ${pedidoId}`);
            return false;
        }
        
        const estadoAnterior = pedidoActual[0].estado;
        
        // No actualizar si ya tiene el estado deseado
        if (estadoAnterior === nuevoEstado) {
            console.log(`El pedido ${pedidoId} ya tiene el estado ${nuevoEstado}`);
            return true;
        }
        
        console.log(`Actualizando pedido ${pedidoId} de ${estadoAnterior} a ${nuevoEstado}`);
        
        // Actualizar el estado del pedido
        await db.query(
            `UPDATE pedidos SET estado = ? WHERE id = ?`,
            [nuevoEstado, pedidoId]
        );
        
        // Obtener el usuario administrador para el registro (o usar un valor predeterminado)
        const [adminUser] = await db.query(
            `SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1`
        );
        
        const usuarioId = adminUser && adminUser.length > 0 ? adminUser[0].id : null;
        
        // Registrar el cambio en el historial (corregido a SeguimientoPedidos)
        await db.query(
            `INSERT INTO SeguimientoPedidos 
             (pedido_id, estado_anterior, estado_nuevo, comentario, usuario_id, fecha, tipo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), 'whatsapp', NOW(), NOW())`,
            [pedidoId, estadoAnterior, nuevoEstado, comentario, usuarioId]
        );
        
        console.log(`Estado del pedido ${pedidoId} actualizado correctamente a ${nuevoEstado}`);
        return true;
    } catch (error) {
        console.error('Error al actualizar estado del pedido:', error);
        return false;
    }
};

/**
 * Registra una incidencia en el historial del pedido
 * @param {number} pedidoId - ID del pedido 
 * @param {string} descripcion - Descripción de la incidencia
 * @returns {boolean} - True si el registro fue exitoso
 */
const registrarIncidenciaPedido = async (pedidoId, descripcion) => {
    try {
        // Obtener el estado actual
        const [pedidoActual] = await db.query(
            `SELECT estado FROM pedidos WHERE id = ?`,
            [pedidoId]
        );
        
        if (!pedidoActual || pedidoActual.length === 0) {
            console.error(`No se encontró el pedido con ID: ${pedidoId}`);
            return false;
        }
        
        const estadoActual = pedidoActual[0].estado;
        
        // Obtener el usuario administrador para el registro (o usar un valor predeterminado)
        const [adminUser] = await db.query(
            `SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1`
        );
        
        const usuarioId = adminUser && adminUser.length > 0 ? adminUser[0].id : null;
        
        // Registrar la incidencia en el historial (corregido a SeguimientoPedidos)
        await db.query(
            `INSERT INTO SeguimientoPedidos 
             (pedido_id, estado_anterior, estado_nuevo, comentario, tipo, usuario_id, fecha, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'incidencia', ?, NOW(), NOW(), NOW())`,
            [pedidoId, estadoActual, estadoActual, descripcion, usuarioId]
        );
        
        console.log(`Incidencia registrada para el pedido ${pedidoId}`);
        return true;
    } catch (error) {
        console.error('Error al registrar incidencia del pedido:', error);
        return false;
    }
};

/**
 * Obtener detalles completos de un pedido por su ID
 * @param {number} pedidoId - ID del pedido
 * @returns {Object|null} - Datos del pedido o null si no existe
 */
const obtenerPedidoPorId = async (pedidoId) => {
    try {
        // Obtener datos del pedido
        const [pedidos] = await db.query(
            `SELECT p.*, pr.nombre AS nombre_proveedor, pr.telefono AS telefono_proveedor 
             FROM pedidos p 
             LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
             WHERE p.id = ?`,
            [pedidoId]
        );
        
        if (!pedidos || pedidos.length === 0) {
            return null;
        }
        
        const pedido = pedidos[0];
        
        // Obtener detalles del pedido y tratar de obtener info adicional de los productos
        try {
            // Primero obtenemos los detalles básicos
            const [detalles] = await db.query(
                `SELECT * FROM detalles_pedido WHERE pedido_id = ?`,
                [pedidoId]
            );
            
            // Si tenemos detalles, intentamos enriquecerlos con información de productos
            if (detalles && detalles.length > 0) {
                // Verificamos si existe la tabla productos
                const [tablas] = await db.query(
                    `SHOW TABLES LIKE 'productos'`
                );
                
                if (tablas && tablas.length > 0) {
                    try {
                        // Para cada detalle, intentamos obtener el nombre del producto
                        for (const detalle of detalles) {
                            if (detalle.producto_codigo) {
                                // Intentar obtener el producto por su código
                                const [productos] = await db.query(
                                    `SELECT * FROM productos WHERE codigo = ? OR id = ? LIMIT 1`,
                                    [detalle.producto_codigo, detalle.producto_codigo]
                                );
                                
                                if (productos && productos.length > 0) {
                                    // Agregamos los datos del producto al detalle
                                    detalle.producto_nombre = productos[0].nombre || productos[0].descripcion || null;
                                    detalle.producto_descripcion = productos[0].descripcion || null;
                                }
                            }
                            
                            // Si no pudimos obtener el nombre, usamos el código como respaldo
                            if (!detalle.producto_nombre) {
                                detalle.producto_nombre = `Producto: ${detalle.producto_codigo}`;
                            }
                        }
                    } catch (productoError) {
                        console.error(`Error al obtener información de productos:`, productoError);
                    }
                }
            }
            
            pedido.detalles = detalles || [];
        } catch (detallesError) {
            console.error(`Error al obtener detalles del pedido ${pedidoId}:`, detallesError);
            pedido.detalles = [];
        }
        
        // Obtener historial de seguimiento con manejo de error mejorado
        try {
            // Primero verificar si existen las columnas en la tabla usuario
            const [columnasUsuario] = await db.query(
                `SHOW COLUMNS FROM usuarios`
            );
            
            // Comprobar si existen las columnas nombre y apellido o nombre_completo
            const tieneNombre = columnasUsuario.some(col => col.Field === 'nombre');
            const tieneApellido = columnasUsuario.some(col => col.Field === 'apellido');
            const tieneNombreCompleto = columnasUsuario.some(col => col.Field === 'nombre_completo');
            
            // Construir la consulta según las columnas disponibles
            let consultaSeguimiento;
            
            if (tieneNombre && tieneApellido) {
                consultaSeguimiento = `
                    SELECT s.*, u.nombre, u.apellido
                    FROM SeguimientoPedidos s
                    LEFT JOIN usuarios u ON s.usuario_id = u.id
                    WHERE s.pedido_id = ?
                    ORDER BY s.fecha DESC
                `;
            } else if (tieneNombreCompleto) {
                consultaSeguimiento = `
                    SELECT s.*, u.nombre_completo
                    FROM SeguimientoPedidos s
                    LEFT JOIN usuarios u ON s.usuario_id = u.id
                    WHERE s.pedido_id = ?
                    ORDER BY s.fecha DESC
                `;
            } else {
                consultaSeguimiento = `
                    SELECT s.*
                    FROM SeguimientoPedidos s
                    WHERE s.pedido_id = ?
                    ORDER BY s.fecha DESC
                `;
            }
            
            const [seguimientos] = await db.query(consultaSeguimiento, [pedidoId]);
            pedido.seguimientos = seguimientos || [];
            
        } catch (seguimientosError) {
            console.error(`Error al obtener seguimientos del pedido ${pedidoId}:`, seguimientosError);
            pedido.seguimientos = [];
        }
        
        return pedido;
    } catch (error) {
        console.error('Error al obtener pedido por ID:', error);
        return null;
    }
};

/**
 * Registra un mensaje del chat de WhatsApp asociado a un pedido
 * @param {number} pedidoId - ID del pedido
 * @param {string} telefono - Número de teléfono del remitente
 * @param {string} mensaje - Contenido del mensaje
 * @param {string} tipo - Tipo de mensaje (proveedor o sistema)
 * @param {number} usuarioId - ID del usuario que envía el mensaje (solo para tipo sistema)
 * @returns {Object|null} - Mensaje registrado o null si hubo un error
 */
const registrarMensajeChat = async (pedidoId, telefono, mensaje, tipo = 'proveedor', usuarioId = null) => {
    try {
        // Comprobar si existe la tabla de mensajes de chat
        const [tablas] = await db.query(
            `SHOW TABLES LIKE 'MensajesChat'`
        );
        
        // Si la tabla no existe, la creamos
        if (!tablas || tablas.length === 0) {
            console.log('Creando tabla MensajesChat...');
            await db.query(`
                CREATE TABLE MensajesChat (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id VARCHAR(50) NOT NULL,
                    telefono VARCHAR(50) NOT NULL,
                    mensaje TEXT NOT NULL,
                    tipo ENUM('proveedor', 'sistema') NOT NULL,
                    usuario_id INT,
                    leido BOOLEAN DEFAULT FALSE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_pedido_id (pedido_id),
                    INDEX idx_telefono (telefono),
                    INDEX idx_created_at (created_at)
                )
            `);
        }
        
        // Insertar mensaje en la BD
        const [resultado] = await db.query(
            `INSERT INTO MensajesChat (pedido_id, telefono, mensaje, tipo, usuario_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [pedidoId, telefono, mensaje, tipo, usuarioId]
        );
        
        if (resultado && resultado.insertId) {
            // Recuperar el mensaje recién insertado
            const [mensajes] = await db.query(
                `SELECT * FROM MensajesChat WHERE id = ?`,
                [resultado.insertId]
            );
            
            if (mensajes && mensajes.length > 0) {
                console.log(`Mensaje de chat registrado para pedido ${pedidoId}`);
                return mensajes[0];
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error al registrar mensaje de chat:', error);
        return null;
    }
};

/**
 * Obtiene mensajes de chat para un pedido específico
 * @param {number} pedidoId - ID del pedido 
 * @param {number} limit - Límite de mensajes a recuperar
 * @returns {Array} - Mensajes del chat ordenados por fecha
 */
const obtenerMensajesChat = async (pedidoId, limit = 100) => {
    try {
        // Verificar si existe la tabla
        const [tablas] = await db.query(
            `SHOW TABLES LIKE 'MensajesChat'`
        );
        
        if (!tablas || tablas.length === 0) {
            return [];
        }
        
        // Recuperar mensajes
        const [mensajes] = await db.query(
            `SELECT m.*, u.nombre_completo AS nombre_usuario, u.username
             FROM MensajesChat m
             LEFT JOIN usuarios u ON m.usuario_id = u.id
             WHERE m.pedido_id = ?
             ORDER BY m.created_at ASC
             LIMIT ?`,
            [pedidoId, limit]
        );
        
        return mensajes || [];
    } catch (error) {
        console.error('Error al obtener mensajes de chat:', error);
        return [];
    }
};

/**
 * Marca como leídos los mensajes de chat de un pedido
 * @param {number} pedidoId - ID del pedido
 * @returns {boolean} - True si se actualizaron correctamente
 */
const marcarMensajesComoLeidos = async (pedidoId) => {
    try {
        // Verificar si existe la tabla
        const [tablas] = await db.query(
            `SHOW TABLES LIKE 'MensajesChat'`
        );
        
        if (!tablas || tablas.length === 0) {
            return false;
        }
        
        // Actualizar mensajes no leídos
        await db.query(
            `UPDATE MensajesChat 
             SET leido = TRUE 
             WHERE pedido_id = ? AND leido = FALSE`,
            [pedidoId]
        );
        
        return true;
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
        return false;
    }
};

/**
 * Obtener información de un proveedor por su ID
 * @param {number} proveedorId - ID del proveedor
 * @returns {Object|null} - Datos del proveedor o null si no existe
 */
const obtenerProveedor = async (proveedorId) => {
    try {
        const [proveedores] = await db.query(
            `SELECT * FROM proveedores WHERE id = ?`,
            [proveedorId]
        );
        
        if (proveedores && proveedores.length > 0) {
            return proveedores[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error al obtener proveedor:', error);
        return null;
    }
};

/**
 * Obtener información básica de un pedido por su ID
 * @param {number} pedidoId - ID del pedido
 * @returns {Object|null} - Datos básicos del pedido o null si no existe
 */
const obtenerPedido = async (pedidoId) => {
    try {
        const [pedidos] = await db.query(
            `SELECT * FROM pedidos WHERE id = ?`,
            [pedidoId]
        );
        
        if (pedidos && pedidos.length > 0) {
            return pedidos[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        return null;
    }
};

module.exports = {
    buscarPedidosPorTelefono,
    actualizarEstadoPedido,
    registrarIncidenciaPedido,
    obtenerPedidoPorId,
    registrarMensajeChat,
    obtenerMensajesChat,
    marcarMensajesComoLeidos,
    obtenerProveedor,
    obtenerPedido
};