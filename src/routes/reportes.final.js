// Rutas para los reportes de inventario
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const reportesController = require('../controllers/reportes.controller');

// Configuración de rutas
router.get('/stock-trends', authenticate, reportesController.getStockTrends);
router.get('/top-products', authenticate, reportesController.getTopProducts);
router.get('/rotation', authenticate, reportesController.getRotationAnalysis);
router.get('/projections', authenticate, reportesController.getStockProjections);
router.get('/export', authenticate, reportesController.exportData);
router.get('/alertas', authenticate, reportesController.getAlerts);
router.post('/alertas/configuracion', authenticate, reportesController.configureAlerts);

module.exports = router;