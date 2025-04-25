const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Ruta pública de login
router.post('/login', authController.login);

// Ruta para cerrar sesión (requiere autenticación)
router.post('/logout', authenticate, authController.logout);

// Ruta para registrar nuevos usuarios (solo admin)
router.post('/register', authenticate, authorize('admin'), authController.register);

// Ruta para obtener información del usuario actual
router.get('/me', authenticate, authController.me);

// Ruta para listar sesiones activas
router.get('/sessions', authenticate, authController.activeSessions);

module.exports = router;