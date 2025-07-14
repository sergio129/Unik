// Rutas para productos con Prisma
const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos-prisma.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-prisma.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de consulta
router.get('/', productosController.getAllProductos);
router.get('/count', productosController.getProductosCount);
router.get('/search', productosController.searchProductos);
router.get('/bajo-stock', productosController.getProductosBajoStock);
router.get('/estadisticas', productosController.getEstadisticasProductos);
router.get('/:codigo', productosController.getProductoByCodigo);

// Rutas de modificación (requieren permisos)
router.post('/', authorizeRoles(['admin', 'empleado']), productosController.uploadProductImage, productosController.createProducto);
router.put('/:codigo', authorizeRoles(['admin', 'empleado']), productosController.uploadProductImage, productosController.updateProducto);
router.delete('/:codigo', authorizeRoles(['admin']), productosController.deleteProducto);

// Gestión de stock
router.put('/:codigo/stock', authorizeRoles(['admin', 'empleado']), productosController.updateStock);

module.exports = router;
