// Rutas para clientes
const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Rutas públicas para usuarios autenticados
router.get('/', clientesController.getAllClientes);
router.get('/search', clientesController.searchClientes);
router.get('/:id', clientesController.getClienteById);

// Rutas que requieren roles específicos
router.post('/', clientesController.createCliente);
router.put('/:id', clientesController.updateCliente);
router.delete('/:id', clientesController.deleteCliente);

module.exports = router;