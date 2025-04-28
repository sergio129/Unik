// Rutas para la gestión de categorías
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const categoriasController = require('../controllers/categorias.controller');

// Obtener todas las categorías
router.get('/', authenticate, categoriasController.getAllCategorias);

// Obtener conteo de categorías
router.get('/count', authenticate, categoriasController.countCategorias);

// Obtener una categoría específica
router.get('/:id', authenticate, categoriasController.getCategoriaById);

// Crear una nueva categoría
router.post('/', authenticate, categoriasController.createCategoria);

// Actualizar una categoría
router.put('/:id', authenticate, categoriasController.updateCategoria);

// Eliminar una categoría
router.delete('/:id', authenticate, categoriasController.deleteCategoria);

// Obtener productos por categoría
router.get('/:id/productos', authenticate, categoriasController.getProductosByCategoria);

// Operaciones masivas
router.post('/bulk-activate', authenticate, categoriasController.bulkActivate);
router.post('/bulk-deactivate', authenticate, categoriasController.bulkDeactivate);
router.post('/bulk-delete', authenticate, categoriasController.bulkDelete);

module.exports = router;