// Rutas para categorías con Prisma
const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias-prisma.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-prisma.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de consulta
router.get('/', categoriasController.getAllCategorias);
router.get('/search', categoriasController.searchCategorias);
router.get('/estadisticas', categoriasController.getEstadisticasCategorias);
router.get('/:id', categoriasController.getCategoriaById);
router.get('/:id/productos', categoriasController.getProductosCategoria);

// Rutas de modificación (requieren permisos)
router.post('/', authorizeRoles(['admin', 'empleado']), categoriasController.createCategoria);
router.put('/:id', authorizeRoles(['admin', 'empleado']), categoriasController.updateCategoria);
router.delete('/:id', authorizeRoles(['admin']), categoriasController.deleteCategoria);

// Operaciones masivas (solo admin)
router.post('/bulk-update', authorizeRoles(['admin']), categoriasController.bulkUpdateCategorias);

module.exports = router;
