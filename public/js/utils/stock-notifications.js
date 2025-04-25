/**
 * Sistema de notificaciones moderno para productos con bajo stock
 * Este componente permite mostrar alertas para productos con stock bajo o agotado
 * con una interfaz moderna e intuitiva
 */

class StockNotificationSystem {
  constructor() {
    this.lowStockProducts = [];
    this.criticalStockProducts = []; // Stock en 0
    this.warningStockProducts = []; // Stock bajo (menos de 5)
    this.notificationContainer = null;
    this.notificationIcon = null;
    this.notificationPanel = null;
    this.notificationBadge = null;
    this.initialized = false;
    this.stockThreshold = 5; // Umbral para stock bajo
  }

  /**
   * Inicializar el sistema de notificaciones
   */
  init() {
    if (this.initialized) return;

    this.createNotificationIcon();
    this.loadLowStockProducts();
    this.setupEventListeners();
    
    // Verificar notificaciones cada 5 minutos
    this.setupAutoRefresh(300000); // 300000 ms = 5 minutos
    
    this.initialized = true;
  }

  /**
   * Crear el icono de notificaciones en el menú con diseño moderno
   */
  createNotificationIcon() {
    // Localizar el contenedor de usuario en el menú
    const userMenu = document.querySelector('.user-menu');
    
    if (!userMenu) {
      console.error('No se encontró el contenedor del menú de usuario');
      return;
    }

    // Crear el contenedor para el icono de notificaciones
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.className = 'notification-container';
    
    // Crear el icono
    this.notificationIcon = document.createElement('div');
    this.notificationIcon.className = 'notification-icon';
    this.notificationIcon.innerHTML = '<i class="fas fa-bell"></i>';
    
    // Crear el badge (insignia con número)
    this.notificationBadge = document.createElement('div');
    this.notificationBadge.className = 'notification-badge';
    this.notificationBadge.style.display = 'none';
    
    // Panel de notificaciones desplegable con diseño mejorado
    this.notificationPanel = document.createElement('div');
    this.notificationPanel.className = 'notification-panel';
    this.notificationPanel.innerHTML = `
      <div class="notification-header">
        <h3 class="notification-title"><i class="fas fa-exclamation-circle"></i> Alertas de Inventario</h3>
        <button class="notification-close" title="Cerrar">&times;</button>
      </div>
      <ul class="notification-list">
        <li class="notification-item">
          <div class="notification-content">
            <div class="notification-indicator"></div>
            <div class="notification-product">
              <p class="notification-product-name">Cargando alertas...</p>
            </div>
          </div>
        </li>
      </ul>
      <div class="notification-footer">
        <a href="/inventario/productos"><i class="fas fa-boxes"></i> Ver todos los productos</a>
      </div>
    `;
    
    // Ensamblar los componentes
    this.notificationIcon.appendChild(this.notificationBadge);
    this.notificationContainer.appendChild(this.notificationIcon);
    this.notificationContainer.appendChild(this.notificationPanel);
    
    // Insertar antes del elemento de usuario
    userMenu.insertBefore(this.notificationContainer, userMenu.firstChild);
  }

  /**
   * Cargar productos con bajo stock desde la API
   */
  loadLowStockProducts() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No hay token de autenticación');
      return;
    }
    
    // Mostrar indicador de carga
    this.updateLoadingState(true);
    
    fetch('/api/productos/bajo-stock', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar productos con bajo stock');
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.data) {
        this.lowStockProducts = data.data;
        
        // Separar productos en críticos (0) y con advertencia (< 5)
        this.criticalStockProducts = this.lowStockProducts.filter(product => product.cantidad == 0);
        this.warningStockProducts = this.lowStockProducts.filter(product => product.cantidad > 0 && product.cantidad < this.stockThreshold);
        
        this.updateNotifications();
      }
    })
    .catch(error => {
      console.error('Error al cargar productos con bajo stock:', error);
      this.showErrorState();
    })
    .finally(() => {
      this.updateLoadingState(false);
    });
  }

  /**
   * Mostrar estado de carga en el panel
   */
  updateLoadingState(isLoading) {
    const notificationList = this.notificationPanel.querySelector('.notification-list');
    
    if (isLoading) {
      notificationList.innerHTML = `
        <li class="notification-item">
          <div class="notification-content" style="justify-content: center; padding: 10px 0;">
            <i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i>
            <div class="notification-product">
              <p class="notification-product-name">Cargando alertas de inventario...</p>
            </div>
          </div>
        </li>
      `;
    }
  }

  /**
   * Mostrar estado de error en el panel
   */
  showErrorState() {
    const notificationList = this.notificationPanel.querySelector('.notification-list');
    
    notificationList.innerHTML = `
      <li class="notification-item">
        <div class="notification-content" style="justify-content: center; padding: 10px 0;">
          <i class="fas fa-exclamation-triangle" style="color: #dc3545; margin-right: 10px;"></i>
          <div class="notification-product">
            <p class="notification-product-name">Error al cargar alertas</p>
            <p style="font-size: 12px; margin-top: 5px;">
              Por favor, inténtelo de nuevo más tarde
            </p>
          </div>
        </div>
      </li>
      <li class="notification-item">
        <div style="text-align: center; padding: 10px 0;">
          <button class="notification-action-button" onclick="window.stockNotifications.refresh()">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        </div>
      </li>
    `;
  }

  /**
   * Actualizar la interfaz de notificaciones con los productos cargados
   */
  updateNotifications() {
    // Total de productos con alertas
    const count = this.lowStockProducts.length;
    
    if (count > 0) {
      // Mostrar el badge con el número
      this.notificationBadge.textContent = count > 99 ? '99+' : count;
      this.notificationBadge.style.display = 'flex';
      
      // Añadir clase para animación del icono
      this.notificationIcon.classList.add('has-alerts');
      
      // Actualizar lista de productos en el panel
      this.updateNotificationList();
    } else {
      // Ocultar el badge si no hay alertas
      this.notificationBadge.style.display = 'none';
      this.notificationIcon.classList.remove('has-alerts');
      
      // Mostrar mensaje de no hay alertas
      const notificationList = this.notificationPanel.querySelector('.notification-list');
      notificationList.innerHTML = `
        <li class="notification-empty">
          <i class="fas fa-check-circle"></i>
          <p>¡No hay productos con bajo stock!</p>
        </li>
      `;
    }
  }

  /**
   * Actualizar la lista de productos en el panel de notificaciones
   */
  updateNotificationList() {
    const notificationList = this.notificationPanel.querySelector('.notification-list');
    let html = '';
    
    // Agregar sección de productos críticos si existen
    if (this.criticalStockProducts.length > 0) {
      html += `
        <li class="notification-item" style="background-color: #fff2f2; pointer-events: none;">
          <div style="font-weight: 600; color: #dc3545; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fas fa-exclamation-circle"></i> Stock agotado (${this.criticalStockProducts.length})
          </div>
        </li>
      `;
      
      this.criticalStockProducts.forEach(product => {
        html += this.createProductNotificationItem(product, true);
      });
    }
    
    // Agregar sección de productos con advertencia si existen
    if (this.warningStockProducts.length > 0) {
      html += `
        <li class="notification-item" style="background-color: #fff9e6; pointer-events: none;">
          <div style="font-weight: 600; color: #d97706; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fas fa-exclamation-triangle"></i> Stock bajo (${this.warningStockProducts.length})
          </div>
        </li>
      `;
      
      this.warningStockProducts.forEach(product => {
        html += this.createProductNotificationItem(product, false);
      });
    }
    
    notificationList.innerHTML = html;
    
    // Añadir eventos click a cada item
    this.setupNotificationItemEvents();
  }
  
  /**
   * Crear el HTML para un item de notificación de producto
   */
  createProductNotificationItem(product, isCritical) {
    const indicatorClass = isCritical ? 'critical' : 'warning';
    const stockClass = isCritical ? 'critical' : 'warning';
    const stockIcon = isCritical ? 'fas fa-times-circle' : 'fas fa-exclamation-triangle';
    
    // Calcular porcentaje del stock mínimo
    let stockPercent = 0;
    if (product.stock_minimo > 0) {
      stockPercent = Math.round((product.cantidad / product.stock_minimo) * 100);
    }
    
    return `
      <li class="notification-item" data-id="${product.codigo}" data-stock="${product.cantidad}">
        <div class="notification-content">
          <div class="notification-indicator ${indicatorClass}"></div>
          <div class="notification-product">
            <p class="notification-product-name">${product.nombre}</p>
            <p class="notification-product-stock ${stockClass}">
              <i class="${stockIcon}"></i>
              <span>${product.cantidad}</span> de ${product.stock_minimo} mínimo (${stockPercent}%)
            </p>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="notification-action-button" data-action="order" data-id="${product.codigo}">
                <i class="fas fa-truck"></i> Ordenar
              </button>
              <button class="notification-action-button" data-action="view" data-id="${product.codigo}">
                <i class="fas fa-eye"></i> Ver detalles
              </button>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  /**
   * Configurar eventos para los items de la lista de notificaciones
   */
  setupNotificationItemEvents() {
    // Botones de acción dentro de las notificaciones
    const actionButtons = this.notificationPanel.querySelectorAll('.notification-action-button');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const action = button.getAttribute('data-action');
        const productId = button.getAttribute('data-id');
        
        if (action === 'order') {
          // Redirigir a la creación de pedido
          window.location.href = `/pedidos/pedidos.html?create=true&product=${productId}`;
        } else if (action === 'view') {
          // Ver detalles del producto
          window.location.href = `/inventario/productos.html?highlight=${productId}`;
        }
      });
    });
    
    // Eventos para los items completos
    const items = this.notificationPanel.querySelectorAll('.notification-item');
    
    items.forEach(item => {
      if (!item.getAttribute('data-id')) return; // Ignorar items de encabezado
      
      item.addEventListener('click', () => {
        const productId = item.getAttribute('data-id');
        if (productId) {
          // Navegar a la página de productos con un parámetro para filtrar
          window.location.href = `/inventario/productos.html?highlight=${productId}`;
        }
      });
    });
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Click en el icono para mostrar/ocultar panel
    this.notificationIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNotificationPanel();
    });
    
    // Botón de cerrar en el panel
    const closeButton = this.notificationPanel.querySelector('.notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideNotificationPanel();
      });
    }
    
    // Cerrar panel al hacer clic fuera de él
    document.addEventListener('click', (e) => {
      if (this.notificationPanel && 
          !this.notificationPanel.contains(e.target) && 
          !this.notificationIcon.contains(e.target)) {
        this.hideNotificationPanel();
      }
    });
  }

  /**
   * Configurar actualización automática de notificaciones
   */
  setupAutoRefresh(interval) {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refresh();
      }
    }, interval);
  }

  /**
   * Mostrar/ocultar el panel de notificaciones
   */
  toggleNotificationPanel() {
    if (this.notificationPanel.classList.contains('show')) {
      this.hideNotificationPanel();
    } else {
      this.showNotificationPanel();
    }
  }

  /**
   * Mostrar el panel de notificaciones
   */
  showNotificationPanel() {
    this.notificationPanel.classList.add('show');
  }

  /**
   * Ocultar el panel de notificaciones
   */
  hideNotificationPanel() {
    this.notificationPanel.classList.remove('show');
  }

  /**
   * Actualizar manualmente los datos de notificaciones
   */
  refresh() {
    this.loadLowStockProducts();
  }
  
  /**
   * Mostrar notificación toast para alertar sobre nuevos productos con stock bajo
   */
  showNewAlertToast(newProductCount) {
    if (!newProductCount) return;
    
    // Verificar si existe el contenedor de toasts, si no crearlo
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Crear el toast
    const toast = document.createElement('div');
    toast.className = 'toast warning';
    toast.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <div class="toast-message">
        ${newProductCount} producto${newProductCount !== 1 ? 's' : ''} con stock bajo
      </div>
      <button class="toast-close">&times;</button>
    `;
    
    // Añadir al contenedor
    toastContainer.appendChild(toast);
    
    // Configurar evento para cerrar el toast
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    });
    
    // Cerrar automáticamente después de 6 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
      }
    }, 6000);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Verificar que el usuario esté autenticado antes de inicializar
  if (localStorage.getItem('token')) {
    window.stockNotifications = new StockNotificationSystem();
    window.stockNotifications.init();
  }
});