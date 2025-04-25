/**
 * Rutas para el módulo de pedidos
 */
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Obtener todos los pedidos con filtros opcionales
router.get('/', pedidosController.obtenerPedidos);

// Obtener estadísticas de pedidos
router.get('/estadisticas', pedidosController.obtenerEstadisticas);

// Añadir ruta para el resumen de estadísticas
router.get('/estadisticas/resumen', pedidosController.obtenerEstadisticas);

// Registrar nuevo seguimiento para un pedido
router.post('/:id/seguimiento', pedidosController.registrarSeguimiento);

// Obtener un pedido específico por su ID
router.get('/:id', pedidosController.obtenerPedidoPorId);

// Crear un nuevo pedido
router.post('/', pedidosController.crearPedido);

// Actualizar un pedido existente
router.put('/:id', pedidosController.actualizarPedido);

// Cambiar estado de un pedido
router.patch('/:id/estado', pedidosController.cambiarEstadoPedido);

module.exports = router;