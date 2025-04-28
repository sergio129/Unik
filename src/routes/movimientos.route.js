// Rutas para la gestión de movimientos de inventario
const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientos.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Rutas para movimientos de inventario
router.get('/', movimientosController.getAllMovimientos);
router.get('/count', movimientosController.countMovimientos);
router.get('/resumen', movimientosController.getResumenMovimientos);
router.get('/:id', movimientosController.getMovimientoById);
router.post('/', movimientosController.createMovimiento);

module.exports = router;