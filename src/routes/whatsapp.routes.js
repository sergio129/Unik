/**
 * Rutas para la gestión de WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { authenticateToken } = require('../middlewares/auth-prisma.middleware');

// Rutas públicas para webhooks (si se implementan en el futuro)
// router.post('/webhook', whatsappController.handleWebhook);

// Rutas protegidas que requieren autenticación
router.get('/status', authenticateToken, whatsappController.getWhatsAppStatus);
router.post('/restart', authenticateToken, whatsappController.restartWhatsApp);
router.get('/qr', authenticateToken, whatsappController.getWhatsAppStatus); // Usar la misma función por ahora
router.post('/enviar', authenticateToken, whatsappController.sendWhatsAppMessage);
router.post('/notificar-pedido', authenticateToken, whatsappController.sendWhatsAppMessage); // Usar la misma función por ahora

// Rutas para gestión de chats
router.get('/chats', authenticateToken, whatsappController.getChatsActivos);
router.get('/chats/:pedidoId/:telefono', authenticateToken, whatsappController.getChatMessages);
router.post('/chats/responder', authenticateToken, whatsappController.responderChat);
router.delete('/chats/:telefono', authenticateToken, whatsappController.cerrarChat);

module.exports = router;