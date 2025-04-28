// Rutas para los reportes de inventario
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Configuración de rutas
router.get('/stock-trends', authMiddleware.authenticate, reportesController.getStockTrends);
router.get('/top-products', authMiddleware.authenticate, reportesController.getTopProducts);
router.get('/rotation', authMiddleware.authenticate, reportesController.getRotationAnalysis);
router.get('/projections', authMiddleware.authenticate, reportesController.getStockProjections);
router.get('/export', authMiddleware.authenticate, reportesController.exportData);
router.get('/alertas', authMiddleware.authenticate, reportesController.getAlerts);
router.post('/alertas/configuracion', authMiddleware.authenticate, reportesController.configureAlerts);

module.exports = router;