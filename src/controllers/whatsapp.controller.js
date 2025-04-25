/**
 * Controlador para la integración con WhatsApp
 * Gestiona las solicitudes relacionadas con el servicio de WhatsApp
 */

const whatsappService = require('../services/whatsappService');
const pedidosService = require('../services/pedidosService');

/**
 * Obtiene el estado actual de la conexión de WhatsApp
 */
const getWhatsAppStatus = async (req, res) => {
    try {
        const status = whatsappService.getStatus();
        
        // Si hay un error en el estado, verificar si podemos solucionarlo
        if (status.error && status.error.includes("Could not find expected browser (chrome)")) {
            console.log("Detectado error de Chrome faltante, intentando reiniciar WhatsApp");
            await whatsappService.restartConnection();
        }
        
        return res.status(200).json({
            success: true,
            message: 'Estado de WhatsApp obtenido correctamente',
            data: status
        });
    } catch (error) {
        console.error('Error al obtener estado de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estado de WhatsApp',
            error: error.message
        });
    }
};

/**
 * Reinicia la conexión de WhatsApp
 */
const restartWhatsApp = async (req, res) => {
    try {
        await whatsappService.restartConnection();
        
        return res.status(200).json({
            success: true,
            message: 'Conexión de WhatsApp reiniciada correctamente',
            data: whatsappService.getStatus()
        });
    } catch (error) {
        console.error('Error al reiniciar conexión de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al reiniciar conexión de WhatsApp',
            error: error.message
        });
    }
};

/**
 * Envía un mensaje de WhatsApp al número proporcionado
 */
const sendWhatsAppMessage = async (req, res) => {
    try {
        // Compatibilidad con diferentes nombres de parámetros
        // Acepta tanto 'numero' como 'telefono'
        const numero = req.body.numero || req.body.telefono;
        const { mensaje } = req.body;
        
        // Logging para depuración
        console.log('Solicitud de envío de WhatsApp recibida:', { 
            numero, 
            telefono: req.body.telefono,
            mensaje: mensaje ? (mensaje.length > 30 ? mensaje.substring(0, 30) + '...' : mensaje) : null
        });
        
        // Validar datos requeridos
        if (!numero || !mensaje) {
            return res.status(400).json({
                success: false,
                message: 'Número de teléfono y mensaje son requeridos'
            });
        }
        
        // Formatear número de teléfono si es necesario
        let telefonoFormateado = numero;
        
        // Si el número no comienza con +, añadir el formato correcto
        if (!telefonoFormateado.startsWith('+')) {
            // Si comienza con números (por ejemplo, 57...), añadir el +
            if (/^\d+$/.test(telefonoFormateado)) {
                telefonoFormateado = '+' + telefonoFormateado;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'El número de teléfono debe incluir el código de país (ej: +573103904286)'
                });
            }
        }
        
        // Verificar estado de WhatsApp
        const status = whatsappService.getStatus();
        if (!status.connected) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp no está conectado. Por favor, escanee el código QR para conectarse'
            });
        }
        
        // Enviar mensaje
        const result = await whatsappService.enviarMensaje(telefonoFormateado, mensaje);
        
        if (result) {
            console.log(`Mensaje WhatsApp enviado correctamente al número: ${telefonoFormateado}`);
            return res.status(200).json({
                success: true,
                message: 'Mensaje enviado correctamente',
                data: {
                    numero: telefonoFormateado,
                    timestamp: new Date()
                }
            });
        } else {
            console.error(`Error al enviar mensaje WhatsApp al número: ${telefonoFormateado}`);
            return res.status(500).json({
                success: false,
                message: 'No se pudo enviar el mensaje'
            });
        }
    } catch (error) {
        console.error('Error al enviar mensaje de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al enviar mensaje de WhatsApp',
            error: error.message
        });
    }
};

/**
 * Obtiene los chats activos con proveedores
 */
const getChatsActivos = async (req, res) => {
    try {
        // Obtenemos una lista de todos los chats activos desde el servicio
        const listaChats = [];
        
        // Recorremos el Map de chats activos
        for (const [telefono, chatInfo] of whatsappService.getChatsActivos()) {
            try {
                // Obtener información del pedido asociado
                const pedido = await pedidosService.obtenerPedido(chatInfo.pedidoId);
                
                // Obtener información del proveedor
                const proveedor = await pedidosService.obtenerProveedor(pedido.proveedor_id);
                
                // Obtener historial de mensajes del chat
                // Usamos obtenerMensajesChat en lugar de obtenerHistorialChat que no existe
                const historialMensajes = await pedidosService.obtenerMensajesChat(chatInfo.pedidoId);
                
                // Contar mensajes no leídos
                let mensajesNoLeidos = 0;
                if (historialMensajes && historialMensajes.length > 0) {
                    mensajesNoLeidos = historialMensajes.filter(m => 
                        m.origen === 'proveedor' && !m.leido
                    ).length;
                }
                
                listaChats.push({
                    telefono,
                    pedidoId: chatInfo.pedidoId,
                    pedido: {
                        id: pedido.id,
                        codigo: pedido.codigo,
                        estado: pedido.estado
                    },
                    proveedor: {
                        id: proveedor.id,
                        nombre: proveedor.nombre,
                        telefono: proveedor.telefono
                    },
                    proveedorNombre: proveedor.nombre,
                    pedidoCodigo: pedido.codigo,
                    fechaInicio: chatInfo.fechaInicio,
                    ultimoMensaje: chatInfo.ultimoMensaje,
                    mensajes: historialMensajes || [],
                    mensajes_no_leidos: mensajesNoLeidos
                });
            } catch (error) {
                console.error(`Error al procesar chat activo para teléfono ${telefono}:`, error);
            }
        }
        
        return res.status(200).json({
            success: true,
            message: 'Chats activos obtenidos correctamente',
            data: {
                total: listaChats.length,
                chats: listaChats
            }
        });
    } catch (error) {
        console.error('Error al obtener chats activos de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener chats activos',
            error: error.message
        });
    }
};

/**
 * Envía una respuesta a un proveedor desde el panel de administración
 */
const responderChat = async (req, res) => {
    try {
        const { telefono, pedidoId, mensaje, usuarioId } = req.body;
        
        // Validar datos requeridos
        if (!telefono || !pedidoId || !mensaje) {
            return res.status(400).json({
                success: false,
                message: 'Teléfono, ID del pedido y mensaje son requeridos'
            });
        }
        
        // Validar que exista un chat activo para ese teléfono
        const chatActivo = await whatsappService.verificarChatActivo(telefono);
        if (!chatActivo) {
            // Si no hay chat activo pero se quiere responder, activar uno nuevo
            await whatsappService.activarModoChat(telefono, pedidoId);
        }
        
        // Enviar la respuesta al proveedor
        const resultado = await whatsappService.responderAlProveedor(
            telefono, 
            pedidoId, 
            mensaje, 
            usuarioId || req.userId // Usar ID del usuario autenticado si no se proporciona explícitamente
        );
        
        if (resultado) {
            return res.status(200).json({
                success: true,
                message: 'Mensaje enviado correctamente al proveedor',
                data: {
                    telefono,
                    pedidoId,
                    timestamp: new Date()
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'No se pudo enviar el mensaje al proveedor'
            });
        }
    } catch (error) {
        console.error('Error al responder al chat de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al responder al chat',
            error: error.message
        });
    }
};

/**
 * Cierra un chat activo con un proveedor
 */
const cerrarChat = async (req, res) => {
    try {
        const { telefono } = req.params;
        
        if (!telefono) {
            return res.status(400).json({
                success: false,
                message: 'Teléfono del proveedor es requerido'
            });
        }
        
        // Verificar que exista un chat activo
        const chatActivo = await whatsappService.verificarChatActivo(telefono);
        if (!chatActivo) {
            return res.status(404).json({
                success: false,
                message: 'No existe un chat activo con este proveedor'
            });
        }
        
        // Obtener la información del chat antes de cerrarlo
        const chatInfo = whatsappService.getInfoChat(telefono);
        
        // Cerrar el chat
        const resultado = await whatsappService.desactivarModoChat(telefono);
        
        if (resultado) {
            // Enviar mensaje al proveedor informando que el chat ha sido cerrado
            await whatsappService.enviarMensaje(
                telefono,
                `✅ *Chat finalizado por el administrador*\n\n` +
                `La conversación ha sido cerrada por nuestro equipo de soporte.\n` +
                `Si necesita contactarnos nuevamente, puede iniciar un nuevo chat respondiendo con *CHAT*.`
            );
            
            return res.status(200).json({
                success: true,
                message: 'Chat cerrado correctamente',
                data: {
                    telefono,
                    pedidoId: chatInfo ? chatInfo.pedidoId : null
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'No se pudo cerrar el chat'
            });
        }
    } catch (error) {
        console.error('Error al cerrar chat de WhatsApp:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cerrar el chat',
            error: error.message
        });
    }
};

/**
 * Obtiene los mensajes de un chat específico
 */
const getChatMessages = async (req, res) => {
    try {
        const { pedidoId, telefono } = req.params;
        
        if (!pedidoId || !telefono) {
            return res.status(400).json({
                success: false,
                message: 'ID del pedido y teléfono son requeridos'
            });
        }
        
        // Obtener mensajes del chat
        const mensajes = await pedidosService.obtenerMensajesChat(pedidoId);
        
        // Obtener información del pedido
        const pedido = await pedidosService.obtenerPedido(pedidoId);
        
        // Obtener información del proveedor
        let proveedor = null;
        if (pedido && pedido.proveedor_id) {
            proveedor = await pedidosService.obtenerProveedor(pedido.proveedor_id);
        }
        
        // Marcar mensajes como leídos
        await pedidosService.marcarMensajesComoLeidos(pedidoId);
        
        return res.status(200).json({
            success: true,
            message: 'Mensajes obtenidos correctamente',
            data: {
                pedido,
                proveedor,
                mensajes
            }
        });
    } catch (error) {
        console.error('Error al obtener mensajes del chat:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener mensajes del chat',
            error: error.message
        });
    }
};

/**
 * Marca los mensajes de un chat como leídos
 */
const marcarMensajesLeidos = async (req, res) => {
    try {
        const { pedidoId } = req.params;
        
        if (!pedidoId) {
            return res.status(400).json({
                success: false,
                message: 'ID del pedido es requerido'
            });
        }
        
        // Marcar mensajes como leídos
        await pedidosService.marcarMensajesComoLeidos(pedidoId);
        
        return res.status(200).json({
            success: true,
            message: 'Mensajes marcados como leídos correctamente'
        });
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al marcar mensajes como leídos',
            error: error.message
        });
    }
};

module.exports = {
    getWhatsAppStatus,
    restartWhatsApp,
    sendWhatsAppMessage,
    getChatsActivos,
    responderChat,
    cerrarChat,
    getChatMessages,
    marcarMensajesLeidos
};