// Rutas para usuarios con Prisma
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios-prisma.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-prisma.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para consulta (acceso general)
router.get('/', usuariosController.getAllUsuarios);
router.get('/search', usuariosController.searchUsuarios);
router.get('/estadisticas', authorizeRoles(['admin']), usuariosController.getEstadisticasUsuarios);
router.get('/:id', usuariosController.getUsuarioById);

// Rutas para modificación (solo admin)
router.post('/', authorizeRoles(['admin']), usuariosController.createUsuario);
router.put('/:id', authorizeRoles(['admin']), usuariosController.updateUsuario);
router.delete('/:id', authorizeRoles(['admin']), usuariosController.deleteUsuario);

// Rutas para usuario autenticado
router.put('/perfil/update', usuariosController.updatePerfil);
router.put('/:id/change-password', usuariosController.cambiarPassword);

module.exports = router;
