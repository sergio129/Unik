// Rutas para la gestión de categorías
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const categoriasController = require('../controllers/categorias.controller');

// Obtener todas las categorías
router.get('/', authenticate, categoriasController.getAllCategorias);

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

module.exports = router;