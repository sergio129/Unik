// Rutas para actividad del sistema con Prisma
const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad-prisma.controller');
const authMiddleware = require('../middlewares/auth-prisma.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Rutas de actividad
router.get('/', actividadController.getRecentActivity);
router.get('/categorias/top', actividadController.getTopCategorias);

module.exports = router;
