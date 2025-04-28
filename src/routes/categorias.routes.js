const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const categoriasController = require('../controllers/categorias.controller');

// Rutas para obtener estadísticas
// (Importante: Estas rutas deben estar ANTES de las rutas con parámetros)
router.get('/stats/productos', authenticate, categoriasController.getCategoriasConMasProductos);
// Ruta para contar categorías activas
router.get('/count', authenticate, categoriasController.countCategorias);

// Rutas para obtener categorías
router.get('/', authenticate, categoriasController.getAllCategorias);

// Rutas con parámetros
router.get('/:id', authenticate, categoriasController.getCategoriaById);
router.get('/:id/productos', authenticate, categoriasController.getProductosByCategoria);
router.get('/:id/subcategorias', authenticate, categoriasController.getSubcategorias);

// Rutas para crear y manipular categorías
router.post('/', authenticate, categoriasController.createCategoria);
router.put('/:id', authenticate, categoriasController.updateCategoria);
router.delete('/:id', authenticate, categoriasController.deleteCategoria);
router.put('/:id/mover', authenticate, categoriasController.moveCategoria);

// Rutas para acciones masivas
router.post('/bulk-activate', authenticate, categoriasController.bulkActivate);
router.post('/bulk-deactivate', authenticate, categoriasController.bulkDeactivate);
router.post('/bulk-delete', authenticate, categoriasController.bulkDelete);

module.exports = router;