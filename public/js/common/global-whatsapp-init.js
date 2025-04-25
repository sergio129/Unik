/**
 * Script de inicialización global para WhatsApp Chat
 * Este script debe cargarse en todas las páginas para habilitar el chat con proveedores
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        console.log('Usuario no autenticado, no se inicializa WhatsAppChat');
        return;
    }
    
    // Registrar la función de actualización global para badges
    window.updateWhatsAppChatBadge = function(count) {
        const badge = document.getElementById('whatsapp-chat-global-badge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = count > 99 ? '99+' : count;
                
                // Añadir animación de pulso
                badge.classList.add('badge-pulse');
                setTimeout(() => {
                    badge.classList.remove('badge-pulse');
                }, 2000);
            } else {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        }
    };
    
    // Crear función para cargar un script dinámicamente
    function loadScript(url, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        
        script.onload = function() {
            if (callback) callback();
        };
        
        document.head.appendChild(script);
    }
    
    // Verificar si Socket.IO ya está cargado
    if (typeof io === 'undefined') {
        // Cargar Socket.IO primero
        loadScript('https://cdn.socket.io/4.6.0/socket.io.min.js', () => {
            // Después cargar WhatsApp Chat
            loadScript('/js/common/whatsapp-chat.js');
        });
    } else {
        // Socket.IO ya está cargado, solo cargamos WhatsApp Chat
        loadScript('/js/common/whatsapp-chat.js');
    }
});