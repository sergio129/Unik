const express = require('express');
const router = express.Router();
const { perfilController, upload } = require('../controllers/perfil.controller');
const { validarJWT } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(validarJWT);

// Obtener perfil del usuario autenticado
router.get('/', perfilController.obtenerPerfil);

// Obtener perfil de cualquier usuario (para administradores o el propio usuario)
router.get('/:id', perfilController.obtenerPerfilPorId);

// Actualizar perfil del usuario
router.put('/', perfilController.actualizarPerfil);

// Subir foto de perfil
router.post('/foto', upload.single('foto_perfil'), perfilController.subirFotoPerfil);

// Eliminar foto de perfil
router.delete('/foto', perfilController.eliminarFotoPerfil);

module.exports = router;