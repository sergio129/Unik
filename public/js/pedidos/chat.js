/**
 * Componente de chat para la sección de pedidos
 * Permite interactuar con el sistema de chat de WhatsApp
 */

class ChatPedidos {
    constructor() {
        this.pedidoActual = null;
        this.chatContainer = null;
        this.chatToggleBtn = null;
        this.messages = [];
        this.isLoading = false;
        this.hasNewMessages = false;
        this.chatVisible = false;
        this.intervalId = null;
        this.lastChecked = new Date();
        this.updateInterval = 10000; // 10 segundos
    }

    /**
     * Inicializa el componente de chat
     * @param {number} pedidoId - ID del pedido actual
     */
    init(pedidoId) {
        this.pedidoActual = pedidoId;
        this.setupUI();
        this.setupEventListeners();
        
        // Comprobamos inicialmente si hay mensajes
        this.obtenerMensajes();
        
        // Configurar intervalo para actualizar mensajes
        this.intervalId = setInterval(() => {
            if (this.pedidoActual) {
                this.comprobarNuevosMensajes();
            }
        }, this.updateInterval);
    }

    /**
     * Configura los elementos de la interfaz de usuario
     */
    setupUI() {
        // Crear el botón de chat
        this.chatToggleBtn = document.createElement('button');
        this.chatToggleBtn.className = 'chat-toggle-btn';
        this.chatToggleBtn.innerHTML = '<i class="fas fa-comment"></i>';
        this.chatToggleBtn.title = 'Chat con proveedor';
        
        // Crear el contenedor del chat
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container hidden';
        
        // Estructura HTML del chat
        this.chatContainer.innerHTML = `
            <div class="chat-header">
                <h3>Chat con proveedor</h3>
                <div class="chat-info">
                    <p>Pedido #${this.pedidoActual || ''}</p>
                    <p class="chat-status">Offline</p>
                </div>
            </div>
            <div class="chat-messages">
                <div class="loading-messages">Cargando mensajes...</div>
            </div>
            <form class="chat-form">
                <input type="text" placeholder="Escribe un mensaje..." required>
                <button type="submit">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
        `;

        // Insertar en el DOM
        document.body.appendChild(this.chatToggleBtn);
        document.body.appendChild(this.chatContainer);

        // Referencias a elementos del chat
        this.chatMessagesContainer = this.chatContainer.querySelector('.chat-messages');
        this.chatForm = this.chatContainer.querySelector('.chat-form');
        this.chatInput = this.chatForm.querySelector('input');
        this.chatStatus = this.chatContainer.querySelector('.chat-status');
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Toggle para mostrar/ocultar el chat
        this.chatToggleBtn.addEventListener('click', () => {
            this.toggleChat();
        });

        // Envío de mensajes
        this.chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const mensaje = this.chatInput.value.trim();
            if (mensaje) {
                this.enviarMensaje(mensaje);
            }
        });
    }

    /**
     * Alternar la visibilidad del chat
     */
    toggleChat() {
        this.chatVisible = !this.chatVisible;
        
        if (this.chatVisible) {
            this.chatContainer.classList.remove('hidden');
            // Refrescar mensajes al abrir
            this.obtenerMensajes();
            // Quitar notificación
            this.chatToggleBtn.classList.remove('has-notification');
            this.hasNewMessages = false;
        } else {
            this.chatContainer.classList.add('hidden');
        }
    }

    /**
     * Obtiene los mensajes del chat para el pedido actual
     */
    async obtenerMensajes() {
        if (!this.pedidoActual || this.isLoading) return;
        
        this.isLoading = true;
        this.renderLoading();

        try {
            const response = await fetch(`/api/whatsapp/mensajes/${this.pedidoActual}`);
            if (!response.ok) {
                throw new Error('Error al cargar los mensajes');
            }

            const data = await response.json();
            this.messages = data.mensajes || [];
            this.lastChecked = new Date();
            
            // Actualizar estado del chat
            const chatActivo = data.chatActivo || false;
            this.actualizarEstadoChat(chatActivo);
            
            this.renderMensajes();
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
            this.renderError('No se pudieron cargar los mensajes. Intenta de nuevo.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Comprueba si hay nuevos mensajes
     */
    async comprobarNuevosMensajes() {
        if (!this.pedidoActual) return;
        
        try {
            const response = await fetch(`/api/whatsapp/mensajes/${this.pedidoActual}?desde=${this.lastChecked.toISOString()}`);
            if (!response.ok) {
                throw new Error('Error al comprobar nuevos mensajes');
            }

            const data = await response.json();
            const nuevosMensajes = data.mensajes || [];
            
            if (nuevosMensajes.length > 0) {
                // Añadir nuevos mensajes y actualizar UI
                this.messages = [...this.messages, ...nuevosMensajes];
                this.lastChecked = new Date();
                
                // Notificar al usuario si el chat no está visible
                if (!this.chatVisible) {
                    this.notificarNuevosMensajes();
                }
                
                // Si el chat está visible, renderizar los mensajes
                if (this.chatVisible) {
                    this.renderMensajes();
                }

                // Actualizar estado del chat
                this.actualizarEstadoChat(data.chatActivo || false);
            }
        } catch (error) {
            console.error('Error al comprobar mensajes nuevos:', error);
        }
    }

    /**
     * Envía un mensaje al proveedor
     * @param {string} mensaje - Contenido del mensaje
     */
    async enviarMensaje(mensaje) {
        if (!this.pedidoActual || !mensaje) return;

        this.chatInput.disabled = true;
        const submitBtn = this.chatForm.querySelector('button');
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/api/whatsapp/enviar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pedidoId: this.pedidoActual,
                    mensaje: mensaje
                })
            });

            if (!response.ok) {
                throw new Error('Error al enviar el mensaje');
            }

            // Limpiar input y obtener mensajes actualizados
            this.chatInput.value = '';
            await this.obtenerMensajes();
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            // Mostrar error en la UI
            this.mostrarToast('Error al enviar el mensaje. Intente nuevamente.', 'error');
        } finally {
            this.chatInput.disabled = false;
            submitBtn.disabled = false;
            this.chatInput.focus();
        }
    }

    /**
     * Renderiza el estado de carga
     */
    renderLoading() {
        this.chatMessagesContainer.innerHTML = '<div class="loading-messages">Cargando mensajes...</div>';
    }

    /**
     * Renderiza un mensaje de error
     */
    renderError(mensaje) {
        this.chatMessagesContainer.innerHTML = `<div class="error-message">${mensaje}</div>`;
    }

    /**
     * Renderiza los mensajes en el contenedor
     */
    renderMensajes() {
        if (this.messages.length === 0) {
            this.chatMessagesContainer.innerHTML = '<div class="no-messages">No hay mensajes en este chat.</div>';
            return;
        }

        this.chatMessagesContainer.innerHTML = '';
        
        this.messages.forEach(msg => {
            const messageElement = document.createElement('div');
            
            // Determinar tipo de mensaje
            const esProveedor = msg.origen === 'proveedor';
            messageElement.className = `chat-message ${esProveedor ? 'proveedor' : 'sistema'}`;
            
            // Formatear fecha
            const fecha = new Date(msg.fecha);
            const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Crear contenido del mensaje
            messageElement.innerHTML = `
                <div class="message-content">
                    <p>${this.escapeHTML(msg.mensaje)}</p>
                    <span class="message-time">${horaFormateada}</span>
                    ${msg.usuario ? `<span class="message-user">Por: ${this.escapeHTML(msg.usuario)}</span>` : ''}
                </div>
            `;
            
            this.chatMessagesContainer.appendChild(messageElement);
        });
        
        // Scroll hacia el último mensaje
        this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
    }

    /**
     * Actualiza el estado del chat en la UI
     */
    actualizarEstadoChat(activo) {
        if (activo) {
            this.chatStatus.textContent = 'Online';
            this.chatStatus.classList.add('active');
            this.chatForm.querySelector('button').disabled = false;
            this.chatInput.disabled = false;
        } else {
            this.chatStatus.textContent = 'Offline';
            this.chatStatus.classList.remove('active');
            this.chatForm.querySelector('button').disabled = true;
            this.chatInput.disabled = true;
            this.chatInput.placeholder = 'Chat no disponible';
        }
    }

    /**
     * Notifica al usuario de nuevos mensajes
     */
    notificarNuevosMensajes() {
        // Mostrar indicador visual
        this.chatToggleBtn.classList.add('has-notification');
        this.hasNewMessages = true;
        
        // Reproducir sonido
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {
            // Silenciar errores de reproducción (políticas de autoplay)
            console.log('No se pudo reproducir la notificación de audio');
        });
        
        // Mostrar notificación de escritorio si está permitido
        if (Notification && Notification.permission === "granted") {
            new Notification('Nuevo mensaje en el chat', {
                body: 'Has recibido un nuevo mensaje en el chat del pedido #' + this.pedidoActual,
                icon: '/images/logo.png'
            });
        }
    }

    /**
     * Muestra un mensaje toast en la UI
     */
    mostrarToast(mensaje, tipo = 'info') {
        // Si existe la función global
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(mensaje, tipo);
        } else {
            alert(mensaje);
        }
    }

    /**
     * Escapa caracteres HTML para prevenir XSS
     */
    escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Destruye la instancia del chat y elimina los event listeners
     */
    destruir() {
        // Limpiar el intervalo
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Eliminar elementos del DOM
        if (this.chatContainer) {
            document.body.removeChild(this.chatContainer);
        }
        
        if (this.chatToggleBtn) {
            document.body.removeChild(this.chatToggleBtn);
        }
    }
}

// Exportar la clase para su uso
window.ChatPedidos = ChatPedidos;