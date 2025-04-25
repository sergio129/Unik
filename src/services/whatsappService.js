/**
 * Servicio de WhatsApp para integración con la app
 * Utiliza whatsapp-web.js para conectar con WhatsApp Web
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Importar los servicios necesarios para pedidos
let pedidosService = null;
try {
    pedidosService = require('./pedidosService');
} catch (error) {
    console.log('Nota: El servicio de pedidos no está disponible. Se cargará dinámicamente cuando esté disponible.');
}

// Configuración
const SESSION_PATH = path.join(__dirname, '../../whatsapp-sessions');
const QR_PATH = path.join(__dirname, '../../public/temp');

// Asegurarse de que existan los directorios necesarios
if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
}
if (!fs.existsSync(QR_PATH)) {
    fs.mkdirSync(QR_PATH, { recursive: true });
}

// Estado de conexión
let connectionStatus = {
    ready: false,
    connected: false,
    qr: null,
    lastQrTimestamp: null,
    error: null,
    initializing: false
};

// Cliente de WhatsApp
let client = null;

/**
 * Inicializa el cliente de WhatsApp
 */
const initializeWhatsApp = () => {
    if (connectionStatus.initializing || client) {
        console.log('WhatsApp ya está inicializado o en proceso de inicialización');
        return;
    }

    connectionStatus.initializing = true;
    connectionStatus.error = null;

    console.log('Inicializando cliente de WhatsApp...');

    // Crear instancia del cliente con autenticación local
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: SESSION_PATH
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            executablePath: process.env.CHROME_PATH || undefined, // Usa una variable de entorno para definir la ruta a Chrome
            // Si no se define CHROME_PATH, puppeteer-core intentará usar el Chrome instalado en el sistema
        }
    });

    // Manejar evento de código QR
    client.on('qr', (qr) => {
        console.log('Nuevo código QR recibido');
        connectionStatus.qr = qr;
        connectionStatus.lastQrTimestamp = Date.now();
        
        // Solo guardar como archivo para la interfaz web
        const qrFilePath = path.join(QR_PATH, 'whatsapp-qr.txt');
        fs.writeFileSync(qrFilePath, qr);
    });

    // Evento cuando está listo
    client.on('ready', () => {
        console.log('Cliente de WhatsApp listo');
        connectionStatus.ready = true;
        connectionStatus.connected = true;
        connectionStatus.initializing = false;
        connectionStatus.error = null;
    });

    // Evento de autenticación exitosa
    client.on('authenticated', () => {
        console.log('WhatsApp autenticado');
        connectionStatus.connected = true;
    });

    // Evento de desconexión
    client.on('disconnected', (reason) => {
        console.log('WhatsApp desconectado:', reason);
        connectionStatus.connected = false;
        connectionStatus.ready = false;
        connectionStatus.error = `Desconectado: ${reason}`;
        
        // Reiniciar el cliente después de un tiempo
        client = null;
        setTimeout(() => {
            if (!connectionStatus.initializing) {
                console.log('Intentando reconectar WhatsApp automáticamente...');
                initializeWhatsApp();
            }
        }, 10000); // 10 segundos
    });

    // Manejar errores
    client.on('auth_failure', (msg) => {
        console.error('Error de autenticación en WhatsApp:', msg);
        connectionStatus.error = `Error de autenticación: ${msg}`;
        connectionStatus.connected = false;
        connectionStatus.initializing = false;
    });

    // Añadir manejador para mensajes entrantes
    client.on('message', async (message) => {
        console.log('Mensaje recibido:', message.body, 'de:', message.from);
        
        try {
            // Procesar mensaje entrante
            await procesarMensajeEntrante(message);
        } catch (error) {
            console.error('Error al procesar mensaje entrante:', error);
        }
    });

    // Inicializar cliente
    try {
        client.initialize().catch(err => {
            console.error('Error al inicializar WhatsApp:', err);
            connectionStatus.error = `Error de inicialización: ${err.message}`;
            connectionStatus.initializing = false;
        });
    } catch (error) {
        console.error('Error en inicialización de WhatsApp:', error);
        connectionStatus.error = `Error crítico: ${error.message}`;
        connectionStatus.initializing = false;
    }
};

/**
 * Obtiene el estado actual de la conexión de WhatsApp
 */
const getStatus = () => {
    // Genera un timestamp para identificar esta consulta
    const timestamp = Date.now();
    
    // Si han pasado más de 5 minutos desde el último QR, lo eliminamos
    if (connectionStatus.lastQrTimestamp && 
        (timestamp - connectionStatus.lastQrTimestamp > 5 * 60 * 1000)) {
        connectionStatus.qr = null;
    }
    
    return {
        ready: connectionStatus.ready,
        connected: connectionStatus.connected,
        hasQr: !!connectionStatus.qr,
        error: connectionStatus.error,
        initializing: connectionStatus.initializing,
        timestamp
    };
};

/**
 * Reinicia la conexión de WhatsApp
 */
const restartConnection = async () => {
    console.log('Reiniciando conexión de WhatsApp...');
    
    // Destruir cliente si existe
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.error('Error al destruir cliente de WhatsApp:', error);
        }
    }
    
    // Resetear cliente y estado
    client = null;
    connectionStatus = {
        ready: false,
        connected: false,
        qr: null,
        lastQrTimestamp: null,
        error: null,
        initializing: false
    };
    
    // Inicializar de nuevo
    initializeWhatsApp();
    
    return getStatus();
};

/**
 * Obtiene el código QR actual
 */
const getQrCode = () => {
    return connectionStatus.qr;
};

/**
 * Envía un mensaje de WhatsApp
 * @param {string} numero - Número de teléfono con formato internacional
 * @param {string} mensaje - Texto del mensaje a enviar
 */
const enviarMensaje = async (numero, mensaje) => {
    if (!client || !connectionStatus.ready) {
        console.error('Cliente de WhatsApp no está listo');
        return false;
    }
    
    try {
        // Eliminar caracteres no numéricos
        let numeroLimpio = numero.replace(/\D/g, '');
        
        // Asegurarse de que el número tenga el código de país de Colombia (57)
        if (!numeroLimpio.startsWith('57')) {
            // Si es un número colombiano de 10 dígitos (sin código), agregar el 57
            if (numeroLimpio.length === 10) {
                numeroLimpio = '57' + numeroLimpio;
            }
            // Si ya tiene otro código de país, mantenerlo
        }
        
        // Validación del número final
        if (!/^\d+$/.test(numeroLimpio) || numeroLimpio.length < 10) {
            console.error('Formato de número inválido después de formatear:', numeroLimpio, 'Original:', numero);
            return false;
        }
        
        // Registrar el número que estamos usando para debugging
        console.log(`Enviando mensaje de WhatsApp a número formateado: ${numeroLimpio} (original: ${numero})`);
        
        // Enviar mensaje
        const chatId = `${numeroLimpio}@c.us`;
        await client.sendMessage(chatId, mensaje);
        
        console.log(`Mensaje enviado a ${chatId}`);
        return true;
    } catch (error) {
        console.error('Error al enviar mensaje de WhatsApp:', error, 'Número:', numero);
        return false;
    }
};

/**
 * Notifica a un proveedor sobre un nuevo pedido
 * @param {Object} pedido - Objeto con los datos del pedido
 * @param {Object} proveedor - Objeto con los datos del proveedor
 * @param {Array} productos - Lista de productos del pedido
 */
const notificarNuevoPedido = async (pedido, proveedor, productos) => {
    if (!proveedor.telefono) {
        console.log('El proveedor no tiene número de teléfono registrado');
        return false;
    }
    
    try {
        let mensaje = `¡Hola ${proveedor.nombre}!\n\n`;
        mensaje += `Hemos generado un nuevo pedido con código: ${pedido.codigo}.\n\n`;
        
        // Añadir información de productos si está disponible
        if (productos && productos.length > 0) {
            mensaje += "🛒 Productos solicitados:\n";
            productos.forEach((producto, index) => {
                mensaje += `${index + 1}. ${producto.nombre} - ${producto.cantidad} unidades\n`;
            });
            mensaje += "\n";
        }
        
        // Añadir fecha de entrega si está disponible
        if (pedido.fecha_entrega_estimada) {
            const fecha = new Date(pedido.fecha_entrega_estimada);
            mensaje += `📅 Fecha de entrega estimada: ${fecha.toLocaleDateString('es-CO')}\n\n`;
        }
        
        mensaje += "✅ OPCIONES DE RESPUESTA:\n";
        mensaje += "Responda con un número para realizar las siguientes acciones:\n\n";
        mensaje += "1️⃣ Confirmar recepción del pedido\n";
        mensaje += "2️⃣ Solicitar más detalles del pedido\n";
        mensaje += "3️⃣ Reportar un problema con este pedido\n\n";
        
        mensaje += "Gracias por su colaboración.\n";
        mensaje += "Equipo de La UNIK";
        
        // Enviar el mensaje
        const resultado = await enviarMensaje(proveedor.telefono, mensaje);
        return resultado;
    } catch (error) {
        console.error('Error al notificar nuevo pedido por WhatsApp:', error);
        return false;
    }
};

/**
 * Notifica a un proveedor que su pedido ha sido recibido
 * @param {Object} pedido - Objeto con los datos del pedido
 * @param {Object} proveedor - Objeto con los datos del proveedor
 */
const notificarPedidoRecibido = async (pedido, proveedor) => {
    if (!proveedor.telefono) {
        console.log('El proveedor no tiene número de teléfono registrado');
        return false;
    }
    
    try {
        let mensaje = `¡Hola ${proveedor.nombre}!\n\n`;
        mensaje += `Confirmamos que hemos recibido correctamente el pedido ${pedido.codigo}.\n\n`;
        mensaje += `Los artículos han sido añadidos a nuestro inventario.\n\n`;
        mensaje += `Agradecemos su colaboración y esperamos seguir trabajando juntos.\n\n`;
        mensaje += "Saludos cordiales,\n";
        mensaje += "Equipo de La UNIK";
        
        // Enviar el mensaje
        const resultado = await enviarMensaje(proveedor.telefono, mensaje);
        return resultado;
    } catch (error) {
        console.error('Error al notificar recepción de pedido por WhatsApp:', error);
        return false;
    }
};

/**
 * Procesa los mensajes entrantes y ejecuta acciones según el contenido
 * @param {Object} message - Mensaje recibido de WhatsApp
 */
const procesarMensajeEntrante = async (message) => {
    // Verificar si es un mensaje de un chat individual (no grupo ni newsletter)
    if (!message.from.endsWith('@c.us')) {
        // Es un mensaje de grupo o newsletter, lo ignoramos
        return;
    }
    
    // Asegurar que el servicio de pedidos esté cargado
    if (!pedidosService) {
        try {
            pedidosService = require('./pedidosService');
        } catch (error) {
            console.error('No se pudo cargar el servicio de pedidos:', error);
            return;
        }
    }
    
    // Obtener el remitente (sin el sufijo @c.us)
    const remitente = message.from.split('@')[0];
    
    // Obtener el contenido del mensaje
    const contenido = message.body.trim();
    
    if (!contenido) {
        // Ignorar mensajes vacíos
        return;
    }
    
    console.log(`Procesando respuesta de proveedor: "${contenido}" - Número: ${remitente}`);
    
    try {
        // Buscar pedidos activos para este número de teléfono
        const pedidosActivos = await pedidosService.buscarPedidosPorTelefono(remitente);
        
        if (pedidosActivos && pedidosActivos.length > 0) {
            // Obtener el pedido más reciente (asumimos que es el que están respondiendo)
            const pedidoReciente = pedidosActivos[0];
            
            // Procesar comandos numéricos
            if (contenido === '1') {
                // Confirmación de recepción - cambia estado a "en_proceso"
                const actualizado = await pedidosService.actualizarEstadoPedido(
                    pedidoReciente.id, 
                    'en_proceso', 
                    'Confirmado por proveedor vía WhatsApp'
                );
                
                if (actualizado) {
                    // Enviar confirmación al proveedor
                    await enviarMensaje(
                        remitente,
                        `✅ Gracias por confirmar la recepción del pedido ${pedidoReciente.codigo}. El estado ha sido actualizado a "En Proceso".`
                    );
                    
                    console.log(`Pedido ${pedidoReciente.id} actualizado a "en_proceso" por respuesta WhatsApp`);
                }
            } else if (contenido === '2') {
                // Solicitud de información adicional
                try {
                    // Obtener datos detallados del pedido
                    const detalleCompleto = await pedidosService.obtenerPedidoPorId(pedidoReciente.id);
                    
                    // Verificar que tenemos los datos del pedido
                    if (!detalleCompleto) {
                        // Si no se pudo obtener el detalle completo, enviar un mensaje más simple con los datos que ya tenemos
                        await enviarMensaje(
                            remitente,
                            `📋 *DETALLES DEL PEDIDO ${pedidoReciente.codigo}*\n\n` +
                            `Lamentamos no poder mostrar todos los detalles en este momento. ` +
                            `Por favor, contacte con nosotros al +573103904286 para más información.\n\n` +
                            `Estado actual: ${formatearEstado(pedidoReciente.estado)}\n` +
                            `Fecha pedido: ${new Date(pedidoReciente.fecha_pedido).toLocaleDateString('es-CO')}`
                        );
                        
                        console.log(`Enviada información básica para pedido ${pedidoReciente.id} al proveedor (no se pudo obtener detalle completo)`);
                        return;
                    }
                    
                    // Construir información del proveedor, usando los datos del pedido reciente si los del detalle completo no están disponibles
                    const proveedor = {
                        nombre: detalleCompleto.nombre_proveedor || "Proveedor",
                        telefono: detalleCompleto.telefono_proveedor || remitente
                    };
                    
                    // Crear un mensaje detallado con toda la información relevante
                    let mensaje = `📋 *DETALLES COMPLETOS DEL PEDIDO ${pedidoReciente.codigo}*\n\n`;
                    
                    // Información general
                    mensaje += `📆 *Fecha de emisión:* ${new Date(pedidoReciente.fecha_pedido).toLocaleDateString('es-CO')}\n`;
                    mensaje += `⏳ *Estado actual:* ${formatearEstado(pedidoReciente.estado)}\n`;
                    
                    // Solo incluir la prioridad si existe
                    if (pedidoReciente.prioridad) {
                        mensaje += `🔖 *Prioridad:* ${formatearPrioridad(pedidoReciente.prioridad)}\n`;
                    }
                    
                    // Fechas importantes
                    if (pedidoReciente.fecha_entrega_estimada) {
                        mensaje += `📅 *Fecha entrega estimada:* ${new Date(pedidoReciente.fecha_entrega_estimada).toLocaleDateString('es-CO')}\n`;
                    }
                    
                    // Información de contacto
                    if (pedidoReciente.persona_contacto) {
                        mensaje += `👤 *Persona de contacto:* ${pedidoReciente.persona_contacto}\n`;
                    }
                    
                    // Dirección de entrega
                    if (pedidoReciente.direccion_entrega) {
                        mensaje += `🏠 *Dirección de entrega:* ${pedidoReciente.direccion_entrega}\n`;
                    }
                    
                    // Condiciones comerciales
                    if (pedidoReciente.condiciones_pago) {
                        mensaje += `💰 *Condiciones de pago:* ${pedidoReciente.condiciones_pago}\n`;
                    }
                    
                    if (pedidoReciente.metodo_envio) {
                        mensaje += `🚚 *Método de envío:* ${pedidoReciente.metodo_envio}\n`;
                    }
                    
                    // Lista detallada de productos
                    mensaje += `\n📦 *LISTA DE PRODUCTOS SOLICITADOS:*\n`;
                    if (detalleCompleto.detalles && detalleCompleto.detalles.length > 0) {
                        detalleCompleto.detalles.forEach((item, index) => {
                            // Primero intentamos usar el nombre del producto si existe
                            const nombreProducto = item.producto_nombre || 
                                                  item.nombre || 
                                                  item.descripcion || 
                                                  `Producto: ${item.producto_codigo || 'N/A'}`;
                            
                            mensaje += `${index + 1}. *${nombreProducto}*\n`;
                            mensaje += `   - Cantidad: ${item.cantidad}\n`;
                            mensaje += `   - Código: ${item.producto_codigo || 'N/A'}\n`;
                        });
                    } else {
                        mensaje += "No hay productos detallados disponibles\n";
                    }
                    
                    // Notas adicionales
                    if (pedidoReciente.notas || pedidoReciente.notas_adicionales) {
                        mensaje += `\n📝 *NOTAS:*\n`;
                        if (pedidoReciente.notas) mensaje += `${pedidoReciente.notas}\n`;
                        if (pedidoReciente.notas_adicionales) mensaje += `${pedidoReciente.notas_adicionales}\n`;
                    }
                    
                    // Información de contacto y próximos pasos
                    mensaje += `\n📞 *CONTACTO PARA CONSULTAS:*\n`;
                    mensaje += `- Teléfono: +573103904286\n`;
                    
                    // Si existe un usuario asignado al pedido, obtener información del usuario
                    if (pedidoReciente.usuario_id) {
                        try {
                            // Buscar datos del usuario en la base de datos directamente
                            const db = require('../utils/db');
                            const [usuarios] = await db.query(
                                `SELECT username, email, nombre_completo, rol FROM usuarios WHERE id = ?`,
                                [pedidoReciente.usuario_id]
                            );
                            
                            if (usuarios && usuarios.length > 0) {
                                const usuario = usuarios[0];
                                mensaje += `- Responsable: ${usuario.nombre_completo || usuario.username}\n`;
                                if (usuario.email) mensaje += `- Email: ${usuario.email}\n`;
                            }
                        } catch (error) {
                            console.error('Error al obtener datos del usuario:', error);
                        }
                    }
                    
                    // Opciones de respuesta
                    mensaje += `\n*OPCIONES DISPONIBLES:*\n`;
                    mensaje += `- Envíe *1* para confirmar recepción del pedido\n`;
                    mensaje += `- Envíe *3* para reportar un problema con este pedido\n`;
                    mensaje += `- Envíe *CHAT* para iniciar una conversación directa con nosotros\n`;
                    mensaje += `- Envíe *HELP* para ver este menú de ayuda\n\n`;
                    
                    mensaje += `Gracias por su colaboración.`;
                    
                    await enviarMensaje(remitente, mensaje);
                    console.log(`Enviada información detallada para pedido ${pedidoReciente.id} al proveedor`);
                    
                    // Registrar en el historial que el proveedor solicitó más detalles
                    try {
                        await registrarSeguimientoPedido(
                            pedidoReciente.id,
                            pedidoReciente.estado,
                            'Proveedor solicitó más detalles vía WhatsApp',
                            'whatsapp'
                        );
                    } catch (error) {
                        console.error('Error al registrar seguimiento:', error);
                    }
                } catch (error) {
                    console.error('Error al procesar solicitud de detalles del pedido:', error);
                    
                    // En caso de error, enviar un mensaje simplificado
                    await enviarMensaje(
                        remitente,
                        `Lo sentimos, ha ocurrido un error al procesar su solicitud de detalles para el pedido ${pedidoReciente.codigo}.\n\n` +
                        `Por favor, intente nuevamente más tarde o contacte con nosotros directamente al +573103904286.`
                    );
                }
            } else if (contenido === '3') {
                // Reportar problema - Iniciar modo de chat interactivo
                await enviarMensaje(
                    remitente,
                    `⚠️ *REPORTE DE PROBLEMAS - PEDIDO ${pedidoReciente.codigo}*\n\n` +
                    `Por favor, describa el problema que está experimentando con este pedido. Sea lo más detallado posible. ` +
                    `Su mensaje será enviado directamente a nuestro equipo.\n\n` +
                    `🔴 *Estamos en modo chat*. Todos sus próximos mensajes serán recibidos por nuestro equipo hasta que escriba *FIN* para terminar la conversación.`
                );
                
                // Activar modo chat para este número y pedido
                await activarModoChat(remitente, pedidoReciente.id);
                
                console.log(`Activado modo chat para el pedido ${pedidoReciente.id} con el proveedor ${remitente}`);
                
                // Notificar internamente sobre el inicio de un chat por problema
                await notificarInternamente(
                    `🚨 *ALERTA*: El proveedor ha reportado un problema con el pedido ${pedidoReciente.codigo} ` +
                    `y ha iniciado un chat. Por favor revise el panel de WhatsApp.`
                );
                
            } else if (contenido.toUpperCase() === 'CHAT') {
                // Iniciar chat sin reportar problema
                await enviarMensaje(
                    remitente,
                    `💬 *CHAT INICIADO - PEDIDO ${pedidoReciente.codigo}*\n\n` +
                    `Ha iniciado un modo de chat con nuestro equipo de soporte. ` +
                    `Todos sus mensajes serán recibidos hasta que escriba *FIN* para terminar la conversación.\n\n` +
                    `Por favor, describa su consulta o comentario:`
                );
                
                // Activar modo chat para este número y pedido
                await activarModoChat(remitente, pedidoReciente.id);
                
            } else if (contenido.toUpperCase() === 'FIN') {
                // Finalizar modo chat si está activo
                const chatActivo = await verificarChatActivo(remitente);
                
                if (chatActivo) {
                    await desactivarModoChat(remitente);
                    
                    await enviarMensaje(
                        remitente,
                        `✅ *CHAT FINALIZADO*\n\n` +
                        `La conversación ha finalizado. Gracias por contactarnos.\n\n` +
                        `Si necesita más información sobre el pedido ${pedidoReciente.codigo}, ` +
                        `puede enviar *2* para ver los detalles o *HELP* para ver todas las opciones disponibles.`
                    );
                    
                    console.log(`Chat finalizado para el proveedor ${remitente}`);
                } else {
                    // No hay chat activo
                    await enviarMensaje(
                        remitente,
                        `No hay ninguna conversación activa para finalizar. ` +
                        `Envíe *HELP* para ver las opciones disponibles.`
                    );
                }
                
            } else if (contenido.toUpperCase() === 'HELP' || contenido.toUpperCase() === 'AYUDA') {
                // Enviar menú de ayuda
                await enviarMensaje(
                    remitente,
                    `🔍 *OPCIONES DISPONIBLES - PEDIDO ${pedidoReciente.codigo}*\n\n` +
                    `- Envíe *1* para confirmar recepción del pedido\n` +
                    `- Envíe *2* para solicitar detalles completos del pedido\n` +
                    `- Envíe *3* para reportar un problema\n` +
                    `- Envíe *CHAT* para iniciar una conversación con nuestro equipo\n` +
                    `- Envíe *FIN* para terminar una conversación activa\n` +
                    `- Envíe *HELP* para ver este menú\n\n` +
                    `Si tiene dudas adicionales, puede contactarnos al +573103904286`
                );
                
            } else {
                // Verificar si hay un chat activo para este número
                const chatActivo = await verificarChatActivo(remitente);
                
                if (chatActivo) {
                    // Estamos en modo chat, reenviamos el mensaje a los administradores
                    await procesarMensajeChat(remitente, pedidoReciente.id, contenido);
                } else {
                    // Mensaje no reconocido, enviar ayuda
                    await enviarMensaje(
                        remitente,
                        `👋 Hola! Para interactuar con el sistema de pedidos, use estas opciones:\n\n` +
                        `1️⃣ Confirmar recepción del pedido\n` +
                        `2️⃣ Solicitar detalles del pedido\n` +
                        `3️⃣ Reportar un problema\n\n` +
                        `También puede enviar *HELP* para ver todas las opciones disponibles.`
                    );
                    console.log(`Enviadas instrucciones de uso al proveedor (${remitente})`);
                }
            }
        } else {
            console.log(`No hay pedidos activos para el proveedor con número: ${remitente}`);
        }
    } catch (error) {
        console.error('Error al procesar mensaje entrante:', error);
    }
};

/**
 * Formatea el estado del pedido para mostrar al proveedor
 */
const formatearEstado = (estado) => {
    switch(estado) {
        case 'pendiente': return 'Pendiente';
        case 'en_proceso': return 'En Proceso';
        case 'completado': return 'Completado';
        case 'cancelado': return 'Cancelado';
        default: return estado;
    }
};

/**
 * Formatea la prioridad del pedido para mostrar al proveedor
 */
const formatearPrioridad = (prioridad) => {
    switch(prioridad) {
        case 'baja': return 'Baja';
        case 'media': return 'Media';
        case 'alta': return 'Alta';
        case 'urgente': return 'Urgente';
        default: return prioridad;
    }
};

// Almacenamiento temporal de chats activos
// Map: { número_teléfono => { pedidoId, fechaInicio, ultimoMensaje } }
const chatsActivos = new Map();

/**
 * Activa el modo chat para un proveedor y pedido específico
 * @param {string} telefono - Número del proveedor
 * @param {number} pedidoId - ID del pedido asociado
 */
const activarModoChat = async (telefono, pedidoId) => {
    try {
        chatsActivos.set(telefono, {
            pedidoId: pedidoId,
            fechaInicio: new Date(),
            ultimoMensaje: new Date()
        });
        
        // Registrar en la base de datos el inicio del chat (si aplicable)
        if (pedidosService) {
            await pedidosService.registrarIncidenciaPedido(
                pedidoId,
                'Proveedor inició un chat por WhatsApp'
            );
        }
        
        // Notificar al frontend sobre el nuevo chat
        if (global.io) {
            global.io.emit('whatsapp_chat_activado', {
                telefono: telefono,
                pedidoId: pedidoId,
                timestamp: new Date()
            });
        }
        
        console.log(`Chat activado para teléfono ${telefono}, pedido ID ${pedidoId}`);
        return true;
    } catch (error) {
        console.error('Error al activar modo chat:', error);
        return false;
    }
};

/**
 * Verifica si hay un chat activo para un proveedor
 * @param {string} telefono - Número del proveedor
 * @returns {boolean} - True si hay un chat activo, false en caso contrario
 */
const verificarChatActivo = async (telefono) => {
    return chatsActivos.has(telefono);
};

/**
 * Desactiva el modo chat para un proveedor
 * @param {string} telefono - Número del proveedor
 */
const desactivarModoChat = async (telefono) => {
    try {
        if (chatsActivos.has(telefono)) {
            const chatInfo = chatsActivos.get(telefono);
            
            // Registrar en la base de datos el fin del chat
            if (pedidosService) {
                await pedidosService.registrarIncidenciaPedido(
                    chatInfo.pedidoId,
                    'Proveedor finalizó chat por WhatsApp'
                );
                
                // Notificar al frontend que el chat ha finalizado
                if (global.io) {
                    global.io.emit('whatsapp_chat_finalizado', {
                        telefono: telefono,
                        pedidoId: chatInfo.pedidoId,
                        timestamp: new Date()
                    });
                }
            }
            
            // Eliminar el chat activo
            chatsActivos.delete(telefono);
            
            console.log(`Chat desactivado para teléfono ${telefono}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al desactivar modo chat:', error);
        return false;
    }
};

/**
 * Procesa un mensaje recibido durante un chat activo
 * @param {string} telefono - Número del proveedor
 * @param {number} pedidoId - ID del pedido asociado
 * @param {string} mensaje - Contenido del mensaje
 */
const procesarMensajeChat = async (telefono, pedidoId, mensaje) => {
    try {
        // Actualizar timestamp del último mensaje
        if (chatsActivos.has(telefono)) {
            const chatInfo = chatsActivos.get(telefono);
            chatInfo.ultimoMensaje = new Date();
            chatsActivos.set(telefono, chatInfo);
        }
        
        // Guardar mensaje en BD para historial del pedido
        let mensajeRegistrado = null;
        if (pedidosService) {
            try {
                mensajeRegistrado = await pedidosService.registrarMensajeChat(
                    pedidoId,
                    telefono,
                    mensaje,
                    'proveedor'
                );
            } catch (error) {
                console.error('Error al registrar mensaje en BD:', error);
                // Si no podemos registrar en BD, continuamos de todas formas
            }
        }
        
        // Buscar información del proveedor y pedido para contexto
        let pedido = null;
        let proveedor = null;
        
        try {
            pedido = await pedidosService.obtenerPedido(pedidoId);
            proveedor = await pedidosService.obtenerProveedor(pedido.proveedor_id);
        } catch (error) {
            console.error('Error al obtener información de pedido/proveedor:', error);
            // Seguimos aunque no tengamos toda la info
        }
        
        // Construir objeto de mensaje para enviarlo al frontend
        const mensajeObj = {
            id: mensajeRegistrado ? mensajeRegistrado.id : Date.now(),
            telefono: telefono,
            pedidoId: pedidoId,
            codigoPedido: pedido ? pedido.codigo : pedidoId,
            mensaje: mensaje,
            tipo: 'proveedor',
            remitente: proveedor ? proveedor.nombre : 'Proveedor',
            timestamp: new Date(),
            leido: false
        };
        
        // Emitir evento de nuevo mensaje para el frontend
        if (global.io) {
            global.io.emit('mensaje_chat_whatsapp', mensajeObj);
        }
        
        // Notificar internamente (a administradores o usuarios asignados)
        const mensajeInterno = `💬 *Mensaje WhatsApp de Proveedor*\n\n` +
            `*De:* ${proveedor ? proveedor.nombre : 'Proveedor'}\n` +
            `*Pedido:* ${pedido ? pedido.codigo : pedidoId}\n` +
            `*Mensaje:* ${mensaje}\n\n` +
            `Para responder, use el panel de WhatsApp en la sección de pedidos.`;
            
        await notificarInternamente(mensajeInterno, pedidoId);
        
        // Ya no enviamos mensaje de confirmación automático para mantener la conversación fluida
        
        console.log(`Mensaje de chat procesado para pedido ${pedidoId}, teléfono ${telefono}`);
        return true;
    } catch (error) {
        console.error('Error al procesar mensaje de chat:', error);
        return false;
    }
};

/**
 * Registra un seguimiento en el historial del pedido
 * @param {number} pedidoId - ID del pedido 
 * @param {string} estado - Estado actual del pedido
 * @param {string} comentario - Descripción del seguimiento
 * @param {string} tipo - Tipo de seguimiento (whatsapp, chat_whatsapp, etc.)
 * @returns {boolean} - True si el registro fue exitoso
 */
const registrarSeguimientoPedido = async (pedidoId, estado, comentario, tipo = 'whatsapp') => {
    try {
        // Si no tenemos el estado, lo obtenemos del pedido actual
        let estadoActual = estado;
        
        if (!estadoActual) {
            try {
                // Intentar obtener el estado actual del pedido
                const pedido = await pedidosService.obtenerPedidoPorId(pedidoId);
                if (pedido) {
                    estadoActual = pedido.estado;
                } else {
                    console.error(`No se pudo obtener el pedido con ID: ${pedidoId}`);
                    return false;
                }
            } catch (error) {
                console.error(`Error al obtener pedido para seguimiento:`, error);
                return false;
            }
        }
        
        // Registrar el seguimiento utilizando la función del servicio de pedidos
        await pedidosService.registrarIncidenciaPedido(pedidoId, comentario);
        
        console.log(`Seguimiento registrado para pedido ${pedidoId}: ${comentario}`);
        return true;
    } catch (error) {
        console.error('Error al registrar seguimiento:', error);
        return false;
    }
};

/**
 * Obtiene todos los chats activos
 * @returns {Map} - Map con todos los chats activos
 */
const getChatsActivos = () => {
    return chatsActivos;
};

/**
 * Obtiene información específica de un chat
 * @param {string} telefono - Número del proveedor
 * @returns {Object|null} - Información del chat o null si no existe
 */
const getInfoChat = (telefono) => {
    if (chatsActivos.has(telefono)) {
        return chatsActivos.get(telefono);
    }
    return null;
};

/**
 * Envía una notificación interna al equipo (vía WebSocket, correo, etc.)
 * @param {string} mensaje - Contenido de la notificación
 * @param {number} pedidoId - ID del pedido asociado (opcional)
 */
const notificarInternamente = async (mensaje, pedidoId = null) => {
    // Esta función podría implementarse según las necesidades específicas:
    // - Enviar un correo electrónico al equipo de soporte
    // - Crear una notificación en el sistema
    // - Enviar una alerta por WebSockets a los usuarios conectados
    // - Enviar un SMS a algún número específico
    
    console.log(`Notificación interna: ${mensaje}${pedidoId ? ` (Pedido ID: ${pedidoId})` : ''}`);
    
    try {
        // Emitir evento en tiempo real si está disponible el servicio de notificaciones
        if (global.io) {
            global.io.emit('notificacion_whatsapp', {
                mensaje: mensaje,
                pedidoId: pedidoId,
                timestamp: new Date()
            });
        }
        
        // También podríamos enviar un correo electrónico automático
        // Esto requeriría un servicio de email configurado
        
        return true;
    } catch (error) {
        console.error('Error al enviar notificación interna:', error);
        return false;
    }
};

/**
 * Envía una respuesta desde el sistema al proveedor
 * @param {string} telefono - Número del proveedor
 * @param {number} pedidoId - ID del pedido asociado
 * @param {string} mensaje - Contenido del mensaje a enviar
 * @param {string} usuarioId - ID del usuario que envía la respuesta
 */
const responderAlProveedor = async (telefono, pedidoId, mensaje, usuarioId) => {
    try {
        // Registrar el mensaje en la BD
        if (pedidosService) {
            await pedidosService.registrarMensajeChat(
                pedidoId,
                telefono,
                mensaje,
                'sistema',
                usuarioId
            );
        }
        
        // Enviar respuesta al proveedor
        const resultado = await enviarMensaje(telefono, mensaje);
        
        if (resultado) {
            console.log(`Respuesta enviada al proveedor (teléfono: ${telefono}, pedido: ${pedidoId})`);
            return true;
        } else {
            throw new Error('No se pudo enviar el mensaje al proveedor');
        }
    } catch (error) {
        console.error('Error al responder al proveedor:', error);
        return false;
    }
};

module.exports = {
    initializeWhatsApp,
    getStatus,
    restartConnection,
    getQrCode,
    enviarMensaje,
    notificarNuevoPedido,
    notificarPedidoRecibido,
    procesarMensajeEntrante,
    activarModoChat,
    verificarChatActivo,
    desactivarModoChat,
    procesarMensajeChat,
    notificarInternamente,
    responderAlProveedor,
    getChatsActivos,
    getInfoChat,
    registrarSeguimientoPedido
};