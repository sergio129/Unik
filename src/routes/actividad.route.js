// Rutas para la actividad reciente
const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Ruta para obtener la actividad reciente
router.get('/reciente', actividadController.getRecentActivity);

module.exports = router;