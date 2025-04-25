/**
 * Rutas para la gestión de WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas para webhooks (si se implementan en el futuro)
// router.post('/webhook', whatsappController.handleWebhook);

// Rutas protegidas que requieren autenticación
router.get('/status', authMiddleware.verifyToken, whatsappController.getStatus);
router.post('/restart', authMiddleware.verifyToken, whatsappController.restartConnection);
router.get('/qr', authMiddleware.verifyToken, whatsappController.getQrCode);
router.post('/enviar', authMiddleware.verifyToken, whatsappController.enviarMensaje);
router.post('/notificar-pedido', authMiddleware.verifyToken, whatsappController.notificarPedido);

// Rutas para gestión de chats
router.get('/chats', authMiddleware.verifyToken, whatsappController.getChatsActivos);
router.get('/chats/:pedidoId/:telefono', authMiddleware.verifyToken, whatsappController.getMensajesChat);
router.post('/chats/responder', authMiddleware.verifyToken, whatsappController.responderChat);
router.delete('/chats/:telefono', authMiddleware.verifyToken, whatsappController.finalizarChat);

module.exports = router;