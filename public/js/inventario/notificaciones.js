document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar-wrapper');
    const mainContent = document.getElementById('main-content');
    
    // Función para colapsar o expandir el sidebar
    function toggleSidebarState() {
      document.body.classList.toggle('sidebar-expanded');
      document.body.classList.toggle('sidebar-collapsed');
      
      // Guardar preferencia del usuario
      const sidebarState = document.body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded';
      localStorage.setItem('sidebarState', sidebarState);
    }
    
    // Evento para el botón de toggle
    if (toggleSidebar) {
      toggleSidebar.addEventListener('click', function() {
        toggleSidebarState();
      });
    }
    
    // Evento para cerrar el sidebar en dispositivos móviles
    if (closeSidebar) {
      closeSidebar.addEventListener('click', function() {
        document.body.classList.remove('sidebar-expanded');
        document.body.classList.add('sidebar-collapsed');
        localStorage.setItem('sidebarState', 'collapsed');
      });
    }
    
    // Inicializar el estado del sidebar según la preferencia guardada o por defecto
    function initSidebar() {
      const savedState = localStorage.getItem('sidebarState');
      
      if (savedState === 'collapsed') {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-expanded');
      } else {
        // Por defecto en pantallas grandes se muestra el sidebar
        if (window.innerWidth >= 992) {
          document.body.classList.remove('sidebar-collapsed');
        } else {
          // En pantallas pequeñas se oculta por defecto
          document.body.classList.add('sidebar-collapsed');
        }
      }
    }
    
    // Cambiar el estado del sidebar cuando cambia el tamaño de la ventana
    window.addEventListener('resize', function() {
      if (window.innerWidth < 992) {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-expanded');
      }
    });
    
    // Inicializar el sidebar
    initSidebar();
    
    // Implementar comportamiento del logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
          // Eliminar token de sesión
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          // Redirigir al login
          window.location.href = '/login';
        }
      });
    }
  });