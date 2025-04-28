const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Ruta para obtener la actividad reciente
router.get('/reciente', authenticate, actividadController.getRecentActivity);

// Ruta para obtener las categorías más activas
router.get('/categorias/top', authenticate, actividadController.getCategoriasTopActividad);

module.exports = router;