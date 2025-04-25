// Rutas para los reportes de inventario
const express = require('express');
const reportesController = require('../controllers/reportes.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Crear un nuevo router
const router = express.Router();

// Definir rutas con funciones explícitas como callbacks
router.get('/stock-trends', authMiddleware.verifyToken, (req, res) => {
  reportesController.getStockTrends(req, res);
});

router.get('/top-products', authMiddleware.verifyToken, (req, res) => {
  reportesController.getTopProducts(req, res);
});

router.get('/rotation', authMiddleware.verifyToken, (req, res) => {
  reportesController.getRotationAnalysis(req, res);
});

router.get('/projections', authMiddleware.verifyToken, (req, res) => {
  reportesController.getStockProjections(req, res);
});

router.get('/export', authMiddleware.verifyToken, (req, res) => {
  reportesController.exportData(req, res);
});

router.get('/alertas', authMiddleware.verifyToken, (req, res) => {
  reportesController.getAlerts(req, res);
});

router.post('/alertas/configuracion', authMiddleware.verifyToken, (req, res) => {
  reportesController.configureAlerts(req, res);
});

// Exportar el router
module.exports = router;