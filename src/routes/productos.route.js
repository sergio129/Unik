// Rutas para la gestión de productos
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const productosController = require('../controllers/productos.controller');

// Obtener todos los productos
router.get('/', authenticate, productosController.getAllProductos);

// Obtener productos con bajo stock
router.get('/bajo-stock', authenticate, productosController.getProductosBajoStock);

// Obtener conteo de productos
router.get('/count', authenticate, productosController.countProductos);

// Rutas para importar/exportar productos
router.get('/exportar', authenticate, productosController.exportarProductos);
router.post('/importar', authenticate, productosController.importarProductos);
router.get('/plantilla', authenticate, productosController.descargarPlantilla);

// Obtener un producto específico
router.get('/:id', authenticate, productosController.getProductoById);

// Crear un nuevo producto
router.post('/', authenticate, productosController.createProducto);

// Actualizar un producto
router.put('/:id', authenticate, productosController.updateProducto);

// Eliminar un producto
router.delete('/:id', authenticate, productosController.deleteProducto);

// Actualizar stock de un producto
router.patch('/:id/stock', authenticate, productosController.updateStock);

// Actualizar estado de un producto
router.patch('/:id/estado', authenticate, productosController.updateEstado);

// Obtener historial de precios de un producto
router.get('/:id/historial-precios', authenticate, productosController.getHistorialPrecios);

// Duplicar un producto
router.post('/:id/duplicar', authenticate, productosController.duplicarProducto);

// Rutas para códigos de barras
router.get('/:id/codigos-barras', authenticate, productosController.getCodigosBarras);
router.post('/:id/codigos-barras', authenticate, productosController.registrarCodigoBarras);
router.delete('/:id/codigos-barras/:codigoId', authenticate, productosController.eliminarCodigoBarras);
router.get('/barcode/:codigo', authenticate, productosController.buscarPorCodigoBarras);

module.exports = router;