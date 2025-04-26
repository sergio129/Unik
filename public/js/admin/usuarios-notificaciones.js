/**
 * usuarios-notificaciones.js
 * Sistema de notificaciones en tiempo real para el módulo de administración de usuarios
 */

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar sistema de notificaciones
  initNotificationsSystem();
  
  // Cargar notificaciones existentes
  loadNotifications();
  
  // Configurar botón para limpiar notificaciones
  document.getElementById('clear-notifications').addEventListener('click', clearNotifications);
});

/**
 * Inicializa el sistema de notificaciones
 */
function initNotificationsSystem() {
  // Verificar si el navegador soporta Web Sockets
  if (typeof WebSocket === 'undefined') {
    console.warn('Este navegador no soporta WebSockets para notificaciones en tiempo real');
    return;
  }
  
  // Intentar conectar con el servidor de WebSocket (exponemos una variable global)
  try {
    window.notificationsSocket = connectNotificationsSocket();
  } catch (error) {
    console.error('Error al conectar con el servidor de notificaciones:', error);
  }
}

/**
 * Establece conexión con el servidor de WebSocket para notificaciones
 */
function connectNotificationsSocket() {
  // Construir URL del WebSocket (usando HTTPS si la página está en HTTPS)
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/notificaciones`;
  
  // Crear conexión
  const socket = new WebSocket(wsUrl);
  
  // Configurar handlers
  socket.onopen = () => {
    console.log('Conectado al servidor de notificaciones');
    
    // Autenticarse con el token del usuario
    const token = localStorage.getItem('token');
    if (token) {
      socket.send(JSON.stringify({ 
        type: 'auth',
        token: token
      }));
    }
  };
  
  socket.onmessage = (event) => {
    try {
      const notification = JSON.parse(event.data);
      
      // Si es relacionada con usuarios, mostrarla
      if (notification.module === 'users') {
        handleRealTimeNotification(notification);
      }
    } catch (error) {
      console.error('Error al procesar notificación:', error);
    }
  };
  
  socket.onclose = (event) => {
    console.log('Desconectado del servidor de notificaciones:', event.code, event.reason);
    
    // Reconectar después de 5 segundos
    setTimeout(() => {
      console.log('Intentando reconectar al servidor de notificaciones...');
      window.notificationsSocket = connectNotificationsSocket();
    }, 5000);
  };
  
  socket.onerror = (error) => {
    console.error('Error en la conexión de notificaciones:', error);
  };
  
  return socket;
}

/**
 * Carga las notificaciones anteriores desde el servidor
 */
async function loadNotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch('/api/notificaciones/usuarios', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar notificaciones');
    }
    
    const usuarios = await response.json();
    
    // Verificar si la respuesta es un array (formato correcto)
    if (Array.isArray(usuarios) && usuarios.length > 0) {
      // Renderizar las notificaciones de usuarios
      renderUserNotifications(usuarios);
    } else if (usuarios.success && usuarios.data) {
      // Formato antiguo por compatibilidad
      renderUserNotifications(usuarios.data);
    } else {
      // No hay datos o formato incorrecto
      showEmptyNotifications('No hay notificaciones disponibles');
    }
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
    showEmptyNotifications('No se pudieron cargar las notificaciones');
  }
}

/**
 * Renderiza la lista de notificaciones
 */
function renderNotifications(notifications) {
  const container = document.getElementById('notifications-container');
  
  // Si no hay notificaciones, mostrar mensaje
  if (!notifications || notifications.length === 0) {
    showEmptyNotifications();
    return;
  }
  
  // Ordenar por fecha (más recientes primero)
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Limitar a 10 notificaciones
  const recentNotifications = notifications.slice(0, 10);
  
  // Crear HTML para cada notificación
  container.innerHTML = recentNotifications.map(notification => `
    <div class="notification ${notification.read ? 'read' : ''}" data-id="${notification.id}">
      <div class="notification-icon ${getNotificationIconClass(notification.type)}">
        <i class="${getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${formatTimeAgo(notification.createdAt)}</div>
      </div>
      <div class="notification-actions">
        <button class="btn-mark-read" title="Marcar como leída" onclick="markAsRead('${notification.id}')">
          <i class="fas fa-check"></i>
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Renderiza las notificaciones de usuarios con estadísticas
 */
function renderUserNotifications(usuarios) {
  const container = document.getElementById('notifications-container');
  
  // Si no hay usuarios, mostrar mensaje
  if (!usuarios || usuarios.length === 0) {
    showEmptyNotifications('No hay usuarios con notificaciones');
    return;
  }
  
  // Ordenar usuarios por número de notificaciones no leídas (descendente)
  usuarios.sort((a, b) => b.notificaciones_no_leidas - a.notificaciones_no_leidas);
  
  // Crear HTML para cada usuario con sus notificaciones
  container.innerHTML = usuarios.map(usuario => {
    // Determinar clase según número de notificaciones no leídas
    let statusClass = 'info';
    if (usuario.notificaciones_no_leidas > 5) {
      statusClass = 'danger';
    } else if (usuario.notificaciones_no_leidas > 0) {
      statusClass = 'warning';
    }
    
    return `
      <div class="notification-user-item" data-id="${usuario.id}" onclick="viewUserNotifications(${usuario.id}, '${usuario.nombre_completo || usuario.username}')">
        <div class="notification-icon ${statusClass}">
          <i class="fas fa-user"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${usuario.nombre_completo || usuario.username}</div>
          <div class="notification-stats">
            <span class="badge ${usuario.notificaciones_no_leidas > 0 ? 'badge-danger' : 'badge-secondary'}">
              ${usuario.notificaciones_no_leidas} pendientes
            </span>
            <span class="badge badge-light">
              ${usuario.total_notificaciones} total
            </span>
          </div>
        </div>
        <div class="notification-role ${getRoleClass(usuario.rol)}">
          ${getRoleName(usuario.rol)}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Ver todas las notificaciones de un usuario específico
 */
async function viewUserNotifications(usuarioId, nombreUsuario) {
  try {
    // Actualizar título del modal
    document.getElementById('notifications-modal-title').textContent = `Notificaciones de ${nombreUsuario}`;
    
    // Mostrar modal con estado de carga
    document.getElementById('user-notifications-container').innerHTML = `
      <div class="loading-notifications">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando notificaciones...</p>
      </div>
    `;
    
    openModal('notifications-modal');
    
    // Cargar notificaciones del usuario
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No se ha iniciado sesión');
    }
    
    const response = await fetch(`/api/notificaciones/usuarios/${usuarioId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar notificaciones del usuario');
    }
    
    const data = await response.json();
    
    // Actualizar contador de estadísticas
    document.getElementById('notifications-total').textContent = data.notificaciones.length;
    document.getElementById('notifications-unread').textContent = 
      data.notificaciones.filter(n => !n.leida).length;
    
    // Configurar botón de marcar todas como leídas
    const btnMarkAllRead = document.getElementById('btn-mark-all-read');
    btnMarkAllRead.onclick = () => markAllUserNotificationsAsRead(usuarioId);
    
    // Renderizar notificaciones
    renderUserNotificationsList(data.notificaciones);
    
  } catch (error) {
    console.error('Error al cargar notificaciones del usuario:', error);
    document.getElementById('user-notifications-container').innerHTML = `
      <div class="empty-notifications">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error al cargar notificaciones: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Renderiza la lista de notificaciones de un usuario
 */
function renderUserNotificationsList(notificaciones) {
  const container = document.getElementById('user-notifications-container');
  
  // Si no hay notificaciones, mostrar mensaje vacío
  if (!notificaciones || notificaciones.length === 0) {
    container.innerHTML = `
      <div class="empty-notifications">
        <i class="fas fa-bell-slash"></i>
        <p>Este usuario no tiene notificaciones</p>
      </div>
    `;
    return;
  }
  
  // Ordenar notificaciones por fecha (más recientes primero)
  notificaciones.sort((a, b) => 
    new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  
  // Crear HTML para cada notificación
  container.innerHTML = notificaciones.map(notificacion => {
    const isUnread = !notificacion.leida;
    const notifDate = new Date(notificacion.created_at || notificacion.createdAt);
    
    return `
      <div class="user-notification-item ${isUnread ? 'unread' : ''}">
        ${isUnread ? '<span class="notification-unread-badge"></span>' : ''}
        <div class="notification-header">
          <span class="notification-title">${notificacion.titulo}</span>
          <span class="notification-time">${formatTimeAgo(notifDate)}</span>
        </div>
        <div class="notification-content">
          ${notificacion.mensaje}
        </div>
        <div class="notification-footer">
          <span class="notification-metadata">
            <i class="fas fa-tag"></i> ${notificacion.tipo || 'info'}
            ${notificacion.entidad_tipo ? 
              `<span class="notification-entity"><i class="fas fa-link"></i> ${notificacion.entidad_tipo} #${notificacion.entidad_id}</span>` : 
              ''}
          </span>
          <div class="notification-buttons">
            ${isUnread ? 
              `<button class="small" onclick="markNotificationAsRead(${notificacion.id})">
                <i class="fas fa-check"></i> Marcar como leída
              </button>` : 
              ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Marca una notificación individual como leída
 */
async function markNotificationAsRead(notificationId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch(`/api/notificaciones/${notificationId}/marcar-leida`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al marcar notificación como leída');
    }
    
    // Actualizar UI
    const notificationElement = document.querySelector(`.user-notification-item:has(button[onclick*="${notificationId}"])`);
    if (notificationElement) {
      notificationElement.classList.remove('unread');
      const badge = notificationElement.querySelector('.notification-unread-badge');
      if (badge) badge.remove();
      
      const button = notificationElement.querySelector('.notification-buttons');
      if (button) button.innerHTML = '';
      
      // Actualizar contador
      const unreadCount = document.getElementById('notifications-unread');
      const currentCount = parseInt(unreadCount.textContent);
      if (currentCount > 0) {
        unreadCount.textContent = currentCount - 1;
      }
    }
    
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
  }
}

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
async function markAllUserNotificationsAsRead(usuarioId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Por ahora usamos la ruta general, pero idealmente necesitaríamos una específica para un usuario
    const response = await fetch(`/api/notificaciones/marcar-todas-leidas`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario_id: usuarioId })
    });
    
    if (!response.ok) {
      throw new Error('Error al marcar notificaciones como leídas');
    }
    
    // Actualizar UI: todas las notificaciones ya no están sin leer
    const notificationItems = document.querySelectorAll('.user-notification-item.unread');
    notificationItems.forEach(item => {
      item.classList.remove('unread');
      const badge = item.querySelector('.notification-unread-badge');
      if (badge) badge.remove();
      
      const button = item.querySelector('.notification-buttons');
      if (button) button.innerHTML = '';
    });
    
    // Actualizar contador
    document.getElementById('notifications-unread').textContent = '0';
    
    // Mostrar mensaje de éxito
    showToastNotification({
      message: 'Todas las notificaciones han sido marcadas como leídas',
      type: 'success',
      important: true
    });
    
    // Recargar datos después de un breve retraso
    setTimeout(() => {
      loadNotifications();
    }, 1000);
    
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    showToastNotification({
      message: 'Error al marcar notificaciones como leídas',
      type: 'error',
      important: true
    });
  }
}

/**
 * Obtiene el nombre legible de un rol
 */
function getRoleName(rol) {
  const roles = {
    'admin': 'Administrador',
    'vendedor': 'Vendedor',
    'inventario': 'Inventario'
  };
  
  return roles[rol] || rol;
}

/**
 * Obtiene la clase CSS para un rol
 */
function getRoleClass(rol) {
  const classes = {
    'admin': 'role-admin',
    'vendedor': 'role-vendedor',
    'inventario': 'role-inventario'
  };
  
  return classes[rol] || '';
}

/**
 * Muestra mensaje cuando no hay notificaciones
 */
function showEmptyNotifications(message = 'No hay notificaciones recientes') {
  const container = document.getElementById('notifications-container');
  
  container.innerHTML = `
    <div class="empty-notifications">
      <i class="fas fa-bell-slash"></i>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Maneja una notificación en tiempo real
 */
function handleRealTimeNotification(notification) {
  // Reproducir sonido de notificación
  playNotificationSound(notification.type);
  
  // Añadir la notificación al contenedor
  addNotificationToContainer(notification);
  
  // Mostrar notificación toast si es relevante
  if (notification.important) {
    showToastNotification(notification);
  }
  
  // Si la notificación requiere refresco de datos
  if (notification.requiresRefresh) {
    // Recargar datos relevantes
    if (notification.type === 'user_created' || 
        notification.type === 'user_updated' || 
        notification.type === 'user_deleted') {
      loadUsers(); // Función existente en usuarios.js
      loadUserStatistics(); // Función del nuevo dashboard
      loadUserCharts(); // Función del nuevo dashboard
    }
  }
}

/**
 * Añade una nueva notificación al contenedor
 */
function addNotificationToContainer(notification) {
  const container = document.getElementById('notifications-container');
  const emptyMessage = container.querySelector('.empty-notifications');
  
  // Si hay un mensaje de "no hay notificaciones", eliminarlo
  if (emptyMessage) {
    container.innerHTML = '';
  }
  
  // Crear elemento para la nueva notificación
  const newNotification = document.createElement('div');
  newNotification.className = `notification ${notification.read ? 'read' : ''}`;
  newNotification.dataset.id = notification.id;
  
  // Crear contenido HTML
  newNotification.innerHTML = `
    <div class="notification-icon ${getNotificationIconClass(notification.type)}">
      <i class="${getNotificationIcon(notification.type)}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-message">${notification.message}</div>
      <div class="notification-time">Justo ahora</div>
    </div>
    <div class="notification-actions">
      <button class="btn-mark-read" title="Marcar como leída" onclick="markAsRead('${notification.id}')">
        <i class="fas fa-check"></i>
      </button>
    </div>
  `;
  
  // Añadir al inicio del contenedor con animación
  container.insertBefore(newNotification, container.firstChild);
  
  // Añadir clase para animar entrada
  setTimeout(() => {
    newNotification.classList.add('show');
  }, 10);
  
  // Remover notificaciones más antiguas si hay más de 10
  const notifications = container.querySelectorAll('.notification');
  if (notifications.length > 10) {
    for (let i = 10; i < notifications.length; i++) {
      container.removeChild(notifications[i]);
    }
  }
}

/**
 * Reproduce un sonido según el tipo de notificación
 */
function playNotificationSound(type) {
  let soundFile;
  
  switch (type) {
    case 'user_deleted':
      soundFile = '/sounds/warning.mp3';
      break;
    case 'error':
      soundFile = '/sounds/error.mp3';
      break;
    case 'user_created':
      soundFile = '/sounds/success.mp3';
      break;
    default:
      soundFile = '/sounds/notification.mp3';
  }
  
  // Crear elemento de audio y reproducir
  const audio = new Audio(soundFile);
  audio.volume = 0.5; // Volumen al 50%
  
  // Intentar reproducir (puede fallar si el usuario no ha interactuado con la página)
  audio.play().catch(e => {
    console.log('No se pudo reproducir sonido de notificación:', e);
  });
}

/**
 * Muestra una notificación toast flotante
 */
function showToastNotification(notification) {
  // Crear el toast
  const toast = document.createElement('div');
  toast.className = `toast toast-notification toast-${notification.type}`;
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${getNotificationIcon(notification.type)}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${getNotificationTitle(notification.type)}</div>
      <div class="toast-message">${notification.message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  // Añadir al DOM
  document.body.appendChild(toast);
  
  // Mostrar con animación
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Configurar botón de cerrar
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  });
  
  // Quitar después de 5 segundos
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }
  }, 5000);
}

/**
 * Obtiene el título para una notificación según su tipo
 */
function getNotificationTitle(type) {
  const titles = {
    'user_created': 'Nuevo Usuario',
    'user_updated': 'Usuario Actualizado',
    'user_deleted': 'Usuario Eliminado',
    'user_login': 'Inicio de Sesión',
    'error': 'Error',
    'warning': 'Advertencia',
    'info': 'Información'
  };
  
  return titles[type] || 'Notificación';
}

/**
 * Obtiene la clase CSS para el icono según tipo de notificación
 */
function getNotificationIconClass(type) {
  const classes = {
    'user_created': 'success',
    'user_updated': 'info',
    'user_deleted': 'danger',
    'user_login': 'primary',
    'error': 'danger',
    'warning': 'warning',
    'info': 'info'
  };
  
  return classes[type] || 'info';
}

/**
 * Obtiene el icono según tipo de notificación
 */
function getNotificationIcon(type) {
  const icons = {
    'user_created': 'fas fa-user-plus',
    'user_updated': 'fas fa-user-edit',
    'user_deleted': 'fas fa-user-minus',
    'user_login': 'fas fa-sign-in-alt',
    'error': 'fas fa-exclamation-circle',
    'warning': 'fas fa-exclamation-triangle',
    'info': 'fas fa-info-circle'
  };
  
  return icons[type] || 'fas fa-bell';
}

/**
 * Formatea tiempo relativo (ej: "hace 5 minutos")
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);
  
  if (diffSeconds < 60) {
    return 'Justo ahora';
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }
  
  // Para fechas más antiguas, mostrar fecha formateada
  return date.toLocaleDateString();
}

/**
 * Marca una notificación como leída
 */
async function markAsRead(notificationId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch(`/api/notificaciones/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al marcar notificación como leída');
    }
    
    // Actualizar UI
    const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
    if (notification) {
      notification.classList.add('read');
    }
    
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
  }
}

/**
 * Limpia todas las notificaciones
 */
async function clearNotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch('/api/notificaciones/usuarios/clear', {
      method: 'DELETE', // Cambio de método a DELETE para coincidir con la ruta
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al limpiar notificaciones');
    }
    
    // Mostrar mensaje de éxito
    showToastNotification({
      message: 'Todas las notificaciones han sido limpiadas',
      type: 'success',
      important: true
    });
    
    // Mostrar mensaje de "no hay notificaciones"
    showEmptyNotifications('No hay notificaciones pendientes');
    
    // Recargar las notificaciones después de un breve retraso
    setTimeout(() => {
      loadNotifications();
    }, 1500);
  } catch (error) {
    console.error('Error al limpiar notificaciones:', error);
    showToastNotification({
      message: 'Error al limpiar notificaciones',
      type: 'error',
      important: true
    });
  }
}

/**
 * Función para abrir un modal
 */
function openModal(modalId) {
  // Cerrar cualquier modal abierto
  const modals = document.querySelectorAll('.modal.active');
  modals.forEach(modal => {
    modal.classList.remove('active');
  });
  
  // Abrir modal específico
  const modal = document.getElementById(modalId);
  const overlay = document.querySelector('.modal-overlay');
  
  if (modal && overlay) {
    modal.classList.add('active');
    overlay.classList.add('active');
    
    // Configurar eventos para cerrar
    setupModalClose(modal, overlay);
  }
}

/**
 * Función para configurar eventos de cierre de modal
 */
function setupModalClose(modal, overlay) {
  // Cerrar al hacer clic en botón de cerrar
  const closeButtons = modal.querySelectorAll('.close-modal');
  closeButtons.forEach(button => {
    button.onclick = () => {
      modal.classList.remove('active');
      overlay.classList.remove('active');
    };
  });
  
  // Cerrar al hacer clic en overlay
  overlay.onclick = () => {
    modal.classList.remove('active');
    overlay.classList.remove('active');
  };
}

// Hacer global la función markAsRead para poder usarla desde eventos onclick
window.markAsRead = markAsRead;

// Hacer globales las funciones necesarias
window.viewUserNotifications = viewUserNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllUserNotificationsAsRead = markAllUserNotificationsAsRead;