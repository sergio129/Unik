/**
 * Servicio para gestión centralizada de notificaciones
 */
const Notificacion = require('../models/notificacion.model');
const Usuario = require('../models/usuario.model');
const { Op } = require('sequelize');

/**
 * Crear una nueva notificación para un usuario
 * @param {Object} datos - Datos de la notificación
 * @param {number} datos.usuario_id - ID del usuario destinatario
 * @param {string} datos.titulo - Título de la notificación
 * @param {string} datos.mensaje - Mensaje de la notificación
 * @param {string} datos.tipo - Tipo de notificación: info, warning, success, error
 * @param {Object} datos.datos - Datos adicionales en formato JSON
 * @param {string} datos.entidad_tipo - Tipo de entidad relacionada (pedido, producto, etc.)
 * @param {number} datos.entidad_id - ID de la entidad relacionada
 * @returns {Promise<Object>} - La notificación creada
 */
exports.crearNotificacion = async (datos) => {
    try {
        // Verificar datos mínimos requeridos
        if (!datos.usuario_id || !datos.titulo || !datos.mensaje) {
            throw new Error('Usuario, título y mensaje son obligatorios para crear una notificación');
        }

        // Crear la notificación
        const notificacion = await Notificacion.create({
            usuario_id: datos.usuario_id,
            titulo: datos.titulo,
            mensaje: datos.mensaje,
            tipo: datos.tipo || 'info',
            datos: datos.datos || {},
            entidad_tipo: datos.entidad_tipo || null,
            entidad_id: datos.entidad_id || null
        });

        // Emitir evento en tiempo real para notificar al cliente si el Socket.IO está disponible
        if (global.io) {
            // Enviar a la sala específica del usuario
            global.io.to(`usuario_${datos.usuario_id}`).emit('nueva_notificacion', {
                notificacion: {
                    id: notificacion.id,
                    titulo: notificacion.titulo,
                    mensaje: notificacion.mensaje,
                    tipo: notificacion.tipo,
                    created_at: notificacion.created_at,
                    datos: notificacion.datos,
                    entidad_tipo: notificacion.entidad_tipo,
                    entidad_id: notificacion.entidad_id
                }
            });

            // También enviar actualización del contador
            const conteo = await Notificacion.count({
                where: {
                    usuario_id: datos.usuario_id,
                    leida: false
                }
            });
            
            global.io.to(`usuario_${datos.usuario_id}`).emit('actualizacion_conteo_notificaciones', {
                conteo
            });
        }

        return notificacion;
    } catch (error) {
        console.error('Error al crear notificación:', error);
        throw error;
    }
};

/**
 * Notificar a todos los usuarios con un rol específico
 * @param {Object} datos - Datos de la notificación
 * @param {string} rol - Rol de los usuarios a notificar
 * @returns {Promise<Array>} - Las notificaciones creadas
 */
exports.notificarUsuariosPorRol = async (datos, rol) => {
    try {
        // Verificar datos mínimos
        if (!datos.titulo || !datos.mensaje || !rol) {
            throw new Error('Título, mensaje y rol son obligatorios');
        }

        // Obtener usuarios con el rol especificado
        const usuarios = await Usuario.findAll({
            where: { rol }
        });

        if (!usuarios || usuarios.length === 0) {
            console.log(`No se encontraron usuarios con el rol ${rol}`);
            return [];
        }

        // Crear notificaciones para cada usuario
        const notificaciones = [];
        for (const usuario of usuarios) {
            const notificacion = await this.crearNotificacion({
                ...datos,
                usuario_id: usuario.id
            });
            notificaciones.push(notificacion);
        }

        return notificaciones;
    } catch (error) {
        console.error('Error al notificar a usuarios por rol:', error);
        throw error;
    }
};

/**
 * Notificar cambios en pedidos
 * @param {Object} pedido - Datos del pedido
 * @param {string} tipo - Tipo de cambio: 'creacion', 'actualizacion', 'estado'
 * @param {Object} opciones - Opciones adicionales
 * @returns {Promise<Array>} - Las notificaciones creadas
 */
exports.notificarCambioPedido = async (pedido, tipo, opciones = {}) => {
    try {
        if (!pedido || !pedido.id) {
            throw new Error('Información del pedido es requerida');
        }

        const rolesANotificar = ['admin']; // Por defecto notificar a administradores
        
        // Según el tipo de cambio y estado del pedido, ajustar los roles a notificar
        if (tipo === 'creacion') {
            rolesANotificar.push('vendedor', 'inventario');
        } else if (tipo === 'estado') {
            if (pedido.estado === 'confirmado' || pedido.estado === 'en_proceso') {
                rolesANotificar.push('inventario');
            } else if (pedido.estado === 'listo' || pedido.estado === 'entregado') {
                rolesANotificar.push('vendedor');
            } else if (pedido.estado === 'cancelado') {
                rolesANotificar.push('vendedor', 'inventario');
            }
        }

        // Preparar datos para la notificación
        let titulo, mensaje;
        const entidadTipo = 'pedido';
        const entidadId = pedido.id;
        
        switch (tipo) {
            case 'creacion':
                titulo = '¡Nuevo pedido creado!';
                mensaje = `Se ha creado un nuevo pedido con ID ${pedido.id}`;
                break;
            case 'actualizacion':
                titulo = 'Pedido actualizado';
                mensaje = `El pedido #${pedido.id} ha sido actualizado`;
                break;
            case 'estado':
                titulo = 'Estado de pedido actualizado';
                mensaje = `El pedido #${pedido.id} ahora está en estado: ${pedido.estado}`;
                break;
            default:
                titulo = 'Actualización de pedido';
                mensaje = `El pedido #${pedido.id} ha tenido cambios`;
        }

        // Si se proporcionó un mensaje personalizado
        if (opciones.mensaje) {
            mensaje = opciones.mensaje;
        }

        // Datos adicionales para la notificación
        const datos = {
            pedido_id: pedido.id,
            estado: pedido.estado,
            numero_pedido: pedido.numero_pedido || null,
            cliente_nombre: pedido.cliente ? pedido.cliente.nombre : null,
            tipo_cambio: tipo,
            ... (opciones.datos || {})
        };

        // Crear notificaciones para cada rol
        const notificaciones = [];
        for (const rol of [...new Set(rolesANotificar)]) { // Eliminar duplicados
            const notificacionesRol = await this.notificarUsuariosPorRol({
                titulo,
                mensaje,
                tipo: 'info',
                datos,
                entidad_tipo: entidadTipo,
                entidad_id: entidadId
            }, rol);
            
            notificaciones.push(...notificacionesRol);
        }

        return notificaciones;
    } catch (error) {
        console.error('Error al notificar cambio de pedido:', error);
        throw error;
    }
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<number>} - Número de notificaciones actualizadas
 */
exports.marcarTodasComoLeidas = async (usuarioId) => {
    try {
        const resultado = await Notificacion.update(
            { leida: true, vista: true },
            { where: { usuario_id: usuarioId, leida: false } }
        );
        
        // Emitir evento en tiempo real
        if (global.io) {
            global.io.to(`usuario_${usuarioId}`).emit('actualizacion_conteo_notificaciones', {
                conteo: 0
            });
        }
        
        return resultado[0]; // Número de filas afectadas
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        throw error;
    }
};

/**
 * Eliminar notificaciones antiguas (mantenimiento)
 * @param {number} diasAntiguedad - Eliminar notificaciones más antiguas que estos días
 * @returns {Promise<number>} - Número de notificaciones eliminadas
 */
exports.eliminarNotificacionesAntiguas = async (diasAntiguedad = 30) => {
    try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
        
        const resultado = await Notificacion.destroy({
            where: {
                created_at: {
                    [Op.lt]: fechaLimite
                },
                leida: true
            }
        });
        
        return resultado; // Número de filas eliminadas
    } catch (error) {
        console.error('Error al eliminar notificaciones antiguas:', error);
        throw error;
    }
};