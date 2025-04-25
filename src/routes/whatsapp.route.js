/**
 * Rutas para la API de WhatsApp
 */
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Proteger todas las rutas con autenticación
// Usamos la función correcta 'authenticate' en lugar de 'verifyToken'
router.use(authMiddleware.authenticate);

// Rutas de estado y control
router.get('/status', whatsappController.getWhatsAppStatus);
router.post('/restart', whatsappController.restartWhatsApp);

// Rutas para envío de mensajes
router.post('/send', whatsappController.sendWhatsAppMessage);
router.post('/enviar-mensaje', whatsappController.sendWhatsAppMessage);

// Nuevas rutas para el sistema de chat con proveedores
router.get('/chats', whatsappController.getChatsActivos);
router.post('/chats/responder', whatsappController.responderChat);
router.delete('/chats/:telefono', whatsappController.cerrarChat);

// Nuevos endpoints para mensajes de chat
router.get('/chats/:pedidoId/:telefono', whatsappController.getChatMessages);
router.post('/chats/:pedidoId/read', whatsappController.marcarMensajesLeidos);

module.exports = router;