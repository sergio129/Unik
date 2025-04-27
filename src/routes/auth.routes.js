/**
 * Rutas de autenticación
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Importa todo el middleware

// Rutas de autenticación
router.post('/login', authController.login);
router.post('/logout', authMiddleware.authenticate, authController.logout); // Cambiado verificarToken a authenticate
router.post('/register', authMiddleware.authenticate, authMiddleware.authorize('admin'), authController.register); // Asegurar que register también esté protegido

// Ruta para verificar el token actual (útil para el frontend)
router.get('/verificar-token', authMiddleware.authenticate, authController.verifyToken); // Cambiado verificarToken a authenticate

// Rutas para recuperación de contraseña
router.post('/reset-password-request', authController.resetPasswordRequest);
router.post('/reset-password', authController.resetPassword);

// Ruta para obtener información del usuario actual
router.get('/me', authMiddleware.authenticate, authController.me);

// Ruta para obtener sesiones activas del usuario
router.get('/sessions', authMiddleware.authenticate, authController.activeSessions);

// Ruta para actualizar contraseña (requiere estar logueado)
// router.post('/actualizar-password', authMiddleware.authenticate, authController.actualizarPassword); // Cambiado verificarToken a authenticate - Comentado si no existe el controlador

module.exports = router;