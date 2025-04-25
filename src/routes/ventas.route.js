// Rutas para ventas
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Ruta para obtener resumen de ventas diarias (para el dashboard)
router.get('/resumen/diario', ventasController.getVentasDiarias);

// Rutas públicas para usuarios autenticados
router.get('/', ventasController.getAllFacturas); // Ruta principal para obtener todas las facturas
router.get('/facturas', ventasController.getAllFacturas); // Mantener compatibilidad con código existente
router.get('/facturas/:id', ventasController.getFacturaById);
router.get('/:id', ventasController.getFacturaById); // Ruta simplificada para obtener factura por ID

// Crear venta
router.post('/nueva', ventasController.createVenta);

// Anular factura (ventas)
router.put('/facturas/:id/anular', ventasController.anularFactura);
router.post('/:id/anular', ventasController.anularFactura); // Ruta más RESTful para anular

// Rutas para devoluciones
router.post('/:id/devolucion', ventasController.procesarDevolucion);

// Generar PDF
router.get('/facturas/:id/pdf', ventasController.generarPDF);
router.get('/:id/pdf', ventasController.generarPDF); // Ruta simplificada para generar PDF
router.get('/download/factura/:numero', ventasController.descargarPDF);

module.exports = router;