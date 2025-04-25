// Rutas para la gestión de usuarios
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Middleware para proteger todas las rutas de usuarios
// Solo los usuarios autenticados con rol 'admin' pueden acceder
router.use(authenticate, authorize('admin'));

// Rutas para gestión de usuarios
router.get('/', usuariosController.getAllUsers);
router.get('/:id', usuariosController.getUserById);
router.post('/', usuariosController.createUser);
router.put('/:id', usuariosController.updateUser);
router.delete('/:id', usuariosController.deleteUser);
router.post('/:id/change-password', usuariosController.changePassword);

module.exports = router;