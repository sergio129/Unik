/**
 * Rutas para el sistema de notificaciones
 */
const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware para verificar token en todas las rutas
router.use(authMiddleware.authenticate);

// Obtener todas las notificaciones del usuario actual
router.get('/', notificacionesController.obtenerNotificaciones);

// Obtener usuarios con estadísticas de notificaciones
router.get('/usuarios', notificacionesController.obtenerUsuariosConNotificaciones);

// Obtener notificaciones de un usuario específico
router.get('/usuarios/:usuarioId', notificacionesController.obtenerNotificacionesPorUsuario);

// Limpiar todas las notificaciones de los usuarios (solo admin)
router.delete('/usuarios/clear', notificacionesController.limpiarNotificacionesUsuarios);

// Obtener notificaciones no leídas del usuario actual
router.get('/no-leidas', notificacionesController.obtenerNotificacionesNoLeidas);

// Obtener conteo de notificaciones no leídas
router.get('/conteo', notificacionesController.obtenerConteoNoLeidas);

// Obtener una notificación específica
router.get('/:id', notificacionesController.obtenerNotificacionPorId);

// Marcar una notificación como leída
router.put('/:id/marcar-leida', notificacionesController.marcarComoLeida);

// Marcar una notificación como vista
router.put('/:id/marcar-vista', notificacionesController.marcarComoVista);

// Marcar todas las notificaciones como leídas
router.put('/marcar-todas-leidas', notificacionesController.marcarTodasLeidas);

// Eliminar una notificación
router.delete('/:id', notificacionesController.eliminarNotificacion);

// Registrar preferencias de notificación del usuario
router.post('/preferencias', notificacionesController.actualizarPreferencias);

// Obtener preferencias de notificación del usuario
router.get('/preferencias', notificacionesController.obtenerPreferencias);

module.exports = router;