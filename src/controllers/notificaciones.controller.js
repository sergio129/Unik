/**
 * Controlador de notificaciones
 */
const Notificacion = require('../models/notificacion.model');
const { sequelize } = require('../utils/database');
const { Op } = require('sequelize');

// Obtener todas las notificaciones del usuario actual
exports.obtenerNotificaciones = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const offset = (pagina - 1) * limite;
        
        const { count, rows } = await Notificacion.findAndCountAll({
            where: { usuario_id: usuarioId },
            order: [['created_at', 'DESC']],
            limit: limite,
            offset: offset
        });
        
        // Marcar como vistas las notificaciones que se están mostrando
        await Notificacion.update(
            { vista: true },
            { 
                where: { 
                    id: { [Op.in]: rows.map(n => n.id) },
                    vista: false
                } 
            }
        );
        
        res.status(200).json({
            total: count,
            pagina: pagina,
            limite: limite,
            totalPaginas: Math.ceil(count / limite),
            notificaciones: rows
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({
            mensaje: 'Error al obtener notificaciones',
            error: error.message
        });
    }
};

// Obtener notificaciones no leídas
exports.obtenerNotificacionesNoLeidas = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        const limite = parseInt(req.query.limite) || 10;
        
        const notificaciones = await Notificacion.findAll({
            where: {
                usuario_id: usuarioId,
                leida: false
            },
            order: [['created_at', 'DESC']],
            limit: limite
        });
        
        // Marcar como vistas las notificaciones que se están mostrando
        await Notificacion.update(
            { vista: true },
            { 
                where: { 
                    id: { [Op.in]: notificaciones.map(n => n.id) },
                    vista: false
                } 
            }
        );
        
        res.status(200).json(notificaciones);
    } catch (error) {
        console.error('Error al obtener notificaciones no leídas:', error);
        res.status(500).json({
            mensaje: 'Error al obtener notificaciones no leídas',
            error: error.message
        });
    }
};

// Obtener conteo de notificaciones no leídas
exports.obtenerConteoNoLeidas = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        const conteo = await Notificacion.count({
            where: {
                usuario_id: usuarioId,
                leida: false
            }
        });
        
        res.status(200).json({ conteo });
    } catch (error) {
        console.error('Error al obtener conteo de notificaciones no leídas:', error);
        res.status(500).json({
            mensaje: 'Error al obtener conteo de notificaciones no leídas',
            error: error.message
        });
    }
};

// Obtener una notificación específica
exports.obtenerNotificacionPorId = async (req, res) => {
    try {
        const notificacionId = req.params.id;
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        const notificacion = await Notificacion.findOne({
            where: {
                id: notificacionId,
                usuario_id: usuarioId
            }
        });
        
        if (!notificacion) {
            return res.status(404).json({
                mensaje: 'Notificación no encontrada'
            });
        }
        
        // Marcar como vista si no lo está
        if (!notificacion.vista) {
            notificacion.vista = true;
            await notificacion.save();
        }
        
        res.status(200).json(notificacion);
    } catch (error) {
        console.error('Error al obtener notificación:', error);
        res.status(500).json({
            mensaje: 'Error al obtener notificación',
            error: error.message
        });
    }
};

// Marcar una notificación como leída
exports.marcarComoLeida = async (req, res) => {
    try {
        const notificacionId = req.params.id;
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        const notificacion = await Notificacion.findOne({
            where: {
                id: notificacionId,
                usuario_id: usuarioId
            }
        });
        
        if (!notificacion) {
            return res.status(404).json({
                mensaje: 'Notificación no encontrada'
            });
        }
        
        notificacion.leida = true;
        notificacion.vista = true;
        await notificacion.save();
        
        res.status(200).json({
            mensaje: 'Notificación marcada como leída',
            notificacion
        });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({
            mensaje: 'Error al marcar notificación como leída',
            error: error.message
        });
    }
};

// Marcar una notificación como vista
exports.marcarComoVista = async (req, res) => {
    try {
        const notificacionId = req.params.id;
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        const notificacion = await Notificacion.findOne({
            where: {
                id: notificacionId,
                usuario_id: usuarioId
            }
        });
        
        if (!notificacion) {
            return res.status(404).json({
                mensaje: 'Notificación no encontrada'
            });
        }
        
        notificacion.vista = true;
        await notificacion.save();
        
        res.status(200).json({
            mensaje: 'Notificación marcada como vista',
            notificacion
        });
    } catch (error) {
        console.error('Error al marcar notificación como vista:', error);
        res.status(500).json({
            mensaje: 'Error al marcar notificación como vista',
            error: error.message
        });
    }
};

// Marcar todas las notificaciones como leídas
exports.marcarTodasLeidas = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        await Notificacion.update(
            { leida: true, vista: true },
            { where: { usuario_id: usuarioId, leida: false } }
        );
        
        res.status(200).json({
            mensaje: 'Todas las notificaciones han sido marcadas como leídas'
        });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        res.status(500).json({
            mensaje: 'Error al marcar todas las notificaciones como leídas',
            error: error.message
        });
    }
};

// Eliminar una notificación
exports.eliminarNotificacion = async (req, res) => {
    try {
        const notificacionId = req.params.id;
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        const resultado = await Notificacion.destroy({
            where: {
                id: notificacionId,
                usuario_id: usuarioId
            }
        });
        
        if (resultado === 0) {
            return res.status(404).json({
                mensaje: 'Notificación no encontrada'
            });
        }
        
        res.status(200).json({
            mensaje: 'Notificación eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({
            mensaje: 'Error al eliminar notificación',
            error: error.message
        });
    }
};

// Crear una nueva notificación (uso interno)
exports.crearNotificacion = async (notificacionData) => {
    try {
        const notificacion = await Notificacion.create(notificacionData);
        return notificacion;
    } catch (error) {
        console.error('Error al crear notificación:', error);
        throw error;
    }
};

// Actualizar preferencias de notificación
exports.actualizarPreferencias = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        const { preferencias } = req.body;
        
        if (!preferencias || typeof preferencias !== 'object') {
            return res.status(400).json({
                mensaje: 'Las preferencias proporcionadas no son válidas'
            });
        }
        
        // Lógica para guardar las preferencias en la base de datos
        // Esta implementación puede variar según la estructura de tu base de datos
        
        res.status(200).json({
            mensaje: 'Preferencias de notificación actualizadas',
            preferencias
        });
    } catch (error) {
        console.error('Error al actualizar preferencias de notificación:', error);
        res.status(500).json({
            mensaje: 'Error al actualizar preferencias de notificación',
            error: error.message
        });
    }
};

// Obtener preferencias de notificación
exports.obtenerPreferencias = async (req, res) => {
    try {
        const usuarioId = req.user.id;  // Cambiado de req.usuario.id a req.user.id
        
        // Lógica para obtener las preferencias de la base de datos
        // Esta implementación puede variar según la estructura de tu base de datos
        
        // Por ahora, devuelve valores predeterminados
        const preferenciasDefault = {
            pedido_nuevo: true,
            pedido_actualizado: true,
            pedido_completado: true,
            pedido_cancelado: true,
            notificaciones_sonido: true,
            notificaciones_desktop: true
        };
        
        res.status(200).json(preferenciasDefault);
    } catch (error) {
        console.error('Error al obtener preferencias de notificación:', error);
        res.status(500).json({
            mensaje: 'Error al obtener preferencias de notificación',
            error: error.message
        });
    }
};