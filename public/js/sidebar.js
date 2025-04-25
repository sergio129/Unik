/**
 * Módulo de gestión del menú lateral
 * Carga y gestiona la visualización del menú lateral según el rol del usuario
 */

/**
 * Carga dinámicamente los elementos del menú lateral según el rol del usuario
 */
function cargarMenuSidebar() {
    const user = getCurrentUser();
    const menuContainer = document.getElementById('menu-sidebar');
    
    if (!menuContainer) {
        console.error('No se encontró el contenedor del menú lateral');
        return;
    }
    
    // Limpiar el menú actual
    menuContainer.innerHTML = '';
    
    // Elementos comunes del menú para todos los usuarios
    const menuItems = [
        {
            text: 'Dashboard',
            icon: 'fas fa-tachometer-alt',
            url: '/dashboard.html',
            active: window.location.pathname === '/dashboard.html'
        },
        {
            text: 'Inventario',
            icon: 'fas fa-boxes',
            url: '/inventario/productos.html',
            active: window.location.pathname.includes('/inventario/')
        },
        {
            text: 'Ventas',
            icon: 'fas fa-shopping-cart',
            url: '/ventas/ventas.html',
            active: window.location.pathname.includes('/ventas/')
        },
        {
            text: 'Pedidos',
            icon: 'fas fa-truck',
            url: '/pedidos/pedidos.html',
            active: window.location.pathname.includes('/pedidos/')
        },
        {
            text: 'Clientes',
            icon: 'fas fa-users',
            url: '/ventas/clientes.html',
            active: window.location.pathname.includes('/clientes')
        }
    ];
    
    // Si el usuario es administrador, agregar opciones de administración
    if (user && (user.rol === 'admin' || user.rol === 'administrador')) {
        menuItems.push({
            text: 'Usuarios',
            icon: 'fas fa-users-cog',
            url: '/admin/usuarios.html',
            active: window.location.pathname.includes('/admin/usuarios')
        });
        
        menuItems.push({
            text: 'Configuración',
            icon: 'fas fa-cogs',
            url: '/admin/configuracion.html',
            active: window.location.pathname.includes('/admin/configuracion')
        });
    }
    
    // Agregar cada elemento al menú
    menuItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';
        
        const link = document.createElement('a');
        link.href = item.url;
        link.className = `nav-link ${item.active ? 'active' : ''}`;
        
        link.innerHTML = `
            <i class="${item.icon} mr-2"></i>
            <span>${item.text}</span>
        `;
        
        listItem.appendChild(link);
        menuContainer.appendChild(listItem);
    });
    
    // Añadir botón de Chat con Proveedores (visible para todos los usuarios)
    const chatItem = document.createElement('li');
    chatItem.className = 'nav-item mt-3';
    
    const chatButton = document.createElement('button');
    chatButton.id = 'sidebar-whatsapp-chat';
    chatButton.className = 'nav-link btn btn-success text-white w-100 d-flex align-items-center';
    chatButton.innerHTML = `
        <i class="fab fa-whatsapp mr-2"></i>
        <span>Chat con Proveedores</span>
        <span id="whatsapp-chat-global-badge" class="ml-auto badge badge-light badge-pill" style="display: none;">0</span>
    `;
    
    // Evento click para mostrar el chat
    chatButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.WhatsAppChat) {
            window.WhatsAppChat.showChat();
            window.WhatsAppChat.maximizeChat();
            
            // Actualizar contador de notificaciones
            document.getElementById('whatsapp-chat-global-badge').style.display = 'none';
            document.getElementById('whatsapp-chat-global-badge').textContent = '0';
        } else {
            console.error('El módulo WhatsAppChat no está disponible');
            alert('Error: El módulo de chat no está cargado correctamente.');
        }
    });
    
    chatItem.appendChild(chatButton);
    menuContainer.appendChild(chatItem);
    
    // Agregar ítem de cerrar sesión al final
    const logoutItem = document.createElement('li');
    logoutItem.className = 'nav-item mt-4';
    
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.id = 'sidebar-logout';
    logoutLink.className = 'nav-link text-danger';
    logoutLink.innerHTML = `
        <i class="fas fa-sign-out-alt mr-2"></i>
        <span>Cerrar Sesión</span>
    `;
    
    // Agregar evento para el cierre de sesión
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    logoutItem.appendChild(logoutLink);
    menuContainer.appendChild(logoutItem);
}

/**
 * Actualiza el contador de notificaciones del chat en el sidebar
 * @param {number} count - Número de mensajes sin leer
 */
function updateWhatsAppChatBadge(count) {
    const badge = document.getElementById('whatsapp-chat-global-badge');
    if (badge) {
        if (count > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = count > 99 ? '99+' : count;
            
            // Hacer que destelle
            badge.classList.add('badge-pulse');
            setTimeout(() => {
                badge.classList.remove('badge-pulse');
            }, 2000);
        } else {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    }
}

// Cuando el documento está listo, inicializar eventos para el sidebar en móvil
document.addEventListener('DOMContentLoaded', function() {
    // Toggle del sidebar en dispositivos móviles
    const sidebarToggle = document.querySelector('.navbar-toggler');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('body').classList.toggle('sidebar-open');
        });
    }
    
    // Añadir estilos para la animación del badge
    const style = document.createElement('style');
    style.textContent = `
        @keyframes badgePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        .badge-pulse {
            animation: badgePulse 0.5s 2;
        }
    `;
    document.head.appendChild(style);
});