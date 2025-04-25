/**
 * Sistema de Notificaciones Avanzado - UNIKA
 * Este archivo contiene la lógica para gestionar el centro de notificaciones persistente
 * donde se podrán seguir cambios en pedidos importantes y otras alertas del sistema.
 */

// Clase para el Sistema de Notificaciones Avanzado
class AdvancedNotificationSystem {
    constructor() {
        // Estado del sistema de notificaciones
        this.state = {
            notifications: [],
            unreadCount: 0,
            isInitialized: false,
            isCenterOpen: false,
            filters: {
                type: 'all', // all, pedidos, inventario, ventas
                read: 'all'  // all, read, unread
            }
        };
        
        // Configuración de tipos de notificaciones
        this.notificationTypes = {
            'pedido_nuevo': {
                icon: 'fa-truck-loading',
                type: 'info',
                category: 'pedidos'
            },
            'pedido_actualizado': {
                icon: 'fa-sync',
                type: 'info',
                category: 'pedidos'
            },
            'pedido_completado': {
                icon: 'fa-check-circle',
                type: 'success',
                category: 'pedidos'
            },
            'pedido_cancelado': {
                icon: 'fa-times-circle',
                type: 'danger',
                category: 'pedidos'
            },
            'pedido_retrasado': {
                icon: 'fa-exclamation-circle',
                type: 'warning',
                category: 'pedidos'
            },
            'producto_stock_bajo': {
                icon: 'fa-box-open',
                type: 'warning',
                category: 'inventario'
            },
            'producto_sin_stock': {
                icon: 'fa-box-open',
                type: 'danger',
                category: 'inventario'
            },
            'venta_completada': {
                icon: 'fa-cash-register',
                type: 'success',
                category: 'ventas'
            },
            'venta_cancelada': {
                icon: 'fa-ban',
                type: 'danger',
                category: 'ventas'
            }
        };
        
        // Intervalo para comprobar nuevas notificaciones
        this.checkInterval = null;
    }
    
    /**
     * Inicializa el sistema de notificaciones
     */
    initialize() {
        if (this.state.isInitialized) return;
        
        console.log('Inicializando sistema de notificaciones avanzado...');
        
        // Crear el HTML del centro de notificaciones
        this.createNotificationCenterHTML();
        
        // Cargar las notificaciones existentes
        this.loadNotifications();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Configurar el WebSocket para recibir notificaciones en tiempo real si existe
        this.setupWebSocketListeners();
        
        // Marcar como inicializado
        this.state.isInitialized = true;
        
        // Establecer intervalo para comprobar nuevas notificaciones cada 2 minutos
        this.checkInterval = setInterval(() => this.checkForNewNotifications(), 120000);
    }
    
    /**
     * Crea el HTML del centro de notificaciones
     */
    createNotificationCenterHTML() {
        // Verificar si ya existe el elemento
        if (document.getElementById('notificationCenter')) return;
        
        // Crear el icono de notificaciones en la barra superior
        const topbarRight = document.querySelector('.btn-toolbar');
        if (topbarRight) {
            const notificationButton = document.createElement('div');
            notificationButton.className = 'dropdown me-2 position-relative';
            notificationButton.innerHTML = `
                <button class="btn btn-light position-relative" id="btnNotificationCenter" title="Centro de notificaciones">
                    <i class="fas fa-bell"></i>
                    <span id="notificationBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none">
                        0
                    </span>
                </button>
            `;
            topbarRight.prepend(notificationButton);
        }
        
        // Crear el centro de notificaciones
        const notificationCenter = document.createElement('div');
        notificationCenter.id = 'notificationCenter';
        notificationCenter.className = 'notification-center';
        notificationCenter.style.display = 'none';
        
        notificationCenter.innerHTML = `
            <div class="notification-center-header">
                <h5 class="notification-center-title">
                    <i class="fas fa-bell me-2"></i>
                    Centro de notificaciones
                </h5>
                <div class="notification-center-header-buttons">
                    <button id="btnFilterNotifications" class="notification-center-header-btn" title="Filtrar notificaciones">
                        <i class="fas fa-filter"></i>
                    </button>
                    <button id="btnMarkAllAsRead" class="notification-center-header-btn" title="Marcar todo como leído">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button id="btnCloseNotificationCenter" class="notification-center-header-btn" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="notification-center-content">
                <div id="notificationFilters" class="p-2 border-bottom" style="display: none;">
                    <div class="row g-2">
                        <div class="col-6">
                            <select id="filterNotificationType" class="form-select form-select-sm">
                                <option value="all">Todos los tipos</option>
                                <option value="pedidos">Pedidos</option>
                                <option value="inventario">Inventario</option>
                                <option value="ventas">Ventas</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <select id="filterNotificationRead" class="form-select form-select-sm">
                                <option value="all">Todos los estados</option>
                                <option value="unread">No leídos</option>
                                <option value="read">Leídos</option>
                            </select>
                        </div>
                    </div>
                </div>
                <ul id="notificationList" class="notification-list">
                    <li class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No hay notificaciones</p>
                    </li>
                </ul>
            </div>
            <div class="notification-center-footer">
                <a href="#" id="btnViewAllNotifications">Ver todas las notificaciones</a>
            </div>
        `;
        
        document.body.appendChild(notificationCenter);
    }
    
    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón para abrir/cerrar el centro de notificaciones
        const notificationButton = document.getElementById('btnNotificationCenter');
        if (notificationButton) {
            notificationButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleNotificationCenter();
            });
        }
        
        // Botón para cerrar el centro de notificaciones
        const closeButton = document.getElementById('btnCloseNotificationCenter');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeNotificationCenter();
            });
        }
        
        // Botón para mostrar/ocultar filtros
        const filterButton = document.getElementById('btnFilterNotifications');
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                const filtersContainer = document.getElementById('notificationFilters');
                if (filtersContainer) {
                    const isVisible = filtersContainer.style.display !== 'none';
                    filtersContainer.style.display = isVisible ? 'none' : 'block';
                }
            });
        }
        
        // Selectores de filtros
        const typeFilter = document.getElementById('filterNotificationType');
        const readFilter = document.getElementById('filterNotificationRead');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.state.filters.type = typeFilter.value;
                this.renderNotifications();
            });
        }
        
        if (readFilter) {
            readFilter.addEventListener('change', () => {
                this.state.filters.read = readFilter.value;
                this.renderNotifications();
            });
        }
        
        // Botón para marcar todas como leídas
        const markAllButton = document.getElementById('btnMarkAllAsRead');
        if (markAllButton) {
            markAllButton.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }
        
        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (this.state.isCenterOpen) {
                const notificationCenter = document.getElementById('notificationCenter');
                const notificationButton = document.getElementById('btnNotificationCenter');
                
                if (notificationCenter && notificationButton) {
                    const isClickInside = notificationCenter.contains(e.target) || notificationButton.contains(e.target);
                    
                    if (!isClickInside) {
                        this.closeNotificationCenter();
                    }
                }
            }
        });
        
        // Botón para ver todas las notificaciones
        const viewAllButton = document.getElementById('btnViewAllNotifications');
        if (viewAllButton) {
            viewAllButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Futura implementación: redirigir a una página de historial completo
                console.log('Ver todas las notificaciones');
            });
        }
    }
    
    /**
     * Configura los listeners de WebSocket para notificaciones en tiempo real
     */
    setupWebSocketListeners() {
        // Comprobar si hay una instancia de socket disponible
        if (window.socket) {
            console.log('Configurando WebSocket para notificaciones en tiempo real...');
            
            // Listener para notificaciones de pedidos
            window.socket.on('notificacion_pedido', (data) => {
                console.log('Notificación de pedido recibida:', data);
                this.addNotification(data);
            });
            
            // Listener para notificaciones de inventario
            window.socket.on('notificacion_inventario', (data) => {
                console.log('Notificación de inventario recibida:', data);
                this.addNotification(data);
            });
            
            // Listener para notificaciones de ventas
            window.socket.on('notificacion_venta', (data) => {
                console.log('Notificación de venta recibida:', data);
                this.addNotification(data);
            });
        }
    }
    
    /**
     * Carga las notificaciones existentes desde el servidor
     */
    loadNotifications() {
        // Mostrar un estado de carga
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = '<li class="text-center p-3"><div class="spinner-border text-primary spinner-border-sm" role="status"></div> Cargando notificaciones...</li>';
        }
        
        // Token de autenticación
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No hay token de autenticación para cargar notificaciones');
            return;
        }
        
        // Realizar la petición para obtener notificaciones
        fetch('/api/notificaciones', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar notificaciones');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Actualizar el estado con las notificaciones obtenidas
                this.state.notifications = data.data;
                
                // Contar notificaciones no leídas
                this.updateUnreadCount();
                
                // Renderizar las notificaciones
                this.renderNotifications();
            } else {
                console.error('Error al cargar notificaciones:', data.message);
                this.showLoadError('Error al cargar notificaciones');
            }
        })
        .catch(error => {
            console.error('Error al cargar notificaciones:', error);
            this.showLoadError('Error de conexión');
        });
    }
    
    /**
     * Muestra un error al cargar notificaciones
     */
    showLoadError(message) {
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = `<li class="notification-empty"><i class="fas fa-exclamation-circle text-danger"></i><p>${message}</p></li>`;
        }
    }
    
    /**
     * Comprueba si hay nuevas notificaciones
     */
    checkForNewNotifications() {
        console.log('Comprobando nuevas notificaciones...');
        
        // Token de autenticación
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Si hay notificaciones, usar la más reciente para el parámetro since
        let sinceParam = '';
        if (this.state.notifications.length > 0) {
            // Encontrar la fecha de la notificación más reciente
            const latestDate = Math.max(...this.state.notifications.map(n => new Date(n.fecha).getTime()));
            sinceParam = `?since=${new Date(latestDate).toISOString()}`;
        }
        
        // Realizar la petición para obtener nuevas notificaciones
        fetch(`/api/notificaciones/nuevas${sinceParam}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al comprobar nuevas notificaciones');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data.length > 0) {
                console.log(`Se encontraron ${data.data.length} notificaciones nuevas`);
                
                // Añadir las nuevas notificaciones al estado
                this.state.notifications = [...data.data, ...this.state.notifications];
                
                // Actualizar contador y renderizar
                this.updateUnreadCount();
                this.renderNotifications();
                
                // Mostrar una notificación toast para alertar de nuevas notificaciones
                if (data.data.length === 1) {
                    this.showToast('info', 'Nueva notificación', 'Tienes una nueva notificación');
                } else {
                    this.showToast('info', 'Nuevas notificaciones', `Tienes ${data.data.length} notificaciones nuevas`);
                }
            }
        })
        .catch(error => {
            console.error('Error al comprobar nuevas notificaciones:', error);
        });
    }
    
    /**
     * Renderiza las notificaciones con filtros aplicados
     */
    renderNotifications() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        // Aplicar filtros
        let filteredNotifications = this.state.notifications;
        
        // Filtro por tipo
        if (this.state.filters.type !== 'all') {
            filteredNotifications = filteredNotifications.filter(notification => {
                const notificationType = this.notificationTypes[notification.tipo];
                return notificationType && notificationType.category === this.state.filters.type;
            });
        }
        
        // Filtro por leído/no leído
        if (this.state.filters.read !== 'all') {
            const isRead = this.state.filters.read === 'read';
            filteredNotifications = filteredNotifications.filter(notification => notification.leido === isRead);
        }
        
        // Mostrar mensaje si no hay notificaciones
        if (filteredNotifications.length === 0) {
            notificationList.innerHTML = `
                <li class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay notificaciones${this.state.filters.type !== 'all' || this.state.filters.read !== 'all' ? ' con los filtros actuales' : ''}</p>
                </li>
            `;
            return;
        }
        
        // Crear HTML para cada notificación
        let html = '';
        filteredNotifications.forEach(notification => {
            // Obtener configuración del tipo de notificación
            const notifType = this.notificationTypes[notification.tipo] || {
                icon: 'fa-bell',
                type: 'info',
                category: 'other'
            };
            
            // Formatear fecha relativa
            const formattedDate = moment(notification.fecha).fromNow();
            
            // Crear elemento HTML para la notificación
            html += `
                <li class="notification-item${!notification.leido ? ' unread' : ''}" data-id="${notification.id}">
                    <div class="notification-icon ${notifType.type}">
                        <i class="fas ${notifType.icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">
                            ${notification.titulo}
                            ${!notification.leido ? '<span class="badge bg-primary rounded-pill ms-2">Nuevo</span>' : ''}
                        </div>
                        <div class="notification-message">${notification.mensaje}</div>
                        <div class="notification-footer">
                            <span>${formattedDate}</span>
                        </div>
                        ${notification.acciones ? `
                            <div class="notification-actions">
                                ${notification.acciones.map(accion => `
                                    <button class="notification-action-btn${accion.primary ? ' primary' : ''}" 
                                            data-action="${accion.action}"
                                            data-notification-id="${notification.id}"
                                            data-entity-id="${notification.entidad_id || ''}">
                                        ${accion.label}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </li>
            `;
        });
        
        // Actualizar el contenido de la lista
        notificationList.innerHTML = html;
        
        // Configurar eventos para las notificaciones
        this.setupNotificationItemEvents();
    }
    
    /**
     * Configura los eventos para los elementos de notificación
     */
    setupNotificationItemEvents() {
        const notificationItems = document.querySelectorAll('.notification-item');
        
        notificationItems.forEach(item => {
            // Evento de clic en la notificación
            item.addEventListener('click', () => {
                const notificationId = item.getAttribute('data-id');
                if (!notificationId) return;
                
                // Marcar como leída
                this.markAsRead(notificationId);
                
                // Buscar la notificación
                const notification = this.state.notifications.find(n => n.id.toString() === notificationId.toString());
                if (notification && notification.url) {
                    // Si tiene URL, navegar a ella
                    if (notification.url_externa) {
                        window.open(notification.url, '_blank');
                    } else {
                        window.location.href = notification.url;
                    }
                }
            });
            
            // Eventos para botones de acción
            const actionButtons = item.querySelectorAll('.notification-action-btn');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evitar que se active el clic de la notificación
                    
                    const action = button.getAttribute('data-action');
                    const notificationId = button.getAttribute('data-notification-id');
                    const entityId = button.getAttribute('data-entity-id');
                    
                    this.handleNotificationAction(action, notificationId, entityId);
                });
            });
        });
    }
    
    /**
     * Maneja las acciones de una notificación
     */
    handleNotificationAction(action, notificationId, entityId) {
        console.log(`Acción: ${action} para notificación ${notificationId} y entidad ${entityId}`);
        
        switch (action) {
            case 'ver_pedido':
                // Marcar notificación como leída y redirigir a la página de pedidos
                this.markAsRead(notificationId);
                window.location.href = `/pedidos/pedidos.html?id=${entityId}`;
                break;
                
            case 'ver_producto':
                // Marcar notificación como leída y redirigir a la página de productos
                this.markAsRead(notificationId);
                window.location.href = `/inventario/productos.html?id=${entityId}`;
                break;
                
            case 'ver_venta':
                // Marcar notificación como leída y redirigir a la página de ventas
                this.markAsRead(notificationId);
                window.location.href = `/ventas/historial.html?id=${entityId}`;
                break;
                
            case 'descartar':
                // Eliminar la notificación
                this.deleteNotification(notificationId);
                break;
                
            default:
                console.log(`Acción desconocida: ${action}`);
        }
    }
    
    /**
     * Marca una notificación como leída
     */
    markAsRead(notificationId) {
        // Token de autenticación
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Actualizar en la interfaz
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.classList.remove('unread');
            
            // Eliminar el badge de nuevo
            const badge = notificationItem.querySelector('.badge');
            if (badge) badge.remove();
        }
        
        // Actualizar en el estado local
        const notificationIndex = this.state.notifications.findIndex(n => n.id.toString() === notificationId.toString());
        if (notificationIndex !== -1) {
            this.state.notifications[notificationIndex].leido = true;
        }
        
        // Actualizar contador
        this.updateUnreadCount();
        
        // Enviar al servidor
        fetch(`/api/notificaciones/${notificationId}/leer`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al marcar notificación como leída');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                console.error('Error al marcar notificación como leída:', data.message);
            }
        })
        .catch(error => {
            console.error('Error al marcar notificación como leída:', error);
        });
    }
    
    /**
     * Marca todas las notificaciones como leídas
     */
    markAllAsRead() {
        // Token de autenticación
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Mostrar confirmación
        if (!confirm('¿Marcar todas las notificaciones como leídas?')) {
            return;
        }
        
        // Enviar al servidor
        fetch('/api/notificaciones/marcar-todas-leidas', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al marcar todas las notificaciones como leídas');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Actualizar en el estado local
                this.state.notifications = this.state.notifications.map(n => ({ ...n, leido: true }));
                
                // Actualizar contador
                this.updateUnreadCount();
                
                // Actualizar la interfaz
                this.renderNotifications();
                
                // Mostrar mensaje
                this.showToast('success', 'Notificaciones', 'Todas las notificaciones han sido marcadas como leídas');
            } else {
                console.error('Error al marcar todas las notificaciones como leídas:', data.message);
                this.showToast('error', 'Error', 'No se pudieron marcar todas las notificaciones como leídas');
            }
        })
        .catch(error => {
            console.error('Error al marcar todas las notificaciones como leídas:', error);
            this.showToast('error', 'Error', 'Error de conexión');
        });
    }
    
    /**
     * Elimina una notificación
     */
    deleteNotification(notificationId) {
        // Token de autenticación
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Enviar al servidor
        fetch(`/api/notificaciones/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al eliminar notificación');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Eliminar del estado local
                this.state.notifications = this.state.notifications.filter(n => n.id.toString() !== notificationId.toString());
                
                // Actualizar contador
                this.updateUnreadCount();
                
                // Actualizar la interfaz
                this.renderNotifications();
                
                // Mostrar mensaje
                this.showToast('success', 'Notificación eliminada', 'La notificación ha sido eliminada');
            } else {
                console.error('Error al eliminar notificación:', data.message);
                this.showToast('error', 'Error', 'No se pudo eliminar la notificación');
            }
        })
        .catch(error => {
            console.error('Error al eliminar notificación:', error);
            this.showToast('error', 'Error', 'Error de conexión');
        });
    }
    
    /**
     * Añade una nueva notificación
     */
    addNotification(notification) {
        // Añadir la notificación al estado
        this.state.notifications.unshift(notification);
        
        // Actualizar contador
        this.updateUnreadCount();
        
        // Si el centro está abierto, actualizar la interfaz
        if (this.state.isCenterOpen) {
            this.renderNotifications();
        }
        
        // Mostrar una notificación toast
        this.showToast('info', notification.titulo, notification.mensaje);
        
        // Reproducir sonido de notificación
        this.playNotificationSound();
    }
    
    /**
     * Actualiza el contador de notificaciones no leídas
     */
    updateUnreadCount() {
        // Contar notificaciones no leídas
        this.state.unreadCount = this.state.notifications.filter(n => !n.leido).length;
        
        // Actualizar el badge
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.state.unreadCount > 0) {
                badge.textContent = this.state.unreadCount > 99 ? '99+' : this.state.unreadCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
        
        // Actualizar el icono (animación si hay notificaciones no leídas)
        const icon = document.querySelector('#btnNotificationCenter i');
        if (icon) {
            if (this.state.unreadCount > 0) {
                icon.classList.add('notification-pulse');
            } else {
                icon.classList.remove('notification-pulse');
            }
        }
    }
    
    /**
     * Muestra una notificación toast
     */
    showToast(type, title, message) {
        // Crear objeto de notificación para usar el sistema existente
        const notification = {
            type: type,
            title: title,
            message: message
        };
        
        // Usar la función de showNotification si existe globalmente
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Implementación alternativa
            const toastContainer = document.querySelector('.notification-container');
            if (!toastContainer) {
                const container = document.createElement('div');
                container.className = 'notification-container';
                document.body.appendChild(container);
            }
            
            const toast = document.createElement('div');
            toast.className = `notification-toast ${type}`;
            toast.innerHTML = `
                <div class="notification-toast-content">
                    <button class="notification-toast-close">&times;</button>
                    <div class="notification-toast-title">${title}</div>
                    <div class="notification-toast-message">${message}</div>
                </div>
            `;
            
            document.querySelector('.notification-container').appendChild(toast);
            
            // Mostrar la notificación
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // Configurar evento para cerrar
            toast.querySelector('.notification-toast-close').addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            });
            
            // Auto-cerrar después de 5 segundos
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }
    
    /**
     * Reproduce un sonido de notificación
     */
    playNotificationSound() {
        // Comprobar si existe el archivo de sonido
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => {
            console.log('No se pudo reproducir el sonido de notificación', e);
        });
    }
    
    /**
     * Abre o cierra el centro de notificaciones
     */
    toggleNotificationCenter() {
        this.state.isCenterOpen = !this.state.isCenterOpen;
        
        const notificationCenter = document.getElementById('notificationCenter');
        if (notificationCenter) {
            notificationCenter.style.display = this.state.isCenterOpen ? 'flex' : 'none';
        }
    }
    
    /**
     * Cierra el centro de notificaciones
     */
    closeNotificationCenter() {
        this.state.isCenterOpen = false;
        
        const notificationCenter = document.getElementById('notificationCenter');
        if (notificationCenter) {
            notificationCenter.style.display = 'none';
        }
    }
    
    /**
     * Limpia los recursos al cerrar la página
     */
    cleanup() {
        // Limpiar el intervalo de comprobación
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Crear instancia global
const advancedNotificationSystem = new AdvancedNotificationSystem();

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    advancedNotificationSystem.initialize();
});

// Limpiar recursos al cerrar la página
window.addEventListener('beforeunload', () => {
    advancedNotificationSystem.cleanup();
});