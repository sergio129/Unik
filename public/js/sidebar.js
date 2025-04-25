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

// Cuando el documento está listo, inicializar eventos para el sidebar en móvil
document.addEventListener('DOMContentLoaded', function() {
    // Toggle del sidebar en dispositivos móviles
    const sidebarToggle = document.querySelector('.navbar-toggler');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('body').classList.toggle('sidebar-open');
        });
    }
});