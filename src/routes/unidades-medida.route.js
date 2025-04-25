const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const UnidadesMedidaController = require('../controllers/unidades-medida.controller');

// Rutas para unidades de medida
router.get('/', authMiddleware, UnidadesMedidaController.getAll);
router.get('/:id', authMiddleware, UnidadesMedidaController.getOne);
router.post('/', authMiddleware, UnidadesMedidaController.create);
router.put('/:id', authMiddleware, UnidadesMedidaController.update);
router.delete('/:id', authMiddleware, UnidadesMedidaController.delete);

// Rutas para conversiones
router.get('/:id/conversiones', authMiddleware, UnidadesMedidaController.getConversiones);
router.post('/:id/conversiones', authMiddleware, UnidadesMedidaController.agregarConversion);
router.put('/:id/conversiones/:conversionId', authMiddleware, UnidadesMedidaController.actualizarConversion);
router.delete('/:id/conversiones/:conversionId', authMiddleware, UnidadesMedidaController.eliminarConversion);

module.exports = router;