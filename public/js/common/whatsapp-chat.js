/**
 * Módulo para manejar la funcionalidad de chat con proveedores vía WhatsApp
 * Versión global - disponible en todos los módulos de la aplicación
 */

const WhatsAppChat = (() => {
    // Estado de la aplicación
    let state = {
        chatsActivos: [],
        chatActual: null,
        pedidoActual: null,
        proveedorActual: null,
        mensajes: [],
        chatAbierto: false,
        chatMinimizado: false,
        intervalChecker: null,
        ultimoMensajeId: 0,
        socket: null,
        notificacionesNoLeidas: 0,
        totalMensajesNoLeidos: 0
    };

    // Elementos DOM
    const elements = {
        chatContainer: null,
        chatList: null,
        chatMessages: null,
        messageInput: null,
        sendButton: null,
        closeButton: null
    };

    /**
     * Inicializa el componente de chat
     */
    const initialize = () => {
        // Crear el contenedor principal de chat si no existe
        if (!document.getElementById('whatsapp-chat-container')) {
            createChatInterface();
        }

        // Capturar elementos DOM
        elements.chatContainer = document.getElementById('whatsapp-chat-container');
        elements.chatList = document.getElementById('whatsapp-chat-list');
        elements.chatMessages = document.getElementById('whatsapp-chat-messages');
        elements.messageInput = document.getElementById('whatsapp-message-input');
        elements.sendButton = document.getElementById('whatsapp-send-button');
        elements.closeButton = document.getElementById('whatsapp-close-button');

        // Configurar eventos
        setupEventListeners();

        // Iniciar verificación periódica de chats activos
        startChatChecker();

        // Inicializar Socket.IO
        initializeSocket();

        // Añadir sonido de notificación si no existe
        if (!document.getElementById('notification-sound')) {
            const audio = document.createElement('audio');
            audio.id = 'notification-sound';
            audio.src = '/sounds/notification.mp3';
            audio.preload = 'auto';
            document.body.appendChild(audio);
        }
        
        // Iniciar el chat minimizado
        if (elements.chatContainer) {
            minimizeChat();
            state.chatAbierto = false; // Comenzamos con chat oculto
        }

        console.log('WhatsApp Chat Module initialized (Global Version)');
    };

    /**
     * Inicializa la conexión Socket.IO
     */
    const initializeSocket = () => {
        try {
            // Inicializar Socket.IO
            state.socket = io();

            // Eventos de conexión
            state.socket.on('connect', () => {
                console.log('Conectado a WebSocket para WhatsApp Chat');
            });

            state.socket.on('disconnect', () => {
                console.log('Desconectado de WebSocket para WhatsApp Chat');
            });

            // Eventos específicos de WhatsApp
            state.socket.on('whatsapp_chat_activado', (data) => {
                console.log('Notificación de chat activado recibida:', data);
                
                // Reproducir sonido
                playNotificationSound();
                
                // Mostrar notificación
                showToastNotification('Nuevo chat de WhatsApp', `Un proveedor ha iniciado un chat para el pedido #${data.pedidoId}`, 'info');
                
                // Actualizar lista de chats
                checkActiveChats();
            });

            state.socket.on('mensaje_chat_whatsapp', (data) => {
                console.log('Mensaje de chat recibido:', data);
                
                // Reproducir sonido
                playNotificationSound();
                
                // Si el chat está abierto y es el mismo que estamos viendo, agregar el mensaje
                if (state.chatAbierto && state.chatActual && state.chatActual.telefono === data.telefono) {
                    // Añadir mensaje a la interfaz
                    addMessageToUI(data);
                    
                    // Marcar como leído
                    markMessagesAsRead(state.chatActual.pedidoId);
                } else {
                    // Mostrar notificación
                    showToastNotification('Nuevo mensaje de WhatsApp', `${data.remitente}: ${truncateMessage(data.mensaje)}`, 'info', () => {
                        // Al hacer clic, abrir el chat correspondiente
                        loadChatByTelefonoAndPedido(data.telefono, data.pedidoId);
                    });
                    
                    // Incrementar contador de notificaciones no leídas
                    state.notificacionesNoLeidas++;
                    updateNotificationBadge();
                }
                
                // Actualizar la lista de chats
                checkActiveChats();
            });

            state.socket.on('whatsapp_chat_finalizado', (data) => {
                console.log('Chat finalizado:', data);
                
                // Mostrar notificación
                showToastNotification('Chat finalizado', `El chat del pedido #${data.pedidoId} ha finalizado`, 'warning');
                
                // Si es el chat actual, cerrar la ventana
                if (state.chatActual && state.chatActual.telefono === data.telefono) {
                    state.chatActual = null;
                    hideChat();
                }
                
                // Actualizar lista de chats
                checkActiveChats();
            });

            // Manejar errores de Socket.IO
            state.socket.on('connect_error', (error) => {
                console.error('Error de conexión WebSocket:', error);
            });

            state.socket.on('error', (error) => {
                console.error('Error de WebSocket:', error);
                showToastNotification('Error', error.message || 'Error de comunicación', 'error');
            });

        } catch (error) {
            console.error('Error al inicializar Socket.IO:', error);
        }
    };

    /**
     * Crea la interfaz de usuario del chat
     */
    const createChatInterface = () => {
        const chatHTML = `
            <div id="whatsapp-chat-container" class="chat-container">
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <h3>Chats con Proveedores</h3>
                    </div>
                    <div id="whatsapp-chat-list" class="chat-list">
                        <!-- Los chats activos se mostrarán aquí -->
                        <div class="no-chats-message">No hay chats activos</div>
                    </div>
                </div>
                <div class="chat-main">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h4 id="whatsapp-chat-title">Chat con Proveedor</h4>
                            <p id="whatsapp-chat-subtitle">Pedido: N/A</p>
                        </div>
                        <div class="chat-header-actions">
                            <button id="whatsapp-minimize-button" class="chat-minimize-btn">
                                <i class="fas fa-minus"></i>
                            </button>
                            <button id="whatsapp-maximize-button" class="chat-maximize-btn">
                                <i class="fas fa-expand"></i>
                            </button>
                            <div id="whatsapp-notification-badge" class="chat-notification-badge">0</div>
                            <button id="whatsapp-close-button" class="chat-close-btn">×</button>
                        </div>
                    </div>
                    <div id="whatsapp-chat-messages" class="chat-messages">
                        <!-- Los mensajes se mostrarán aquí -->
                        <div class="chat-welcome-message">
                            <p>Seleccione un chat de la lista para ver los mensajes</p>
                        </div>
                    </div>
                    <div class="chat-input-container">
                        <textarea id="whatsapp-message-input" placeholder="Escriba un mensaje..."></textarea>
                        <button id="whatsapp-send-button" class="chat-send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Añadir estilos CSS
        const styles = `
            <style>
                .chat-container {
                    display: none;
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 800px;
                    height: 500px;
                    background-color: #f5f5f5;
                    border-radius: 10px;
                    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    overflow: hidden;
                    display: flex;
                }
                
                .chat-container.active {
                    display: flex;
                }
                
                .chat-container.minimized {
                    height: 50px;
                    overflow: hidden;
                }
                
                .chat-sidebar {
                    width: 250px;
                    background-color: #f0f0f0;
                    border-right: 1px solid #ddd;
                    display: flex;
                    flex-direction: column;
                }
                
                .chat-sidebar-header {
                    padding: 15px;
                    background-color: #25D366;
                    color: white;
                }
                
                .chat-list {
                    flex: 1;
                    overflow-y: auto;
                }
                
                .chat-list-item {
                    padding: 10px 15px;
                    border-bottom: 1px solid #ddd;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .chat-list-item:hover {
                    background-color: #e9e9e9;
                }
                
                .chat-list-item.active {
                    background-color: #e1f5fe;
                    border-left: 4px solid #0091ea;
                }
                
                .chat-list-item .chat-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .chat-list-item .chat-preview {
                    font-size: 0.8em;
                    color: #666;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .chat-list-item .unread-badge {
                    display: inline-block;
                    background-color: #25D366;
                    color: white;
                    border-radius: 50%;
                    min-width: 20px;
                    height: 20px;
                    text-align: center;
                    line-height: 20px;
                    font-size: 0.8em;
                    margin-left: 5px;
                }
                
                .chat-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .chat-header {
                    padding: 15px;
                    background-color: #075E54;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chat-header-info {
                    flex: 1;
                }
                
                .chat-header-actions {
                    display: flex;
                    align-items: center;
                }
                
                .chat-minimize-btn, .chat-maximize-btn, .chat-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                
                .chat-notification-badge {
                    display: none;
                    background-color: #FF5252;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 10px;
                }
                
                .chat-notification-badge.active {
                    display: flex;
                }
                
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    background-color: #e5ddd5;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23d0d0d0' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                }
                
                .message {
                    margin-bottom: 10px;
                    padding: 8px 12px;
                    border-radius: 7px;
                    max-width: 80%;
                    word-wrap: break-word;
                }
                
                .message.outgoing {
                    background-color: #dcf8c6;
                    margin-left: auto;
                    border-top-right-radius: 0;
                }
                
                .message.incoming {
                    background-color: white;
                    margin-right: auto;
                    border-top-left-radius: 0;
                }
                
                .message .sender {
                    font-weight: bold;
                    font-size: 0.8em;
                    margin-bottom: 3px;
                }
                
                .message .time {
                    font-size: 0.7em;
                    color: #888;
                    text-align: right;
                    margin-top: 2px;
                }
                
                .chat-input-container {
                    display: flex;
                    padding: 10px;
                    background-color: #f5f5f5;
                    align-items: center;
                }
                
                .chat-input-container textarea {
                    flex: 1;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    padding: 10px 15px;
                    resize: none;
                    height: 40px;
                    line-height: 20px;
                    font-family: inherit;
                }
                
                .chat-send-btn {
                    border: none;
                    background-color: #25D366;
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin-left: 10px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .chat-welcome-message, .no-chats-message {
                    text-align: center;
                    color: #888;
                    padding: 20px;
                }
                
                .pedido-info {
                    background-color: #f8f9fa;
                    padding: 10px;
                    margin-bottom: 10px;
                    border-radius: 5px;
                    border-left: 4px solid #17a2b8;
                }
            </style>
        `;

        // Añadir al DOM
        const div = document.createElement('div');
        div.innerHTML = chatHTML + styles;
        document.body.appendChild(div);
    };

    /**
     * Configura los listeners de eventos
     */
    const setupEventListeners = () => {
        // Enviar mensaje al hacer clic en el botón
        elements.sendButton.addEventListener('click', sendMessage);

        // Enviar mensaje al presionar Enter (sin shift)
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Cerrar chat
        elements.closeButton.addEventListener('click', hideChat);

        // Minimizar chat
        const minimizeButton = document.getElementById('whatsapp-minimize-button');
        if (minimizeButton) {
            minimizeButton.addEventListener('click', minimizeChat);
        }

        // Maximizar chat
        const maximizeButton = document.getElementById('whatsapp-maximize-button');
        if (maximizeButton) {
            maximizeButton.addEventListener('click', maximizeChat);
        }

        // Alternar al hacer clic en la cabecera cuando está minimizado
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatHeader.addEventListener('click', function(e) {
                // Solo procesar clics directos en el header, no en sus botones
                if (e.target === this || e.target.closest('.chat-header-info')) {
                    if (state.chatMinimizado) {
                        maximizeChat();
                    }
                }
            });
        }
    };

    /**
     * Inicia la verificación periódica de chats activos
     */
    const startChatChecker = () => {
        // Verificar chats activos inmediatamente
        checkActiveChats();

        // Configurar intervalo para verificar periódicamente
        state.intervalChecker = setInterval(checkActiveChats, 30000); // Cada 30 segundos
    };

    /**
     * Detiene la verificación periódica de chats
     */
    const stopChatChecker = () => {
        if (state.intervalChecker) {
            clearInterval(state.intervalChecker);
            state.intervalChecker = null;
        }
    };

    /**
     * Consulta los chats activos desde el servidor
     */
    const checkActiveChats = async () => {
        try {
            const response = await fetch('/api/whatsapp/chats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    updateChatsList(data.data.chats || []);
                    
                    // Si hay un chat activo, actualizar los mensajes
                    if (state.chatActual) {
                        loadChatMessages(state.chatActual.pedidoId, state.chatActual.telefono);
                    }
                    
                    // Notificar si hay nuevos mensajes y el chat no está abierto
                    notifyNewMessages(data.data.chats || []);
                    
                    // Actualizar contador global en sidebar
                    updateGlobalNotificationBadge(data.data.chats || []);
                } else {
                    console.error('Formato de respuesta incorrecto:', data);
                }
            } else {
                console.error('Error al obtener chats activos:', await response.text());
            }
        } catch (error) {
            console.error('Error al verificar chats activos:', error);
        }
    };

    /**
     * Actualiza la lista de chats en la interfaz
     */
    const updateChatsList = (chats) => {
        state.chatsActivos = chats;

        // Limpiar lista actual
        elements.chatList.innerHTML = '';

        if (chats.length === 0) {
            elements.chatList.innerHTML = '<div class="no-chats-message">No hay chats activos</div>';
            return;
        }

        // Añadir cada chat a la lista
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-list-item';
            
            if (state.chatActual && chat.telefono === state.chatActual.telefono) {
                chatItem.classList.add('active');
            }
            
            // Formatear fecha
            const fecha = new Date(chat.ultimoMensaje);
            const horaFormateada = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            
            let badgeHTML = '';
            if (chat.mensajes_no_leidos > 0) {
                badgeHTML = `<span class="unread-badge">${chat.mensajes_no_leidos}</span>`;
            }
            
            chatItem.innerHTML = `
                <div class="chat-name">${chat.proveedorNombre} ${badgeHTML}</div>
                <div class="chat-preview">Pedido: ${chat.pedidoCodigo} • ${horaFormateada}</div>
            `;
            
            chatItem.addEventListener('click', () => {
                // Seleccionar este chat
                selectChat(chat);
            });
            
            elements.chatList.appendChild(chatItem);
        });
    };

    /**
     * Actualiza el contador de notificaciones globales en el sidebar
     */
    const updateGlobalNotificationBadge = (chats) => {
        // Contar total de mensajes no leídos
        const totalNoLeidos = chats.reduce((total, chat) => total + (chat.mensajes_no_leidos || 0), 0);
        state.totalMensajesNoLeidos = totalNoLeidos;
        
        // Actualizar badge en sidebar si existe la función global
        if (typeof window.updateWhatsAppChatBadge === 'function') {
            window.updateWhatsAppChatBadge(totalNoLeidos);
        }
        
        // Actualizar título de la página para mostrar conteo
        if (totalNoLeidos > 0) {
            const originalTitle = document.title.replace(/^\(\d+\)\s/, '');
            document.title = `(${totalNoLeidos}) ${originalTitle}`;
        } else {
            document.title = document.title.replace(/^\(\d+\)\s/, '');
        }
    };

    /**
     * Selecciona un chat específico para mostrar
     */
    const selectChat = async (chat) => {
        // Actualizar estado
        state.chatActual = chat;
        
        // Actualizar UI
        document.querySelectorAll('.chat-list-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Encontrar y seleccionar el elemento en la lista
        const chatItems = document.querySelectorAll('.chat-list-item');
        for (const item of chatItems) {
            if (item.querySelector('.chat-preview').textContent.includes(chat.pedidoCodigo)) {
                item.classList.add('active');
                break;
            }
        }
        
        // Actualizar encabezado del chat
        document.getElementById('whatsapp-chat-title').textContent = `Chat con ${chat.proveedorNombre}`;
        document.getElementById('whatsapp-chat-subtitle').textContent = `Pedido: ${chat.pedidoCodigo}`;
        
        // Cargar mensajes
        await loadChatMessages(chat.pedidoId, chat.telefono);
        
        // Mostrar el chat si no está visible
        showChat();
    };

    /**
     * Carga los mensajes de un chat específico
     */
    const loadChatMessages = async (pedidoId, telefono) => {
        try {
            console.log(`Cargando mensajes para pedido: ${pedidoId}, teléfono: ${telefono}`);
            const response = await fetch(`/api/whatsapp/chats/${pedidoId}/${telefono}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Respuesta de API de mensajes:', data);
                
                if (!data.success) {
                    console.error('Error en la respuesta de la API:', data.message);
                    return;
                }
                
                // Guardar datos en el estado
                state.mensajes = data.data?.mensajes || [];
                state.pedidoActual = data.data?.pedido || null;
                state.proveedorActual = data.data?.proveedor || null;
                
                // Actualizar UI con los mensajes
                renderMessages(data.data);
                
                // Marcar como leído
                markMessagesAsRead(pedidoId);
            } else {
                const errorText = await response.text();
                console.error('Error al cargar mensajes:', errorText);
                showToastNotification('Error', 'No se pudieron cargar los mensajes del chat', 'error');
            }
        } catch (error) {
            console.error('Error al cargar mensajes:', error);
            showToastNotification('Error', 'No se pudieron cargar los mensajes del chat', 'error');
        }
    };

    /**
     * Carga un chat por teléfono y pedidoId
     */
    const loadChatByTelefonoAndPedido = async (telefono, pedidoId) => {
        try {
            // Buscar si ya tenemos este chat en la lista
            const chatExistente = state.chatsActivos.find(
                chat => chat.telefono === telefono && chat.pedido?.id === pedidoId
            );
            
            if (chatExistente) {
                selectChat(chatExistente);
            } else {
                // Si no existe, intentar cargar directamente
                await loadChatMessages(pedidoId, telefono);
                
                // Construir un objeto de chat mínimo
                const chatMinimo = {
                    telefono: telefono,
                    pedidoId: pedidoId
                };
                
                state.chatActual = chatMinimo;
                showChat();
            }
        } catch (error) {
            console.error('Error al cargar chat específico:', error);
            showToastNotification('Error', 'No se pudo cargar el chat', 'error');
        }
    };

    /**
     * Renderiza los mensajes en la interfaz
     */
    const renderMessages = (data) => {
        elements.chatMessages.innerHTML = '';
        
        // Mostrar información del pedido
        if (data.pedido) {
            const pedidoInfo = document.createElement('div');
            pedidoInfo.className = 'pedido-info';
            pedidoInfo.innerHTML = `
                <strong>Pedido:</strong> ${data.pedido.codigo || data.pedido.id}<br>
                <strong>Estado:</strong> ${formatEstado(data.pedido.estado)}<br>
                <strong>Fecha:</strong> ${new Date(data.pedido.fecha_pedido || data.pedido.created_at).toLocaleDateString('es-CO')}
            `;
            elements.chatMessages.appendChild(pedidoInfo);
        }
        
        // Mostrar mensajes
        if (data.mensajes && data.mensajes.length > 0) {
            console.log('Renderizando mensajes:', data.mensajes);
            
            // Guardar el ID del último mensaje
            const lastMsgId = Math.max(...data.mensajes.map(m => m.id));
            if (lastMsgId > state.ultimoMensajeId) {
                state.ultimoMensajeId = lastMsgId;
            }
            
            data.mensajes.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = msg.tipo === 'sistema' ? 'message outgoing' : 'message incoming';
                
                let senderName = '';
                if (msg.tipo === 'sistema') {
                    senderName = msg.nombre_usuario || msg.username || 'Sistema';
                } else {
                    senderName = data.proveedor?.nombre || 'Proveedor';
                }
                
                const fecha = new Date(msg.fecha_creacion || msg.created_at);
                const horaFormateada = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                
                messageDiv.innerHTML = `
                    <div class="sender">${senderName}</div>
                    <div class="content">${formatMessageContent(msg.mensaje)}</div>
                    <div class="time">${horaFormateada}</div>
                `;
                
                elements.chatMessages.appendChild(messageDiv);
            });
            
            // Scroll al último mensaje
            scrollToBottom();
        } else {
            elements.chatMessages.innerHTML += `
                <div class="chat-welcome-message">
                    <p>No hay mensajes en este chat</p>
                </div>
            `;
        }
    };

    /**
     * Añade un mensaje a la interfaz de usuario
     */
    const addMessageToUI = (messageData) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = messageData.tipo === 'sistema' ? 'message outgoing' : 'message incoming';
        
        let senderName = '';
        if (messageData.tipo === 'sistema') {
            senderName = messageData.usuario_nombre || messageData.username || 'Sistema';
        } else {
            senderName = messageData.remitente || 'Proveedor';
        }
        
        const fecha = new Date(messageData.timestamp || messageData.fecha_creacion || new Date());
        const horaFormateada = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="sender">${senderName}</div>
            <div class="content">${formatMessageContent(messageData.mensaje)}</div>
            <div class="time">${horaFormateada}</div>
        `;
        
        elements.chatMessages.appendChild(messageDiv);
        
        // Incrementar contador de notificaciones si el chat está minimizado
        if (state.chatMinimizado && messageData.tipo !== 'sistema') {
            state.notificacionesNoLeidas++;
            updateNotificationBadge();
        }
        
        // Scroll al último mensaje
        scrollToBottom();
    };

    /**
     * Envía un mensaje al proveedor
     */
    const sendMessage = async () => {
        const mensaje = elements.messageInput.value.trim();
        
        if (!mensaje || !state.chatActual) return;
        
        try {
            // Si tenemos Socket.IO, enviar por ahí para mayor rapidez
            if (state.socket && state.socket.connected) {
                state.socket.emit('send_whatsapp_message', {
                    telefono: state.chatActual.telefono,
                    pedidoId: state.chatActual.pedidoId,
                    mensaje: mensaje,
                    usuarioId: JSON.parse(localStorage.getItem('user')).id
                });
                
                // Limpiar campo de entrada inmediatamente
                elements.messageInput.value = '';
            } else {
                // Fallback a API REST si no hay WebSocket
                const response = await fetch('/api/whatsapp/chats/responder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        pedidoId: state.chatActual.pedidoId,
                        telefono: state.chatActual.telefono,
                        mensaje
                    })
                });
                
                if (response.ok) {
                    // Limpiar campo de entrada
                    elements.messageInput.value = '';
                } else {
                    showToastNotification('Error', 'Error al enviar mensaje. Por favor, inténtelo de nuevo.', 'error');
                    console.error('Error al enviar mensaje:', await response.text());
                }
            }
            
            // Recargar mensajes después de un momento para ver el mensaje enviado
            setTimeout(() => {
                loadChatMessages(state.chatActual.pedidoId, state.chatActual.telefono);
            }, 1000);
            
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            showToastNotification('Error', 'Error al enviar mensaje. Verifique su conexión a internet.', 'error');
        }
    };

    /**
     * Marca mensajes como leídos
     */
    const markMessagesAsRead = async (pedidoId) => {
        try {
            await fetch(`/api/whatsapp/chats/${pedidoId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Error al marcar mensajes como leídos:', error);
        }
    };

    /**
     * Finalizar un chat activo
     */
    const finalizarChat = async (telefono) => {
        if (!confirm('¿Está seguro de que desea finalizar este chat?')) return;
        
        try {
            const response = await fetch(`/api/whatsapp/chats/${telefono}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                // Si el chat finalizado era el actual, limpiar la vista
                if (state.chatActual && state.chatActual.telefono === telefono) {
                    state.chatActual = null;
                    elements.chatMessages.innerHTML = `
                        <div class="chat-welcome-message">
                            <p>Seleccione un chat de la lista para ver los mensajes</p>
                        </div>
                    `;
                    document.getElementById('whatsapp-chat-title').textContent = 'Chat con Proveedor';
                    document.getElementById('whatsapp-chat-subtitle').textContent = 'Pedido: N/A';
                }
                
                // Actualizar lista de chats
                checkActiveChats();
            } else {
                alert('Error al finalizar el chat. Por favor, inténtelo de nuevo.');
                console.error('Error al finalizar chat:', await response.text());
            }
        } catch (error) {
            console.error('Error al finalizar chat:', error);
            alert('Error al finalizar chat. Verifique su conexión a internet.');
        }
    };

    /**
     * Minimiza el panel de chat
     */
    const minimizeChat = () => {
        elements.chatContainer.classList.add('minimized');
        state.chatMinimizado = true;
    };

    /**
     * Maximiza el panel de chat
     */
    const maximizeChat = () => {
        elements.chatContainer.classList.remove('minimized');
        state.chatMinimizado = false;
        
        // Al maximizar, resetear contador de notificaciones
        state.notificacionesNoLeidas = 0;
        updateNotificationBadge();
    };

    /**
     * Actualiza el contador de notificaciones no leídas
     */
    const updateNotificationBadge = () => {
        const badge = document.getElementById('whatsapp-notification-badge');
        if (badge) {
            if (state.notificacionesNoLeidas > 0 && state.chatMinimizado) {
                badge.textContent = state.notificacionesNoLeidas;
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
                state.notificacionesNoLeidas = 0;
            }
        }
    };

    /**
     * Muestra la ventana de chat
     */
    const showChat = () => {
        elements.chatContainer.style.display = 'flex';
        state.chatAbierto = true;
        
        // Resetear contador de notificaciones
        state.notificacionesNoLeidas = 0;
        updateNotificationBadge();
        
        // Si hay un chat activo, actualizar mensajes
        if (state.chatActual) {
            loadChatMessages(state.chatActual.pedidoId, state.chatActual.telefono);
        }
    };

    /**
     * Oculta la ventana de chat
     */
    const hideChat = () => {
        elements.chatContainer.style.display = 'none';
        state.chatAbierto = false;
        state.chatMinimizado = false;
        elements.chatContainer.classList.remove('minimized');
        state.notificacionesNoLeidas = 0;
        updateNotificationBadge();
    };

    /**
     * Formatea un mensaje de chat (añade enlaces, emojis, etc.)
     */
    const formatMessageContent = (content) => {
        // Convertir URLs en enlaces
        let formattedContent = content.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank">$1</a>'
        );
        
        // Aquí se podrían añadir más formatos (emojis, texto en negrita, etc.)
        
        return formattedContent;
    };

    /**
     * Formatea el estado del pedido
     */
    const formatEstado = (estado) => {
        switch (estado) {
            case 'pendiente': return 'Pendiente';
            case 'en_proceso': return 'En Proceso';
            case 'completado': return 'Completado';
            case 'cancelado': return 'Cancelado';
            default: return estado;
        }
    };

    /**
     * Hace scroll hacia el último mensaje
     */
    const scrollToBottom = () => {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    };

    /**
     * Notifica si hay nuevos mensajes
     */
    const notifyNewMessages = (chats) => {
        // Contar total de mensajes no leídos
        const totalNoLeidos = chats.reduce((total, chat) => total + chat.mensajes_no_leidos, 0);
        
        if (totalNoLeidos > 0) {
            // Reproducir sonido de notificación
            const notificationSound = document.getElementById('notification-sound');
            if (notificationSound) {
                notificationSound.play().catch(e => console.log('No se pudo reproducir el sonido', e));
            }
            
            // Si la ventana no está activa, mostrar notificación
            if (!state.chatAbierto) {
                showChatNotification(totalNoLeidos);
            }
        }
    };

    /**
     * Muestra una notificación de nuevos mensajes
     */
    const showChatNotification = (count) => {
        // Verificar si ya existe un botón de notificación
        let notificationBtn = document.getElementById('whatsapp-notification-btn');
        
        if (!notificationBtn) {
            // Crear botón de notificación
            notificationBtn = document.createElement('button');
            notificationBtn.id = 'whatsapp-notification-btn';
            notificationBtn.className = 'whatsapp-notification-btn';
            notificationBtn.innerHTML = `
                <i class="fab fa-whatsapp"></i>
                <span class="notification-badge">${count}</span>
            `;
            
            // Estilos para el botón
            const style = document.createElement('style');
            style.textContent = `
                .whatsapp-notification-btn {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background-color: #25D366;
                    color: white;
                    border: none;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    cursor: pointer;
                    z-index: 999;
                    font-size: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .notification-badge {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background-color: #FF5252;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .whatsapp-notification-btn:hover {
                    transform: scale(1.05);
                }
            `;
            document.head.appendChild(style);
            
            // Evento click
            notificationBtn.addEventListener('click', () => {
                showChat();
                notificationBtn.style.display = 'none';
            });
            
            document.body.appendChild(notificationBtn);
        } else {
            // Actualizar contador
            notificationBtn.querySelector('.notification-badge').textContent = count;
            notificationBtn.style.display = 'flex';
        }
    };

    /**
     * Reproduce el sonido de notificación
     */
    const playNotificationSound = () => {
        try {
            const audio = document.getElementById('notification-sound');
            if (audio) {
                audio.play().catch(e => console.log('No se pudo reproducir el sonido', e));
            }
        } catch (error) {
            console.error('Error al reproducir sonido:', error);
        }
    };

    /**
     * Trunca un mensaje largo
     */
    const truncateMessage = (message, length = 30) => {
        if (!message) return '';
        return message.length > length ? message.substring(0, length) + '...' : message;
    };

    /**
     * Muestra notificación toast
     */
    const showToastNotification = (title, message, type = 'info', onClick = null) => {
        // Verificar si existe Toastify
        if (typeof Toastify === 'function') {
            Toastify({
                text: `<strong>${title}</strong><br>${message}`,
                duration: 5000,
                close: true,
                gravity: "top", 
                position: "right",
                backgroundColor: type === 'error' ? '#d9534f' : (type === 'warning' ? '#f0ad4e' : '#5bc0de'),
                onClick: onClick,
                escapeMarkup: false
            }).showToast();
        } else {
            // Fallback si no existe Toastify
            const toast = document.createElement('div');
            toast.className = `manual-toast ${type}`;
            toast.innerHTML = `
                <div class="manual-toast-header">${title}</div>
                <div class="manual-toast-body">${message}</div>
                <button class="manual-toast-close">&times;</button>
            `;
            
            // Añadir estilos
            const styles = document.createElement('style');
            styles.textContent = `
                .manual-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 350px;
                    background-color: #fff;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                    border-radius: 5px;
                    padding: 15px;
                    z-index: 9999;
                    animation: manualToastFadeIn 0.3s;
                }
                
                .manual-toast.error { border-left: 5px solid #d9534f; }
                .manual-toast.warning { border-left: 5px solid #f0ad4e; }
                .manual-toast.info { border-left: 5px solid #5bc0de; }
                
                .manual-toast-header {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .manual-toast-close {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                }
                
                @keyframes manualToastFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            
            document.head.appendChild(styles);
            document.body.appendChild(toast);
            
            // Evento para cerrar
            toast.querySelector('.manual-toast-close').addEventListener('click', () => {
                document.body.removeChild(toast);
            });
            
            // Auto cerrar después de 5 segundos
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 5000);
            
            // Evento click
            if (onClick) {
                toast.addEventListener('click', onClick);
                toast.style.cursor = 'pointer';
            }
        }
    };

    // Interfaz pública
    return {
        initialize,
        showChat,
        hideChat,
        minimizeChat,
        maximizeChat,
        checkActiveChats,
        loadChatMessages,
        getNotificationCount: () => state.totalMensajesNoLeidos
    };
})();

// Inicializar el componente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    WhatsAppChat.initialize();
});

// Añadir al objeto window para acceso global
window.WhatsAppChat = WhatsAppChat;