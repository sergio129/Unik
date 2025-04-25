/**
 * Módulo de notificaciones
 * Permite mostrar notificaciones de diferentes tipos en la interfaz
 */

/**
 * Muestra una notificación en pantalla
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación: success, error, warning, info
 * @param {number} duration - Duración en milisegundos (default: 3000ms)
 * @param {string} container - ID del contenedor donde mostrar la notificación (default: notification-container)
 */
function showNotification(message, type = 'info', duration = 3000, container = 'notification-container') {
    // Verificar si estamos en un modal abierto para mostrar la notificación dentro de él
    let containerElement = document.getElementById(container);
    
    // Si estamos mostrando un modal, crear o usar un contenedor de notificaciones dentro del modal
    const pedidoModalElement = document.getElementById('pedidoModal');
    if (pedidoModalElement && $(pedidoModalElement).is(':visible')) {
        // Si estamos en el modal de pedidos y está visible
        let modalNotifContainer = document.getElementById('modal-notification-container');
        if (!modalNotifContainer) {
            // Crear contenedor de notificaciones para el modal si no existe
            modalNotifContainer = document.createElement('div');
            modalNotifContainer.id = 'modal-notification-container';
            modalNotifContainer.className = 'notification-container';
            modalNotifContainer.style.position = 'absolute';
            modalNotifContainer.style.top = '10px';
            modalNotifContainer.style.right = '10px';
            modalNotifContainer.style.zIndex = '9999';
            
            // Insertar al principio del cuerpo del modal
            const modalBody = pedidoModalElement.querySelector('.modal-body');
            if (modalBody) {
                modalBody.insertBefore(modalNotifContainer, modalBody.firstChild);
            }
        }
        containerElement = modalNotifContainer;
    }
    
    // Si no se encontró ningún contenedor, usar el body
    if (!containerElement) {
        containerElement = document.body;
        if (!containerElement.querySelector('.notification-container')) {
            const newContainer = document.createElement('div');
            newContainer.id = container;
            newContainer.className = 'notification-container';
            containerElement.appendChild(newContainer);
            containerElement = newContainer;
        }
    }
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Icono según tipo
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    // Construir contenido
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
    `;
    
    // Agregar al DOM
    containerElement.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Configurar cierre automático
    const timeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    // Configurar botón de cierre
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        closeNotification(notification);
    });
}

/**
 * Cierra una notificación con animación
 * @param {HTMLElement} notification - Elemento de notificación
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // Eliminar del DOM después de la animación
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 300);
}

/**
 * Reproduce un sonido de notificación (desactivado)
 * @param {string} type - Tipo de sonido: success, error, warning, notification
 */
function playSound(type) {
    // Función intencionalmente vacía para desactivar todos los sonidos
    // No se reproduce ningún sonido para evitar errores
    return;
}