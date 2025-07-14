// Rutas para autenticación con Prisma
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-prisma.controller');
const { authenticateToken } = require('../middlewares/auth-prisma.middleware');

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/register', authController.register);
router.post('/verify-token', authController.verifyToken);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.post('/refresh-token', authenticateToken, authController.refreshToken);
router.put('/change-password', authenticateToken, authController.cambiarPassword);

module.exports = router;
