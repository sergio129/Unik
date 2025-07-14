// Rutas para ventas con Prisma
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas-prisma.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-prisma.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de consulta
router.get('/', ventasController.getAllFacturas);
router.get('/diarias', ventasController.getVentasDiarias);
router.get('/estadisticas', ventasController.getEstadisticasVentas);
router.get('/:id', ventasController.getFacturaById);
router.get('/:id/pdf', ventasController.generarPDF);

// Rutas de modificación
router.post('/', authorizeRoles(['admin', 'empleado', 'vendedor']), ventasController.createVenta);
router.post('/nueva', authorizeRoles(['admin', 'empleado', 'vendedor']), ventasController.createVenta); // Alias para compatibilidad
router.put('/:id/anular', authorizeRoles(['admin']), ventasController.anularFactura);
router.post('/:id/devolucion', authorizeRoles(['admin', 'empleado']), ventasController.procesarDevolucion);

module.exports = router;
