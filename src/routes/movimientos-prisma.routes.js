// Rutas para la gestión de movimientos de inventario con Prisma
const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientos-prisma.controller');
const { authenticateToken } = require('../middlewares/auth-prisma.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para movimientos de inventario
router.get('/', movimientosController.getAllMovimientos);
router.get('/count', movimientosController.countMovimientos);
router.get('/resumen', movimientosController.getResumenMovimientos);
router.get('/:id', movimientosController.getMovimientoById);
router.post('/', movimientosController.createMovimiento);

module.exports = router;
