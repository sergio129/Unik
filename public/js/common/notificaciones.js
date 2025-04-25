/**
 * Sistema de Notificaciones Avanzado
 * Módulo para gestionar las notificaciones en tiempo real
 */

// Inicializar el sistema de notificaciones
const notificacionesSystem = {
    socket: null,
    contadorNotificaciones: 0,
    notificaciones: [],
    inicializado: false,
    audioNotificacion: new Audio('/sounds/notification.mp3'),
    
    /**
     * Inicializar el sistema de notificaciones
     */
    init: function() {
        if (this.inicializado) return;
        
        // Crear contenedor principal de notificaciones si no existe
        this.crearContenedorNotificaciones();
        
        // Inicializar socket para notificaciones en tiempo real
        this.initSocket();
        
        // Cargar notificaciones iniciales
        this.cargarNotificaciones();
        
        // Marcar como inicializado
        this.inicializado = true;
        
        console.log('Sistema de notificaciones inicializado');
    },
    
    /**
     * Crear el contenedor de notificaciones en el DOM
     */
    crearContenedorNotificaciones: function() {
        // Verificar si el contenedor ya existe
        if (document.getElementById('notificaciones-container')) return;
        
        // Crear icono de notificación para la barra superior
        const navbarEnd = document.querySelector('.navbar-end');
        
        if (navbarEnd) {
            // Crear elemento de notificación en la navbar
            const notifItem = document.createElement('div');
            notifItem.className = 'navbar-item';
            notifItem.innerHTML = `
                <div class="dropdown is-right" id="dropdown-notificaciones">
                    <div class="dropdown-trigger">
                        <button class="button is-white" aria-haspopup="true" aria-controls="dropdown-menu-notificaciones">
                            <span class="icon is-small">
                                <i class="fas fa-bell"></i>
                            </span>
                            <span class="badge is-danger is-hidden" id="contador-notificaciones">0</span>
                        </button>
                    </div>
                    <div class="dropdown-menu" id="dropdown-menu-notificaciones" role="menu">
                        <div class="dropdown-content">
                            <div class="dropdown-item">
                                <div class="is-flex is-justify-content-space-between">
                                    <h3 class="is-size-6 has-text-weight-bold">Notificaciones</h3>
                                    <a class="is-size-7 has-text-link" id="marcar-todas-leidas">Marcar todas como leídas</a>
                                </div>
                            </div>
                            <hr class="dropdown-divider">
                            <div id="lista-notificaciones" class="notification-list">
                                <div class="dropdown-item has-text-centered">
                                    <p>No tienes notificaciones</p>
                                </div>
                            </div>
                            <hr class="dropdown-divider">
                            <div class="dropdown-item has-text-centered">
                                <a class="button is-small is-link is-light" href="/notificaciones">
                                    Ver todas las notificaciones
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            navbarEnd.prepend(notifItem);
            
            // Agregar listener para abrir/cerrar el dropdown
            const dropdownTrigger = document.querySelector('#dropdown-notificaciones .dropdown-trigger');
            dropdownTrigger.addEventListener('click', () => {
                const dropdown = document.getElementById('dropdown-notificaciones');
                dropdown.classList.toggle('is-active');
                
                // Si se abre el dropdown, marcar notificaciones como vistas
                if (dropdown.classList.contains('is-active')) {
                    this.marcarNotificacionesComoVistas();
                }
            });
            
            // Manejar clic en "Marcar todas como leídas"
            document.getElementById('marcar-todas-leidas').addEventListener('click', (e) => {
                e.preventDefault();
                this.marcarTodasComoLeidas();
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('dropdown-notificaciones');
                if (dropdown && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('is-active');
                }
            });
            
            // Agregar estilos CSS personalizados
            this.agregarEstilosCSS();
        }
    },
    
    /**
     * Agregar estilos CSS al documento
     */
    agregarEstilosCSS: function() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-list {
                max-height: 300px;
                overflow-y: auto;
            }
            .notification-item {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
            }
            .notification-item:hover {
                background-color: #f9f9f9;
            }
            .notification-item.no-leida {
                background-color: #f0f8ff;
            }
            .notification-item .notification-time {
                font-size: 0.7rem;
                color: #888;
            }
            .notification-item .notification-title {
                font-weight: bold;
                margin-bottom: 4px;
            }
            .notification-item .notification-message {
                font-size: 0.9rem;
                color: #333;
            }
            .badge {
                position: absolute;
                top: 0;
                right: 0;
                transform: translate(20%, -20%);
                background-color: #f14668;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .badge.is-hidden {
                display: none;
            }
            #dropdown-notificaciones .button {
                position: relative;
            }
            .notification-item .notification-tipo {
                margin-right: 10px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .notification-item .notification-tipo.info {
                background-color: #3298dc;
                color: white;
            }
            .notification-item .notification-tipo.warning {
                background-color: #ffdd57;
                color: rgba(0, 0, 0, 0.7);
            }
            .notification-item .notification-tipo.success {
                background-color: #48c774;
                color: white;
            }
            .notification-item .notification-tipo.error {
                background-color: #f14668;
                color: white;
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Inicializar la conexión de Socket.IO
     */
    initSocket: function() {
        // Verificar si Socket.IO está disponible
        if (typeof io === 'undefined') {
            console.error('Socket.IO no está disponible, las notificaciones en tiempo real no funcionarán');
            return;
        }
        
        try {
            // Conectar al servidor Socket.IO
            this.socket = io();
            
            // Obtener información del usuario del localStorage
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = userData.id;
            
            if (userId) {
                // Unirse a la sala específica del usuario
                this.socket.emit('join_room', `usuario_${userId}`);
                
                // Manejar evento de nueva notificación
                this.socket.on('nueva_notificacion', (data) => {
                    this.procesarNuevaNotificacion(data.notificacion);
                });
                
                // Manejar evento de actualización de contador
                this.socket.on('actualizacion_conteo_notificaciones', (data) => {
                    this.actualizarContador(data.conteo);
                });
            }
        } catch (error) {
            console.error('Error al inicializar Socket.IO:', error);
        }
    },
    
    /**
     * Cargar notificaciones desde el servidor
     */
    cargarNotificaciones: function() {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        fetch('/api/notificaciones/no-leidas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                this.notificaciones = data.data;
                this.actualizarContador(data.data.length);
                this.renderizarNotificaciones(data.data);
            }
        })
        .catch(error => {
            console.error('Error al cargar notificaciones:', error);
        });
        
        // Cargar conteo de notificaciones
        fetch('/api/notificaciones/conteo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.actualizarContador(data.data.total || 0);
            }
        })
        .catch(error => {
            console.error('Error al cargar conteo de notificaciones:', error);
        });
    },
    
    /**
     * Procesar una nueva notificación recibida
     */
    procesarNuevaNotificacion: function(notificacion) {
        // Añadir la notificación al inicio del array
        this.notificaciones.unshift(notificacion);
        
        // Limitar el número de notificaciones en memoria
        if (this.notificaciones.length > 20) {
            this.notificaciones.pop();
        }
        
        // Actualizar contador y UI
        this.contadorNotificaciones++;
        this.actualizarContador(this.contadorNotificaciones);
        this.renderizarNotificaciones(this.notificaciones);
        
        // Reproducir sonido de notificación
        this.playNotificationSound();
        
        // Mostrar notificación del navegador si está habilitado
        this.mostrarNotificacionNavegador(notificacion);
    },
    
    /**
     * Actualizar contador de notificaciones
     */
    actualizarContador: function(cantidad) {
        const contador = document.getElementById('contador-notificaciones');
        if (!contador) return;
        
        this.contadorNotificaciones = cantidad;
        
        if (cantidad > 0) {
            contador.textContent = cantidad > 99 ? '99+' : cantidad;
            contador.classList.remove('is-hidden');
        } else {
            contador.textContent = '0';
            contador.classList.add('is-hidden');
        }
    },
    
    /**
     * Renderizar lista de notificaciones
     */
    renderizarNotificaciones: function(notificaciones) {
        const listaNotificaciones = document.getElementById('lista-notificaciones');
        if (!listaNotificaciones) return;
        
        if (!notificaciones || notificaciones.length === 0) {
            listaNotificaciones.innerHTML = `
                <div class="dropdown-item has-text-centered">
                    <p>No tienes notificaciones</p>
                </div>
            `;
            return;
        }
        
        listaNotificaciones.innerHTML = notificaciones.map(notif => {
            const fecha = new Date(notif.created_at);
            const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const fechaFormateada = fecha.toLocaleDateString();
            const esHoy = this.esFechaHoy(fecha);
            const fechaTexto = esHoy ? `Hoy ${horaFormateada}` : `${fechaFormateada} ${horaFormateada}`;
            
            // Determinar el ícono según el tipo de notificación
            let icono = 'info-circle';
            switch (notif.tipo) {
                case 'warning': icono = 'exclamation-triangle'; break;
                case 'success': icono = 'check-circle'; break;
                case 'error': icono = 'times-circle'; break;
            }
            
            // Determinar la clase si es una notificación no leída
            const noLeidaClass = notif.leida ? '' : 'no-leida';
            
            return `
                <div class="dropdown-item notification-item ${noLeidaClass}" data-id="${notif.id}">
                    <div class="is-flex">
                        <span class="notification-tipo ${notif.tipo}">
                            <i class="fas fa-${icono} fa-sm"></i>
                        </span>
                        <div style="flex: 1;">
                            <div class="notification-title">${notif.titulo}</div>
                            <div class="notification-message">${notif.mensaje}</div>
                            <div class="notification-time">${fechaTexto}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Añadir evento click a cada notificación
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const id = item.dataset.id;
                if (id) {
                    this.marcarComoLeida(id);
                    this.manejarClicNotificacion(id);
                }
            });
        });
    },
    
    /**
     * Verificar si una fecha es hoy
     */
    esFechaHoy: function(fecha) {
        const hoy = new Date();
        return fecha.getDate() === hoy.getDate() &&
               fecha.getMonth() === hoy.getMonth() &&
               fecha.getFullYear() === hoy.getFullYear();
    },
    
    /**
     * Marcar todas las notificaciones como leídas
     */
    marcarTodasComoLeidas: function() {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        fetch('/api/notificaciones/marcar-todas-leidas', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar conteo y UI
                this.actualizarContador(0);
                
                // Actualizar estado de las notificaciones en memoria
                this.notificaciones.forEach(notif => {
                    notif.leida = true;
                    notif.vista = true;
                });
                
                this.renderizarNotificaciones(this.notificaciones);
            }
        })
        .catch(error => {
            console.error('Error al marcar todas como leídas:', error);
        });
    },
    
    /**
     * Marcar una notificación específica como leída
     */
    marcarComoLeida: function(id) {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        fetch(`/api/notificaciones/${id}/marcar-leida`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar estado de la notificación en memoria
                const notif = this.notificaciones.find(n => n.id == id);
                if (notif && !notif.leida) {
                    notif.leida = true;
                    this.contadorNotificaciones--;
                    this.actualizarContador(this.contadorNotificaciones);
                    this.renderizarNotificaciones(this.notificaciones);
                }
            }
        })
        .catch(error => {
            console.error('Error al marcar como leída:', error);
        });
    },
    
    /**
     * Marcar las notificaciones como vistas (cuando se abre el dropdown)
     */
    marcarNotificacionesComoVistas: function() {
        // Solo procesamos notificaciones no vistas
        const notificacionesNoVistas = this.notificaciones.filter(n => !n.vista);
        if (notificacionesNoVistas.length === 0) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Por cada notificación no vista, hacer petición para marcarla como vista
        notificacionesNoVistas.forEach(notif => {
            fetch(`/api/notificaciones/${notif.id}/marcar-vista`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Actualizar estado en memoria
                    notif.vista = true;
                }
            })
            .catch(error => {
                console.error('Error al marcar como vista:', error);
            });
        });
    },
    
    /**
     * Manejar clic en una notificación según su tipo
     */
    manejarClicNotificacion: function(id) {
        const notificacion = this.notificaciones.find(n => n.id == id);
        if (!notificacion) return;
        
        // Cerrar el dropdown
        document.getElementById('dropdown-notificaciones').classList.remove('is-active');
        
        // Según el tipo de entidad, redirigir o mostrar información
        if (notificacion.entidad_tipo === 'pedido' && notificacion.entidad_id) {
            // Redirigir a la vista detalle del pedido
            window.location.href = `/pedidos/detalle.html?id=${notificacion.entidad_id}`;
        }
        // Se pueden agregar más tipos de redirecciones según los tipos de entidades
    },
    
    /**
     * Reproducir sonido de notificación
     */
    playNotificationSound: function() {
        try {
            this.audioNotificacion.volume = 0.5; // Volumen al 50%
            this.audioNotificacion.play();
        } catch (error) {
            console.error('Error al reproducir sonido de notificación:', error);
        }
    },
    
    /**
     * Mostrar notificación nativa del navegador
     */
    mostrarNotificacionNavegador: function(notificacion) {
        // Verificar si las notificaciones están disponibles y permitidas
        if (!("Notification" in window)) {
            return;
        }
        
        // Si no se han concedido permisos, no hacer nada
        if (Notification.permission !== "granted") {
            return;
        }
        
        try {
            // Crear y mostrar la notificación
            const notification = new Notification('La UNIKa', {
                body: notificacion.mensaje,
                icon: '/images/logo.png'
            });
            
            // Al hacer clic en la notificación del navegador
            notification.onclick = function() {
                window.focus();
                this.close();
            };
            
            // Cerrar automáticamente después de 5 segundos
            setTimeout(() => {
                notification.close();
            }, 5000);
        } catch (error) {
            console.error('Error al mostrar notificación del navegador:', error);
        }
    },
    
    /**
     * Solicitar permiso para mostrar notificaciones del navegador
     */
    solicitarPermisoNotificaciones: function() {
        if (!("Notification" in window)) {
            console.log("Este navegador no soporta notificaciones de escritorio");
            return;
        }
        
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
};

// Inicializar el sistema de notificaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solicitar permiso para notificaciones
    notificacionesSystem.solicitarPermisoNotificaciones();
    
    // Iniciar el sistema de notificaciones
    setTimeout(() => {
        notificacionesSystem.init();
    }, 1000); // Pequeño retraso para asegurar que el DOM esté completamente cargado
});

// Exportar para uso en otros módulos
window.notificacionesSystem = notificacionesSystem;