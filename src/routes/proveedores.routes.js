/**
 * Rutas para gestión de proveedores
 */
const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedores.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Rutas para proveedores
router.get('/', proveedoresController.obtenerProveedores);
router.get('/:id', proveedoresController.obtenerProveedorPorId);
router.post('/', proveedoresController.crearProveedor);
router.put('/:id', proveedoresController.actualizarProveedor);
router.delete('/:id', proveedoresController.eliminarProveedor);

// Ruta para estadísticas de un proveedor específico
router.get('/:id/estadisticas', proveedoresController.obtenerEstadisticasProveedor);

module.exports = router;