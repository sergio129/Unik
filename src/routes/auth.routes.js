/**
 * Rutas de autenticación
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Ruta para login
router.post('/login', authController.login);

// Ruta para logout
router.post('/logout', authMiddleware.verificarToken, authController.logout);

// Ruta para verificar token
router.get('/verificar-token', authMiddleware.verificarToken, (req, res) => {
    res.status(200).json({ 
        auth: true, 
        mensaje: 'Token válido',
        usuario: req.usuario
    });
});

// Ruta para actualizar contraseña
router.post('/actualizar-password', authMiddleware.verificarToken, authController.actualizarPassword);

module.exports = router;