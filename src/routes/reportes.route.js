// Rutas para los reportes de inventario
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Configuración de rutas
router.get('/stock-trends', authMiddleware.verifyToken, reportesController.getStockTrends);
router.get('/top-products', authMiddleware.verifyToken, reportesController.getTopProducts);
router.get('/rotation', authMiddleware.verifyToken, reportesController.getRotationAnalysis);
router.get('/projections', authMiddleware.verifyToken, reportesController.getStockProjections);
router.get('/export', authMiddleware.verifyToken, reportesController.exportData);
router.get('/alertas', authMiddleware.verifyToken, reportesController.getAlerts);
router.post('/alertas/configuracion', authMiddleware.verifyToken, reportesController.configureAlerts);

module.exports = router;