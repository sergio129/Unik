// Rutas para pedidos con Prisma
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos-prisma.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-prisma.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de consulta
router.get('/', pedidosController.obtenerPedidos);
router.get('/estadisticas', pedidosController.obtenerEstadisticas);
router.get('/buscar', pedidosController.buscarPedidos);
router.get('/:id', pedidosController.obtenerPedidoPorId);

// Rutas de modificación
router.post('/', authorizeRoles(['admin', 'empleado']), pedidosController.crearPedido);
router.put('/:id', authorizeRoles(['admin', 'empleado']), pedidosController.actualizarPedido);
router.delete('/:id', authorizeRoles(['admin']), pedidosController.eliminarPedido);

// Gestión de estados
router.put('/:id/estado', authorizeRoles(['admin', 'empleado']), pedidosController.cambiarEstadoPedido);
router.post('/:id/seguimiento', authorizeRoles(['admin', 'empleado']), pedidosController.registrarSeguimiento);

module.exports = router;
