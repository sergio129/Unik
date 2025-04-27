document.addEventListener('DOMContentLoaded', function() {
  // Verificar si el usuario está autenticado
  checkAuth();
  
  // Inicializar componentes
  initComponents();
  
  // Cargar datos iniciales
  loadProductos();
  loadCategorias();
  
  // Configurar listeners de eventos
  setupEventListeners();
  
  // Crear el contenedor de toast si no existe
  if (!document.querySelector('.toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Crear el diálogo de confirmación moderno si no existe
  if (!document.querySelector('.confirm-dialog')) {
    createConfirmDialog();
  }

  // Inicializar la búsqueda predictiva mejorada
  setTimeout(initPredictiveSearch, 100);

  // Botón de Chat con Proveedores
  const chatButton = document.getElementById('whatsapp-chat-btn');
  if (chatButton) {
    chatButton.addEventListener('click', function() {
      if (window.WhatsAppChat) {
        window.WhatsAppChat.showChat();
        window.WhatsAppChat.maximizeChat();
        
        // Actualizar contador de notificaciones
        const badge = document.getElementById('whatsapp-chat-global-badge');
        if (badge) {
          badge.style.display = 'none';
          badge.textContent = '0';
        }
      } else {
        console.error('El módulo WhatsAppChat no está disponible');
        showToast('Error', 'No se pudo cargar el módulo de chat', 'error');
      }
    });
  }
});

// Variables globales
let productos = [];
let categorias = [];
let currentPage = 1;
let totalPages = 1;
let productosPorPagina = 10;
let currentProductoId = null;
let showInactiveProducts = false; // Nueva variable para controlar si mostramos los productos desactivados
let inactiveProducts = []; // Nueva variable para almacenar productos desactivados
let importDetails = {
  procesados: [],
  creados: [],
  actualizados: [],
  errores: []
};

// Verificación de autenticación
function checkAuth() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  
  // Mostrar información del usuario
  document.getElementById('user-display').textContent = `${usuario.nombre || 'Usuario'}`;
  
  // Verificar permisos de administrador para ciertas funciones
  if (usuario.rol !== 'admin') {
    // Ocultar elementos que requieren permisos de administrador
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// Inicializar componentes de la interfaz
function initComponents() {
  // Inicializar elementos modales
  const modals = document.querySelectorAll('.modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  const closeButtons = document.querySelectorAll('.close-modal');
  
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modals.forEach(modal => modal.classList.remove('active'));
      modalOverlay.classList.remove('active');
    });
  });
  
  modalOverlay.addEventListener('click', () => {
    modals.forEach(modal => modal.classList.remove('active'));
    modalOverlay.classList.remove('active');
  });
  
  // Inicializar botón de logout
  document.getElementById('btn-logout').addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
  });
}

// Configurar listeners de eventos
function setupEventListeners() {
  // Botón para crear nuevo producto - Corregido el ID
  document.getElementById('btn-new-product').addEventListener('click', () => {
    openProductoModal();
  });
  
  // Form para crear/editar producto
  document.getElementById('producto-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveProducto();
  });
  
  // Botón para cancelar formulario
  document.getElementById('btn-cancel').addEventListener('click', function() {
    closeProductoModal();
  });

  // Botón para cerrar modal de códigos de barras
  document.getElementById('btn-close-codigos-barras').addEventListener('click', function() {
    closeCodigosBarrasModal();
  });

  // Botón para búsqueda por código de barras
  document.getElementById('btn-barcode-search').addEventListener('click', function() {
    showBarcodeSearchModal();
  });
  
  // Formulario de búsqueda por código de barras
  document.getElementById('search-barcode-btn').addEventListener('click', function() {
    searchByBarcode();
  });
  
  // Permitir búsqueda por código de barras con Enter
  document.getElementById('search-barcode-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchByBarcode();
    }
  });
  
  // Botón para escanear con cámara en búsqueda
  document.getElementById('btn-search-scan').addEventListener('click', function() {
    iniciarEscanerParaBusqueda();
  });
  
  // Cerrar modal de búsqueda por código de barras
  document.getElementById('btn-close-barcode-search').addEventListener('click', function() {
    closeBarcodeSearchModal();
  });
  
  // Botón para alternar entre productos activos e inactivos
  document.getElementById('btn-view-inactive').addEventListener('click', function() {
    showInactiveProductsModal();
  });
  
  // Botón para cerrar modal de productos desactivados
  document.getElementById('btn-close-inactive').addEventListener('click', function() {
    closeInactiveProductsModal();
  });
  
  // Botones de paginación - Corregido para usar selectores adecuados
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const page = this.dataset.page;
      if (page === 'prev') prevPage();
      else if (page === 'next') nextPage();
    });
  });
  
  // Filtrado
  document.getElementById('btn-filter').addEventListener('click', function() {
    const filterPanel = document.getElementById('filter-panel');
    filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
  });
  
  // Configurar explícitamente el filtro de categoría para asegurar que funcione
  const categoriaFilter = document.getElementById('filter-categoria');
  if (categoriaFilter) {
    categoriaFilter.addEventListener('change', function() {
      console.log('Filtro de categoría cambiado a:', this.value);
      currentPage = 1;
      loadProductos();
    });
  }
  
  // Añadir evento al botón de aplicar filtros (si existe)
  const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
  if (btnAplicarFiltros) {
    btnAplicarFiltros.addEventListener('click', function() {
      console.log('Botón aplicar filtros clickeado');
      aplicarFiltroCategoria();
    });
  }
  
  // NUEVO: Configurar filtrado automático para todos los filtros
  const filterElements = document.querySelectorAll('#filter-panel select, #filter-panel input[type="number"]');
  filterElements.forEach(el => {
    el.addEventListener('change', function() {
      // Resetear a la primera página cuando se cambia un filtro
      currentPage = 1;
      // Aplicar filtros automáticamente
      loadProductos();
    });

    // Para los campos numéricos, aplicar filtro después de un tiempo de espera para no hacer muchas solicitudes
    if (el.type === 'number') {
      el.addEventListener('input', debounce(function() {
        currentPage = 1;
        loadProductos();
      }, 800)); // 800ms de espera
    }
  });
  
  // Botón para resetear filtros
  document.getElementById('btn-reset-filters').addEventListener('click', function() {
    // Reiniciar todos los filtros
    const filterElements = document.querySelectorAll('#filter-panel select, #filter-panel input');
    filterElements.forEach(el => {
      if (el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = el.tagName === 'SELECT' ? '' : '';
      }
    });
    
    currentPage = 1;
    loadProductos();
  });
  
  // Botón de búsqueda
  document.getElementById('search-productos').addEventListener('input', function() {
    currentPage = 1;
    // Debounce para no hacer demasiadas solicitudes
    clearTimeout(this._timer);
    this._timer = setTimeout(() => loadProductos(), 500);
  });
  
  // Botones para importar/exportar
  document.getElementById('btn-import-export').addEventListener('click', function() {
    const modal = document.getElementById('import-export-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    modal.classList.add('active');
    modalOverlay.classList.add('active');
    
    // Cambiar entre pestañas de importar/exportar
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        // Quitar clase active de todos los botones y contenidos
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Añadir clase active al botón y contenido correspondiente
        this.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  });
  
  // Botón para exportar CSV
  document.getElementById('btn-export-csv').addEventListener('click', function() {
    exportarProductos('csv');
  });
  
  // Botón para exportar Excel
  document.getElementById('btn-export-excel').addEventListener('click', function() {
    exportarProductos('excel');
  });
  
  // Botones para descargar plantillas
  document.getElementById('btn-template-csv').addEventListener('click', function() {
    descargarPlantilla('csv');
  });
  
  document.getElementById('btn-template-excel').addEventListener('click', function() {
    descargarPlantilla('excel');
  });
  
  // Manejo de la importación de archivos
  const importFileInput = document.getElementById('import-file');
  const selectedFileText = document.getElementById('selected-file');
  const importButton = document.getElementById('btn-import');
  
  importFileInput.addEventListener('change', function(e) {
    if (this.files && this.files.length > 0) {
      selectedFileText.textContent = this.files[0].name;
      importButton.disabled = false;
    } else {
      selectedFileText.textContent = 'No se ha seleccionado ningún archivo';
      importButton.disabled = true;
    }
  });
  
  // Botón para importar
  importButton.addEventListener('click', function() {
    importarProductos();
  });
  
  // Cerrar historial
  document.getElementById('btn-close-historial').addEventListener('click', function() {
    closeHistorialModal();
  });

  // Cerrar historial de precios
  document.getElementById('btn-close-historial-precios').addEventListener('click', function() {
    closeHistorialPreciosModal();
  });

  // Configurar drag & drop para imágenes
  setupImageDropzone();

  // Botón para cerrar el panel de filtros
  document.getElementById('btn-close-filters').addEventListener('click', function() {
    document.getElementById('filter-panel').style.display = 'none';
  });
}

// Función debounce para retrasar la ejecución de funciones
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Función para mejorar la búsqueda predictiva de productos
function initPredictiveSearch() {
  const searchInput = document.getElementById('search-productos');
  const suggestionsContainer = document.getElementById('search-suggestions');
  
  if (!searchInput || !suggestionsContainer) {
    console.error('Elementos de búsqueda predictiva no encontrados');
    return;
  }
  
  // Añadir estilos adicionales para las sugerencias para mejorar la presentación
  if (!document.getElementById('predictive-search-styles')) {
    const style = document.createElement('style');
    style.id = 'predictive-search-styles';
    style.textContent = `
      .suggestion-item {
        display: flex;
        align-items: center;
        padding: 10px 15px;
      }
      .suggestion-item img {
        width: 30px;
        height: 30px;
        margin-right: 10px;
        object-fit: cover;
      }
      .suggestion-info {
        flex: 1;
      }
      .suggestion-name {
        font-weight: 500;
        margin-bottom: 3px;
      }
      .suggestion-name mark {
        background-color: #fff3cd;
        padding: 0 2px;
      }
      .suggestion-detail {
        display: flex;
        justify-content: space-between;
        color: #666;
        font-size: 0.85em;
      }
      .suggestion-code {
        font-family: monospace;
      }
      .suggestion-price {
        font-weight: 500;
        color: #28a745;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Función para buscar productos con debounce y caché
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    // Añadir debounce para reducir llamadas a la API
    clearTimeout(this._searchTimer);
    
    if (!query) {
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      return;
    }
    
    this._searchTimer = setTimeout(() => {
      // Verificar si hay resultados en caché local
      const cacheKey = `search_${query.toLowerCase()}`;
      const cachedResults = sessionStorage.getItem(cacheKey);
      
      if (cachedResults) {
        // Usar resultados en caché
        console.log('Usando resultados en caché para:', query);
        renderSearchResults(JSON.parse(cachedResults));
        return;
      }
      
      console.log('Buscando en API:', query);
      
      // Si no hay caché, hacer la petición al servidor
      fetch(`/api/productos?search=${encodeURIComponent(query)}&limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al buscar productos');
        }
        return response.json();
      })
      .then(data => {
        const productos = data.productos || data.data || [];
        
        // Guardar en caché (se borrará automáticamente al cerrar la pestaña)
        sessionStorage.setItem(cacheKey, JSON.stringify(productos));
        renderSearchResults(productos);
      })
      .catch(error => {
        console.error('Error en la búsqueda predictiva:', error);
      });
    }, 300); // 300ms de debounce
  });
  
  // Manejar la selección de productos
  suggestionsContainer.addEventListener('click', function(event) {
    const item = event.target.closest('.suggestion-item');
    if (item) {
      const productoId = item.getAttribute('data-id');
      
      // Limpiar la búsqueda y ocultar las sugerencias
      searchInput.value = '';
      this.style.display = 'none';
      
      // Mostrar detalles del producto
      showProductoDetalle(productoId);
    }
  });
  
  // Función para renderizar los resultados de la búsqueda
  function renderSearchResults(productos) {
    if (productos.length === 0) {
      suggestionsContainer.innerHTML = '<div class="suggestion-item">No se encontraron productos</div>';
      suggestionsContainer.style.display = 'block';
      return;
    }
    
    const query = searchInput.value.trim();
    
    suggestionsContainer.innerHTML = productos.map(producto => `
      <div class="suggestion-item" data-id="${producto.codigo || producto.id}">
        ${producto.imagen ? `<img src="${producto.imagen}" alt="${producto.nombre}">` : ''}
        <div class="suggestion-info">
          <div class="suggestion-name">${highlightMatch(producto.nombre, query)}</div>
          <div class="suggestion-detail">
            <span class="suggestion-code">${producto.codigo || ''}</span>
            <span class="suggestion-price">$${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    // Asegurarse de que el contenedor sea visible
    suggestionsContainer.style.display = 'block';
  }
  
  // Función para resaltar el texto que coincide con la búsqueda
  function highlightMatch(text, query) {
    // Destacar coincidencias en el texto
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Función para mostrar detalles del producto en un modal
function showProductoDetalle(productoId) {
  const token = localStorage.getItem('token');
  const modal = document.getElementById('producto-detalle-modal');
  const contenido = document.getElementById('producto-detalle-contenido');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (!modal || !contenido) {
    console.error('Modal de detalle de producto no encontrado');
    return;
  }
  
  // Mostrar modal con indicador de carga
  modal.classList.add('active');
  modalOverlay.classList.add('active');
  contenido.innerHTML = `
    <div class="loading-result text-center">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Cargando información del producto...</p>
    </div>
  `;
  
  // Configurar botón de editar
  const editBtn = document.getElementById('btn-edit-from-detail');
  if (editBtn) {
    editBtn.onclick = function() {
      closeProductoDetalleModal();
      editProducto(productoId);
    };
  }
  
  // Configurar botón de cerrar
  const closeBtn = document.getElementById('btn-close-detail');
  if (closeBtn) {
    closeBtn.onclick = closeProductoDetalleModal;
  }
  
  // Cargar datos del producto
  fetch(`/api/productos/${productoId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar detalles del producto');
    }
    return response.json();
  })
  .then(data => {
    const producto = data.data || data;
    
    // Asegurarnos de que tenemos valores correctos para precios
    const precioCompra = parseFloat(producto.precio_compra || 0).toFixed(2);
    const precioVenta = parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2);
    
    // Crear el contenido del modal
    contenido.innerHTML = `
      <div class="producto-detalle">
        <div class="producto-detalle-header" style="display: flex; margin-bottom: 20px;">
          <div class="producto-imagen" style="width: 150px; height: 150px; margin-right: 20px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${producto.imagen 
              ? `<img src="${producto.imagen}" alt="${producto.nombre}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`
              : '<div class="no-image" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #adb5bd;"><i class="fas fa-box fa-3x"></i></div>'}
          </div>
          <div class="producto-info-principal" style="flex: 1;">
            <h3 style="margin-top: 0; color: #333;">${producto.nombre}</h3>
            <p style="color: #555; margin: 5px 0;">Código: <strong>${producto.codigo || '-'}</strong></p>
            <p style="color: #555; margin: 5px 0;">Categoría: <strong>${producto.categoria ? producto.categoria.nombre : 'Sin categoría'}</strong></p>
            <div>
              Estado: <span class="badge ${producto.activo ? 'active' : 'inactive'}">${producto.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        </div>
        
        <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #dee2e6;">
          <h4 style="color: #333; margin-bottom: 10px;">Información General</h4>
          <div>
            <div style="display: flex; margin-bottom: 8px;">
              <div style="width: 30%; font-weight: 500; color: #555;">Descripción:</div>
              <div style="width: 70%;">${producto.descripcion || 'Sin descripción'}</div>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <div style="width: 30%; font-weight: 500; color: #555;">Stock Actual:</div>
              <div style="width: 70%;">${producto.stock || producto.cantidad || 0} unidades</div>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <div style="width: 30%; font-weight: 500; color: #555;">Precio de Compra:</div>
              <div style="width: 70%;">$${precioCompra}</div>
            </div>
            <div style="display: flex; margin-bottom: 8px;">
              <div style="width: 30%; font-weight: 500; color: #555;">Precio de Venta:</div>
              <div style="width: 70%;">$${precioVenta}</div>
            </div>
          </div>
        </div>
        
        ${producto.codigos_barras && producto.codigos_barras.length > 0 ? `
        <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #dee2e6;">
          <h4 style="color: #333; margin-bottom: 10px;">Códigos de Barras</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${producto.codigos_barras.map(codigo => `
              <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
                <span style="font-family: monospace; font-weight: 500;">${codigo.codigo}</span>
                <span style="font-size: 0.9em; color: #6c757d; background-color: #e9ecef; padding: 2px 5px; border-radius: 3px;">${codigo.tipo}</span>
                ${codigo.principal ? '<span class="badge active">Principal</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
  })
  .catch(error => {
    console.error('Error al cargar detalles del producto:', error);
    contenido.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #dc3545;">
        <i class="fas fa-exclamation-circle fa-2x"></i>
        <p>Error al cargar los detalles del producto: ${error.message}</p>
      </div>
    `;
  });
}

// Cerrar el modal de detalle de producto
function closeProductoDetalleModal() {
  const modal = document.getElementById('producto-detalle-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal) modal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
}
// Cargar productos desde la API
function loadProductos() {
  const token = localStorage.getItem('token');
  showLoading();
  
  // Preparar parámetros de filtrado
  const searchText = document.getElementById('search-productos').value;
  const categoriaId = document.getElementById('filter-categoria') ? document.getElementById('filter-categoria').value : '';
  const filterStockCondition = document.getElementById('filter-stock-condition') ? document.getElementById('filter-stock-condition').value : '';
  const filterStockValue = document.getElementById('filter-stock-value') ? document.getElementById('filter-stock-value').value : '';
  const filterPrecioMin = document.getElementById('filter-precio-min') ? document.getElementById('filter-precio-min').value : '';
  const filterPrecioMax = document.getElementById('filter-precio-max') ? document.getElementById('filter-precio-max').value : '';
  const filterEstado = document.getElementById('filter-estado') ? document.getElementById('filter-estado').value : '';
  
  // Construir la URL base con paginación
  let url = `/api/productos?page=${currentPage}&limit=${productosPorPagina}`;
  
  // Aplicar filtro de estado solo si está seleccionado, de lo contrario mostrar activos por defecto
  if (filterEstado !== '') {
    url += `&activo=${filterEstado}`;
  } else {
    url += '&activo=true'; // Por defecto mostrar solo activos
  }
  
  // Aplicar resto de filtros si tienen valor
  if (searchText) url += `&search=${encodeURIComponent(searchText)}`;
  
  // Asegurar que la categoría se envíe correctamente si tiene un valor
  if (categoriaId) {
    url += `&categoria_id=${encodeURIComponent(categoriaId)}`;
    console.log('Filtrando por categoría ID:', categoriaId);
  }
  
  // Aplicar filtro de stock solo si ambos valores (condición y valor) están presentes
  if (filterStockValue && filterStockCondition) {
    url += `&stock_condition=${encodeURIComponent(filterStockCondition)}&stock_value=${encodeURIComponent(filterStockValue)}`;
  }
  
  // Aplicar filtros de precio mínimo y máximo
  if (filterPrecioMin) url += `&precio_min=${encodeURIComponent(filterPrecioMin)}`;
  if (filterPrecioMax) url += `&precio_max=${encodeURIComponent(filterPrecioMax)}`;
  
  console.log('URL de filtrado completa:', url); // Para debugging
  
  // Actualizar contador de filtros activos
  updateActiveFiltersCount();
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar productos');
    }
    return response.json();
  })
  .then(data => {
    // Verificar los resultados obtenidos
    console.log(`Productos recibidos: ${data.productos ? data.productos.length : 0} productos`);
    if (categoriaId) {
      const productosCategoria = data.productos ? data.productos.filter(p => p.categoria_id == categoriaId) : [];
      console.log(`De los cuales ${productosCategoria.length} pertenecen a la categoría ID ${categoriaId}`);
    }
    
    productos = data.productos || data.data || [];
    totalPages = data.totalPages || 1;
    renderProductos();
    updatePagination();
  })
  .catch(error => {
    console.error('Error en la carga de productos:', error);
    showToast(error.message, 'error');
    document.getElementById('productos-list').innerHTML = `
      <tr>
        <td colspan="9" class="text-center">Error al cargar productos: ${error.message}</td>
      </tr>
    `;
  })
  .finally(() => {
    hideLoading();
  });
}

// Actualizar el título de la sección según el modo (activos o inactivos)
function updateSectionTitle() {
  const headerTitle = document.querySelector('.admin-header h1');
  const headerDescription = document.querySelector('.admin-header p');
  const viewInactiveBtn = document.getElementById('btn-view-inactive');
  
  if (showInactiveProducts) {
    headerTitle.innerHTML = '<i class="fas fa-archive"></i> Productos Desactivados';
    headerDescription.textContent = 'Estos productos están desactivados y no aparecen en el inventario activo';
    viewInactiveBtn.innerHTML = '<i class="fas fa-box"></i> Ver Activos';
  } else {
    headerTitle.innerHTML = '<i class="fas fa-box"></i> Gestión de Productos';
    headerDescription.textContent = 'Administre los productos de su inventario';
    viewInactiveBtn.innerHTML = '<i class="fas fa-archive"></i> Ver Desactivados';
  }
}

// Cargar categorías para los selectores
function loadCategorias() {
  const token = localStorage.getItem('token');
  
  fetch('/api/categorias', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar categorías');
    }
    return response.json();
  })
  .then(data => {
    categorias = data.categorias || data.data || [];
    
    // Actualizar el selector de filtro de categorías
    const filterSelect = document.getElementById('filter-categoria');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
      
      categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        filterSelect.appendChild(option);
      });
    }
    
    // Actualizar el selector del formulario
    const formSelect = document.getElementById('categoria_id');
    if (formSelect) {
      formSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
      
      categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        formSelect.appendChild(option);
      });
    }
  })
  .catch(error => {
    console.error('Error al cargar categorías:', error);
    showToast('Error al cargar categorías', 'error');
  });
}

// Renderizar lista de productos
function renderProductos() {
  const productosTable = document.getElementById('productos-list');
  
  if (!productos || productos.length === 0) {
    productosTable.innerHTML = `
      <tr>
        <td colspan="9" class="text-center">No se encontraron productos</td>
      </tr>
    `;
    return;
  }
  
  productosTable.innerHTML = '';
  
  productos.forEach(producto => {
    // Asegurarnos de que tenemos un ID para el producto
    // El ID podría estar en producto.id o en producto.codigo como clave primaria
    const productoId = producto.codigo;
    
    // Asegurarnos de que tenemos valores correctos para precios
    // El backend devuelve "precio" que corresponde al precio de venta en el frontend
    const precioCompra = parseFloat(producto.precio_compra || 0).toFixed(2);
    const precioVenta = producto.precio_venta 
                        ? parseFloat(producto.precio_venta).toFixed(2) 
                        : parseFloat(producto.precio || 0).toFixed(2); // Usar precio como respaldo
    
    // Obtener el stock actual del producto
    const stockActual = producto.stock || producto.cantidad || 0;
    
    // Determinar la clase CSS para el color según el nivel de stock
    let rowClass = '';
    let stockClass = '';
    if (stockActual == 0) {
      rowClass = 'stock-critical'; // Clase para toda la fila - stock en 0
      stockClass = 'text-danger'; // Clase específica para la celda de stock
    } else if (stockActual < 5) {
      rowClass = 'stock-warning'; // Clase para toda la fila - stock bajo
      stockClass = 'text-warning'; // Clase específica para la celda de stock
    }
    
    const row = document.createElement('tr');
    // Aplicar clase a toda la fila según el nivel de stock
    if (rowClass) {
      row.className = rowClass;
    }
    
    // Adaptar visualización según la estructura del HTML
    row.innerHTML = `
      <td>
        ${producto.imagen 
          ? `<img src="${producto.imagen}" alt="${producto.nombre}" class="producto-thumbnail">`
          : '<div class="no-image"><i class="fas fa-box"></i></div>'}
      </td>
      <td>${producto.codigo || '-'}</td>
      <td>${producto.nombre}</td>
      <td>${producto.categoria ? producto.categoria.nombre : 'Sin categoría'}</td>
      <td class="${stockClass}">${stockActual}</td>
      <td>$${precioCompra}</td>
      <td>$${precioVenta}</td>
      <td>${producto.activo ? '<span class="badge active">Activo</span>' : '<span class="badge inactive">Inactivo</span>'}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="editProducto('${productoId}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" onclick="toggleProductoStatus('${productoId}', ${!producto.activo})" title="${producto.activo ? 'Desactivar' : 'Activar'}">
            <i class="fas fa-${producto.activo ? 'toggle-on' : 'toggle-off'}"></i>
          </button>
          <button class="btn-icon" onclick="showHistorial('${productoId}')" title="Ver historial">
            <i class="fas fa-history"></i>
          </button>
          <button class="btn-icon" onclick="showHistorialPrecios('${productoId}')" title="Ver historial de precios">
            <i class="fas fa-dollar-sign"></i>
          </button>
          <button class="btn-icon" onclick="showCodigosBarras('${productoId}')" title="Gestionar códigos de barras">
            <i class="fas fa-barcode"></i>
          </button>
        </div>
      </td>
    `;
    
    productosTable.appendChild(row);
  });
}

// Actualizar información de paginación
function updatePagination() {
  document.getElementById('current-page').textContent = currentPage;
  document.getElementById('total-pages').textContent = totalPages;
  
  const prevBtn = document.querySelector('.page-btn[data-page="prev"]');
  const nextBtn = document.querySelector('.page-btn[data-page="next"]');
  
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// Paginación
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadProductos();
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadProductos();
  }
}

// Abrir modal para crear o editar producto
function openProductoModal(productoId = null) {
  currentProductoId = productoId;
  const modal = document.getElementById('producto-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  const form = document.getElementById('producto-form');
  const modalTitle = document.getElementById('modal-title');
  
  if (!modal || !modalOverlay || !form || !modalTitle) {
    showToast('Error al abrir el formulario de producto', 'error');
    return;
  }
  
  form.reset();
  
  if (productoId) {
    // Modo edición
    modalTitle.textContent = 'Editar Producto';
    // Buscar el producto en ambas listas: activos e inactivos
    const producto = productos.find(p => p.codigo === productoId) ||
                    inactiveProducts.find(p => p.codigo === productoId);
    
    if (producto) {
      // Cerrar cualquier otra modal que pudiera estar abierta
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
      
      document.getElementById('producto-id').value = productoId;
      document.getElementById('codigo').value = producto.codigo || '';
      // El código es readOnly en modo edición ya que es la clave primaria
      document.getElementById('codigo').readOnly = true;
      
      document.getElementById('nombre').value = producto.nombre;
      document.getElementById('descripcion').value = producto.descripcion || '';
      document.getElementById('categoria_id').value = producto.categoria_id || '';
      
      // Para el precio_venta, usar el campo precio si precio_venta no está disponible
      document.getElementById('precio_compra').value = parseFloat(producto.precio_compra || 0).toFixed(2);
      document.getElementById('precio_venta').value = producto.precio_venta 
                                                    ? parseFloat(producto.precio_venta).toFixed(2)
                                                    : parseFloat(producto.precio || 0).toFixed(2);
                                                    
      document.getElementById('activo').value = producto.activo ? 'true' : 'false';
      
      // Ocultar campo de stock inicial en modo edición
      const stockInicialGroup = document.getElementById('stock_inicial').closest('.form-group');
      if (stockInicialGroup) {
        stockInicialGroup.style.display = 'none';
        // Deshabilitamos el campo para que no cause problemas con la validación
        document.getElementById('stock_inicial').required = false;
      }
    } else {
      showToast('Producto no encontrado', 'error');
      return;
    }
  } else {
    // Modo creación
    modalTitle.textContent = 'Nuevo Producto';
    document.getElementById('producto-id').value = '';
    document.getElementById('codigo').readOnly = false;
    document.getElementById('activo').value = 'true';
    
    // Mostrar campo de stock inicial en modo creación
    const stockInicialGroup = document.getElementById('stock_inicial') ? 
      document.getElementById('stock_inicial').closest('.form-group') : null;
    
    if (stockInicialGroup) {
      stockInicialGroup.style.display = 'block';
      // Activamos de nuevo el campo requerido
      document.getElementById('stock_inicial').required = true;
    }
  }
  
  // Asegurar que el overlay esté activo
  modalOverlay.classList.add('active');
  // Mostrar la modal de edición
  modal.classList.add('active');
}

// Cerrar modal
function closeProductoModal() {
  const modal = document.getElementById('producto-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal) modal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

// Función para editar un producto
function editProducto(productoId) {
  if (!productoId) return;

  // Buscar el producto en ambas listas: activos e inactivos
  const producto = productos.find(p => p.codigo === productoId) ||
                   inactiveProducts.find(p => p.codigo === productoId);

  if (!producto) {
    showToast('Producto no encontrado', 'error');
    return;
  }

  // Abrir el modal de edición
  openProductoModal(productoId);
}

// Guardar producto (crear o actualizar)
function saveProducto() {
  const token = localStorage.getItem('token');
  const form = document.getElementById('producto-form');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const formData = new FormData();
  
  // Agregar campos del formulario
  const codigo = document.getElementById('codigo').value;
  formData.append('codigo', codigo);
  formData.append('nombre', document.getElementById('nombre').value);
  formData.append('descripcion', document.getElementById('descripcion').value || '');
  formData.append('categoria_id', document.getElementById('categoria_id').value);
  formData.append('precio_compra', document.getElementById('precio_compra').value || 0);
  formData.append('precio_venta', document.getElementById('precio_venta').value || 0);
  formData.append('activo', document.getElementById('activo').value === 'true');
  
  // Agregar imagen si existe
  const imageFile = window.getCurrentImageFile();
  if (imageFile) {
    formData.append('imagen', imageFile);
  }
  
  // Si es un nuevo producto, agregar stock inicial
  if (!currentProductoId && document.getElementById('stock_inicial')) {
    formData.append('stock', document.getElementById('stock_inicial').value || 0);
    formData.append('cantidad', document.getElementById('stock_inicial').value || 0);
  }

  // Si es un nuevo producto, agregar código de barras automático
  if (!currentProductoId) {
    const codigosBarras = {
      nuevos: [
        {
          codigo: codigo,
          tipo: 'SKU',
          principal: true
        }
      ]
    };
    formData.append('codigos_barras', JSON.stringify(codigosBarras));
  }
  
  showLoading();
  
  const url = currentProductoId ? 
    `/api/productos/${currentProductoId}` : 
    '/api/productos';
  
  const method = currentProductoId ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.message || 'Error al guardar el producto');
      });
    }
    return response.json();
  })
  .then(data => {
    showToast(
      currentProductoId ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 
      'success'
    );
    closeProductoModal();
    loadProductos();
  })
  .catch(error => {
    console.error('Error al guardar producto:', error);
    showToast(error.message, 'error');
  })
  .finally(() => {
    hideLoading();
  });
}

// Cambiar estado de un producto (activar/desactivar)
function toggleProductoStatus(productoId, newStatus) {
  const token = localStorage.getItem('token');
  const statusText = newStatus ? 'activar' : 'desactivar';
  
  // Buscar el producto por su código (clave primaria) en ambas listas
  const producto = productos.find(p => p.codigo === productoId) || 
                   inactiveProducts.find(p => p.codigo === productoId);
  
  if (!producto) {
    showToast('Producto no encontrado', 'error');
    return;
  }

  // Si estamos activando, simplemente activar sin preguntar por el stock
  if (newStatus) {
    showConfirm(
      'Activar Producto',
      `¿Está seguro que desea activar el producto "${producto.nombre}"?`,
      'fa-toggle-on',
      () => {
        actualizarEstadoProducto(productoId, true);
      }
    );
  } else {
    // Si estamos desactivando, verificar si tiene stock
    const stockActual = producto.stock || producto.cantidad || 0;
    
    // Solo preguntar si tiene stock mayor que 0
    if (stockActual > 0) {
      // Usamos el diálogo de confirmación estándar que ya sabemos que funciona
      showConfirm(
        'Desactivar Producto',
        `¿Está seguro que desea desactivar el producto "${producto.nombre}"?<br><br>El producto tiene ${stockActual} unidades en stock.<br><br>¿Qué desea hacer con el stock?`,
        'fa-toggle-off',
        () => {
          // Resetear stock a cero (comportamiento original)
          actualizarEstadoProducto(productoId, false, true);
        },
        () => {
          // No hacer nada si cancela
        },
        // Opciones adicionales
        {
          okButtonText: 'Resetear stock a cero',
          additionalButton: {
            text: 'Mantener stock actual',
            onClick: () => actualizarEstadoProducto(productoId, false, false),
            className: 'secondary highlight'
          }
        }
      );
    } else {
      // Si no tiene stock, simplemente desactivar
      showConfirm(
        'Desactivar Producto',
        `¿Está seguro que desea desactivar el producto "${producto.nombre}"?`,
        'fa-toggle-off',
        () => {
          actualizarEstadoProducto(productoId, false);
        }
      );
    }
  }
}

// Función para actualizar el estado del producto
function actualizarEstadoProducto(productoId, activo, resetearStock = true) {
  const token = localStorage.getItem('token');
  
  showLoading();
  
  fetch(`/api/productos/${productoId}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      activo: activo,
      resetearStock: resetearStock 
    })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.message || `Error al ${activo ? 'activar' : 'desactivar'} el producto`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast(`Producto ${activo ? 'activado' : 'desactivado'} correctamente`, 'success');
    
    // Recargar ambas listas según sea necesario
    if (activo) {
      loadInactiveProducts(); // Actualizar lista de inactivos si se activó un producto
    }
    loadProductos(); // Siempre actualizar la lista principal
  })
  .catch(error => {
    console.error('Error al cambiar estado:', error);
    showToast(error.message, 'error');
  })
  .finally(() => {
    hideLoading();
  });
}

// Resetear el stock de un producto desactivado a 0
function resetearStockProductoDesactivado(productoId) {
  const token = localStorage.getItem('token');
  const producto = productos.find(p => p.codigo === productoId);
  
  if (!producto || producto.stock <= 0) return; // No hacer nada si ya tiene stock 0
  
  fetch(`/api/productos/${productoId}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cantidad: -producto.stock, // Restar el stock actual para que quede en 0
      motivo: 'Producto desactivado'
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al resetear stock del producto desactivado');
    }
    return response.json();
  })
  .then(data => {
    console.log('Stock del producto desactivado reseteado a 0');
  })
  .catch(error => {
    console.error('Error al resetear stock:', error);
  });
}

// Ver historial de movimientos de un producto
function showHistorial(productoId) {
  const token = localStorage.getItem('token');
  
  // Buscar el producto por su código (clave primaria)
  const producto = productos.find(p => p.codigo === productoId);
  
  if (!producto) {
    showToast('Producto no encontrado', 'error');
    return;
  }
  
  const modal = document.getElementById('historial-modal');
  if (!modal) {
    showToast('Error al abrir el historial', 'error');
    return;
  }
  
  document.getElementById('producto-nombre').textContent = producto.nombre;
  document.getElementById('movimientos-list').innerHTML = '<tr><td colspan="6" class="text-center">Cargando movimientos...</td></tr>';
  
  const modalOverlay = document.querySelector('.modal-overlay');
  
  modal.classList.add('active');
  modalOverlay.classList.add('active');
  
  fetch(`/api/movimientos?producto_id=${productoId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar movimientos');
    }
    return response.json();
  })
  .then(data => {
    renderHistorial(data.movimientos || data.data || []);
  })
  .catch(error => {
    console.error('Error al cargar historial:', error);
    document.getElementById('movimientos-list').innerHTML = `
      <tr><td colspan="6" class="text-center">Error al cargar movimientos: ${error.message}</td></tr>
    `;
    showToast('Error al cargar historial de movimientos', 'error');
  });
}

function closeHistorialModal() {
  const modal = document.getElementById('historial-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal) modal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

function renderHistorial(movimientos) {
  const movimientosList = document.getElementById('movimientos-list');
  
  if (!movimientos || movimientos.length === 0) {
    movimientosList.innerHTML = '<tr><td colspan="6" class="text-center">No hay movimientos registrados</td></tr>';
    return;
  }
  
  movimientosList.innerHTML = '';
  
  movimientos.forEach(movimiento => {
    const row = document.createElement('tr');
    const fecha = new Date(movimiento.fecha_creacion).toLocaleString();
    
    row.innerHTML = `
      <td>${fecha}</td>
      <td>${movimiento.tipo_movimiento}</td>
      <td>${movimiento.cantidad}</td>
      <td>${movimiento.stock_nuevo}</td>
      <td>${movimiento.motivo || '-'}</td>
      <td>${movimiento.usuario ? movimiento.usuario.nombre : '-'}</td>
    `;
    
    movimientosList.appendChild(row);
  });
}

// Ver historial de precios de un producto
function showHistorialPrecios(productoId) {
  const token = localStorage.getItem('token');
  
  // Buscar el producto por su código (clave primaria)
  const producto = productos.find(p => p.codigo === productoId);
  
  if (!producto) {
    showToast('Producto no encontrado', 'error');
    return;
  }
  
  const modal = document.getElementById('historial-precios-modal');
  if (!modal) {
    showToast('Error al abrir el historial de precios', 'error');
    return;
  }
  
  document.getElementById('producto-nombre-precios').textContent = producto.nombre;
  document.getElementById('precios-list').innerHTML = '<tr><td colspan="6" class="text-center">Cargando historial de precios...</td></tr>';
  
  const modalOverlay = document.querySelector('.modal-overlay');
  
  modal.classList.add('active');
  modalOverlay.classList.add('active');
  
  fetch(`/api/productos/${productoId}/historial-precios`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar historial de precios');
    }
    return response.json();
  })
  .then(data => {
    renderHistorialPrecios(data.data || []);
  })
  .catch(error => {
    console.error('Error al cargar historial de precios:', error);
    document.getElementById('precios-list').innerHTML = `
      <tr><td colspan="6" class="text-center">Error al cargar historial de precios: ${error.message}</td></tr>
    `;
    showToast('Error al cargar historial de precios', 'error');
  });
}

function closeHistorialPreciosModal() {
  const modal = document.getElementById('historial-precios-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal) modal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

function renderHistorialPrecios(historial) {
  const historialList = document.getElementById('precios-list');
  
  if (!historial || historial.length === 0) {
    historialList.innerHTML = '<tr><td colspan="6" class="text-center">No hay cambios de precios registrados</td></tr>';
    return;
  }
  
  historialList.innerHTML = '';
  
  historial.forEach(registro => {
    const row = document.createElement('tr');
    const fecha = new Date(registro.fecha_creacion).toLocaleString();
    
    // Calcular el porcentaje de cambio
    const precioAnterior = parseFloat(registro.precio_anterior);
    const precioNuevo = parseFloat(registro.precio_nuevo);
    let cambio = '';
    
    if (precioAnterior > 0) {
      const porcentaje = ((precioNuevo - precioAnterior) / precioAnterior) * 100;
      const signo = porcentaje >= 0 ? '+' : '';
      cambio = `<span class="${porcentaje >= 0 ? 'precio-aumento' : 'precio-reduccion'}">${signo}${porcentaje.toFixed(2)}%</span>`;
    }
    
    row.innerHTML = `
      <td>${fecha}</td>
      <td>${registro.tipo_precio === 'compra' ? 'Precio de compra' : 'Precio de venta'}</td>
      <td class="precio-anterior">$${precioAnterior.toFixed(2)}</td>
      <td class="precio-nuevo">$${precioNuevo.toFixed(2)}</td>
      <td>${cambio}</td>
      <td>${registro.motivo || '-'}</td>
      <td>${registro.usuario ? registro.usuario.nombre_completo || registro.usuario.username : '-'}</td>
    `;
    
    historialList.appendChild(row);
  });
}

// Exportar productos 
function exportarProductos(format) {
  const token = localStorage.getItem('token');
  
  // Preparar parámetros de filtrado (mismos que para cargar productos)
  const searchText = document.getElementById('search-productos').value;
  const categoriaId = document.getElementById('filter-categoria') ? document.getElementById('filter-categoria').value : '';
  const filterStockCondition = document.getElementById('filter-stock-condition') ? document.getElementById('filter-stock-condition').value : '';
  const filterStockValue = document.getElementById('filter-stock-value') ? document.getElementById('filter-stock-value').value : '';
  const filterPrecioMin = document.getElementById('filter-precio-min') ? document.getElementById('filter-precio-min').value : '';
  const filterPrecioMax = document.getElementById('filter-precio-max') ? document.getElementById('filter-precio-max').value : '';
  const filterEstado = document.getElementById('filter-estado') ? document.getElementById('filter-estado').value : '';
  
  let url = `/api/productos/exportar?format=${format}`;
  
  // Aplicar los mismos filtros que en la función loadProductos
  if (filterEstado !== '') {
    url += `&activo=${filterEstado}`;
  } else {
    url += '&activo=true'; // Por defecto mostrar solo activos
  }
  
  if (searchText) url += `&search=${encodeURIComponent(searchText)}`;
  if (categoriaId) url += `&categoria_id=${categoriaId}`; // Usando categoria_id en lugar de categoriaId
  
  // Aplicar filtro de stock solo si ambos valores están presentes
  if (filterStockValue && filterStockCondition) {
    url += `&stock_condition=${encodeURIComponent(filterStockCondition)}&stock_value=${encodeURIComponent(filterStockValue)}`;
  }
  
  // Aplicar filtros de precio mínimo y máximo
  if (filterPrecioMin) url += `&precio_min=${encodeURIComponent(filterPrecioMin)}`;
  if (filterPrecioMax) url += `&precio_max=${encodeURIComponent(filterPrecioMax)}`;
  
  showLoading();
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al exportar productos');
    }
    return response.blob();
  })
  .then(blob => {
    // Crear un enlace para descargar el archivo
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Archivo exportado correctamente', 'success');
  })
  .catch(error => {
    console.error('Error al exportar:', error);
    showToast(error.message, 'error');
  })
  .finally(() => {
    hideLoading();
  });
}

// Descargar plantilla para importar productos
function descargarPlantilla(format) {
  const token = localStorage.getItem('token');
  
  let url = `/api/productos/plantilla?format=${format}`;
  
  showLoading();
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al descargar plantilla');
    }
    return response.blob();
  })
  .then(blob => {
    // Crear un enlace para descargar el archivo
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-productos.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Plantilla descargada correctamente', 'success');
  })
  .catch(error => {
    console.error('Error al descargar plantilla:', error);
    showToast(error.message, 'error');
  })
  .finally(() => {
    hideLoading();
  });
}

// Importar productos desde archivo
function importarProductos() {
  const token = localStorage.getItem('token');
  const importFileInput = document.getElementById('import-file');
  
  if (!importFileInput.files || importFileInput.files.length === 0) {
    showToast('Debe seleccionar un archivo para importar', 'error');
    return;
  }
  
  const file = importFileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  // Preparar el área de logs
  const logsContainer = document.getElementById('import-logs-container');
  const logsContent = document.getElementById('import-logs');
  const detailsContainer = document.getElementById('import-details-container');
  
  // Limpiar datos anteriores
  importDetails = {
    procesados: [],
    creados: [],
    actualizados: [],
    errores: []
  };
  
  // Mostrar el contenedor de logs y limpiarlo
  logsContainer.style.display = 'block';
  detailsContainer.style.display = 'none';
  logsContent.innerHTML = '';
  
  // Resetear contadores
  document.getElementById('productos-procesados').textContent = '0';
  document.getElementById('productos-creados').textContent = '0';
  document.getElementById('productos-actualizados').textContent = '0';
  document.getElementById('productos-errores').textContent = '0';
  
  // Agregar entrada de inicio del proceso
  addLogEntry('Iniciando proceso de importación...', 'info');
  addLogEntry(`Archivo seleccionado: ${file.name} (${formatBytes(file.size)})`, 'info');
  
  // Configurar botón para limpiar logs
  document.getElementById('btn-clear-logs').onclick = function() {
    logsContent.innerHTML = '';
    addLogEntry('Logs limpiados', 'info');
  };
  
  // Configurar botón para cerrar detalles
  document.getElementById('btn-close-details').onclick = function() {
    detailsContainer.style.display = 'none';
  };
  
  // Configurar listeners para los elementos estadísticos
  document.querySelectorAll('.stat-item.clickable').forEach(item => {
    item.onclick = function() {
      showDetailsByType(this.dataset.type);
    };
  });
  
  showLoading();
  
  fetch('/api/productos/importar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.message || 'Error al importar productos');
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Productos importados correctamente', 'success');
    
    console.log("Datos de importación recibidos:", data);
    
    // Actualizar estadísticas primero
    const stats = data.data || {};
    const total = parseInt(stats.procesados || 0);
    
    document.getElementById('productos-procesados').textContent = total;
    document.getElementById('productos-creados').textContent = stats.creados || 0;
    document.getElementById('productos-actualizados').textContent = stats.actualizados || 0;
    document.getElementById('productos-errores').textContent = stats.errores || 0;
    
    // Guardar detalles de la importación si están disponibles
    if (data.data && data.data.detalle) {
      console.log("Detalles en data.data.detalle:", data.data.detalle);
      if (Array.isArray(data.data.detalle.procesados)) importDetails.procesados = data.data.detalle.procesados;
      if (Array.isArray(data.data.detalle.creados)) importDetails.creados = data.data.detalle.creados;
      if (Array.isArray(data.data.detalle.actualizados)) importDetails.actualizados = data.data.detalle.actualizados;
      if (Array.isArray(data.data.detalle.errores)) importDetails.errores = data.data.detalle.errores;
    }
    // Verificar si los detalles están en data.detalle directamente
    else if (data.detalle) {
      console.log("Detalles en data.detalle:", data.detalle);
      if (Array.isArray(data.detalle.procesados)) importDetails.procesados = data.detalle.procesados;
      if (Array.isArray(data.detalle.creados)) importDetails.creados = data.detalle.creados;
      if (Array.isArray(data.detalle.actualizados)) importDetails.actualizados = data.detalle.actualizados;
      if (Array.isArray(data.detalle.errores)) importDetails.errores = data.detalle.errores;
    }
    
    // Si no hay detalle específico, tratar de construir al menos la lista de errores
    if (data.errors && Array.isArray(data.errors)) {
      console.log("Errores en data.errors:", data.errors);
      if (importDetails.errores.length === 0) {
        importDetails.errores = data.errors.map((error, index) => {
          if (typeof error === 'string') {
            return { 
              codigo: `Error-${index + 1}`, 
              nombre: "Producto con error", 
              mensaje: error, 
              detalles: "Error de validación" 
            };
          }
          return error;
        });
      }
    }
    
    console.log("Estado final de importDetails:", importDetails);
    
    // Agregar entradas de log para el resultado
    addLogEntry(`Importación completada: ${stats.creados} productos creados, ${stats.actualizados} actualizados`, 'success');
    
    // Si hay errores, mostrarlos con detalle
    if (stats.errores && stats.errores > 0) {
      // Verificar si tenemos errores detallados en el backend o en la respuesta directa
      let errorsArray = [];
      
      if (data.data && data.data.detalle && Array.isArray(data.data.detalle.errores)) {
        errorsArray = data.data.detalle.errores;
      } else if (data.detalle && Array.isArray(data.detalle.errores)) {
        errorsArray = data.detalle.errores;
      } else if (data.errors && Array.isArray(data.errors)) {
        errorsArray = data.errors;
      }
      
      addLogEntry(`Se encontraron ${stats.errores} errores durante la importación. Haga clic en "Errores" para ver detalles.`, 'error');
      
      // Procesar cada error
      errorsArray.forEach((errorItem, index) => {
        // Si el error es un objeto con mensaje o un string simple
        const errorMessage = typeof errorItem === 'object' ? errorItem.mensaje : errorItem;
        
        // Si el mensaje de error es undefined o no existe, usar un mensaje genérico
        const safeErrorMessage = errorMessage || `Error desconocido en producto #${index + 1}`;
        
        // Detectar errores específicos para mostrar mensajes más descriptivos
        if (safeErrorMessage.includes('categoría') || safeErrorMessage.includes('categoria')) {
          const errorPartes = safeErrorMessage.split('ID de categoría');
          let errorFormateado = safeErrorMessage;
          
          if (errorPartes.length > 1) {
            // Extraer el ID de categoría del mensaje
            const match = safeErrorMessage.match(/ID de categoría (\d+)/);
            const categoriaId = match ? match[1] : '';
            
            errorFormateado = safeErrorMessage.replace(
              `ID de categoría ${categoriaId}`,
              `ID de categoría <span class="highlight-categoria">${categoriaId}</span>`
            );
            
            addLogEntry(errorFormateado, 'error');
            
            // Agregar sugerencia para categorías
            addCategoriasSugerencia();
          } else {
            addLogEntry(safeErrorMessage, 'error');
          }
        } else {
          addLogEntry(safeErrorMessage, 'error');
        }
        
        // Guardar errores en importDetails si no están ya
        if (!importDetails.errores || importDetails.errores.length === 0) {
          if (typeof errorItem === 'string') {
            importDetails.errores.push({
              codigo: `Error-${index + 1}`,
              nombre: "Producto con error",
              mensaje: errorItem || "Error desconocido",
              detalles: "Error durante la importación"
            });
          } else {
            importDetails.errores.push(errorItem);
          }
        }
      });
      
      // Agregar consejo general para corregir errores
      addLogEntry('Revise los datos de su archivo y asegúrese de que todas las referencias sean válidas', 'warning');
    }
    
    loadProductos(); // Recargar la lista de productos
  })
  .catch(error => {
    console.error('Error al importar productos:', error);
    showToast(error.message, 'error');
    
    addLogEntry(`Error en la importación: ${error.message}`, 'error');
    
    // Verificar tipos específicos de errores conocidos
    if (error.message.includes('MIME') || error.message.includes('formato')) {
      addLogEntry('El archivo seleccionado no es un CSV o Excel válido. Por favor, utilice la plantilla proporcionada.', 'error');
    } else if (error.message.includes('categoría') || error.message.includes('categoria')) {
      addLogEntry('Hay problemas con las categorías en el archivo. Asegúrese de que todos los IDs de categoría existan en el sistema.', 'error');
      // Mostrar ayuda con las categorías disponibles
      addCategoriasSugerencia();
    } else if (error.message.includes('Cannot read properties')) {
      addLogEntry('Error de procesamiento interno. Esto puede deberse a un formato incorrecto en el archivo.', 'error');
      addLogEntry('Asegúrese de que las columnas del archivo coincidan con la plantilla descargada.', 'warning');
    }
  })
  .finally(() => {
    hideLoading();
    
    // Asegurarse de que el contenedor de logs esté visible y desplazarse al final
    logsContainer.style.display = 'block';
    logsContent.scrollTop = logsContent.scrollHeight;
  });
}

// Función para mostrar detalles según el tipo seleccionado
function showDetailsByType(type) {
  const detailsContainer = document.getElementById('import-details-container');
  const detailsContent = document.getElementById('import-details');
  const detailTitle = document.getElementById('detail-title');
  
  // Definir títulos según el tipo
  const titles = {
    procesados: 'Productos Procesados',
    creados: 'Productos Creados',
    actualizados: 'Productos Actualizados',
    errores: 'Productos con Errores'
  };
  
  detailTitle.textContent = titles[type] || 'Detalles';
  detailsContent.innerHTML = '';
  
  console.log(`Mostrando detalles de tipo: ${type}`);
  console.log("Datos disponibles:", importDetails);
  
  // Si no hay datos, mostrar mensaje
  if (!importDetails[type] || importDetails[type].length === 0) {
    detailsContent.innerHTML = `<div class="empty-details">No hay información detallada disponible para ${titles[type].toLowerCase()}</div>`;
    detailsContainer.style.display = 'block';
    return;
  }
  
  // Construir contenido según el tipo
  switch (type) {
    case 'errores':
      renderErrorDetails(container);
      break;
    case 'creados':
      renderCreatedDetails(container);
      break;
    case 'actualizados':
      renderUpdatedDetails(container);
      break;
    case 'procesados':
    default:
      renderProcessedDetails(container);
      break;
  }
  
  detailsContainer.style.display = 'block';
}

// Renderizar detalles de productos con errores
function renderErrorDetails(container) {
  if (importDetails.errores.length === 0) {
    container.innerHTML = '<div class="empty-details">No hay errores para mostrar</div>';
    return;
  }
  
  let html = '<div class="details-list error-list">';
  
  importDetails.errores.forEach((error, index) => {
    html += `
      <div class="detail-item error-item">
        <div class="detail-header">
          <span class="detail-number">${index + 1}</span>
          <h4>${error.codigo || 'Sin código'}: ${error.nombre || 'Producto desconocido'}</h4>
        </div>
        <div class="detail-content">
          <p class="error-message">${error.mensaje || 'Error desconocido'}</p>
          ${error.detalles ? `<p class="error-detail"><strong>Detalles:</strong> ${error.detalles}</p>` : ''}
          ${error.sugerencia ? `<p class="error-suggestion"><strong>Sugerencia:</strong> ${error.sugerencia}</p>` : ''}
          ${error.fila ? `<p class="error-row"><strong>Fila en Excel:</strong> ${error.fila}</p>` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Renderizar detalles de productos creados
function renderCreatedDetails(container) {
  if (importDetails.creados.length === 0) {
    container.innerHTML = '<div class="empty-details">No hay productos creados para mostrar</div>';
    return;
  }
  
  let html = '<div class="details-list created-list">';
  
  importDetails.creados.forEach((producto, index) => {
    html += `
      <div class="detail-item created-item">
        <div class="detail-header">
          <span class="detail-number">${index + 1}</span>
          <h4>${producto.codigo}: ${producto.nombre}</h4>
        </div>
        <div class="detail-content">
          <p><strong>Categoría:</strong> ${producto.categoria || 'N/A'}</p>
          <p><strong>Precio:</strong> $${parseFloat(producto.precio || 0).toFixed(2)}</p>
          <p><strong>Stock:</strong> ${producto.stock || 0} unidades</p>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Renderizar detalles de productos actualizados
function renderUpdatedDetails(container) {
  if (importDetails.actualizados.length === 0) {
    container.innerHTML = '<div class="empty-details">No hay productos actualizados para mostrar</div>';
    return;
  }
  
  let html = '<div class="details-list updated-list">';
  
  importDetails.actualizados.forEach((producto, index) => {
    html += `
      <div class="detail-item updated-item">
        <div class="detail-header">
          <span class="detail-number">${index + 1}</span>
          <h4>${producto.codigo}: ${producto.nombre}</h4>
        </div>
        <div class="detail-content">
          <p><strong>Campos actualizados:</strong> ${producto.campos_actualizados || 'Información completa'}</p>
          ${producto.stock_anterior !== undefined ? 
            `<p><strong>Stock:</strong> ${producto.stock_anterior || 0} → ${producto.stock_nuevo || 0}</p>` : ''}
          ${producto.precio_anterior !== undefined ? 
            `<p><strong>Precio:</strong> $${parseFloat(producto.precio_anterior || 0).toFixed(2)} → $${parseFloat(producto.precio_nuevo || 0).toFixed(2)}</p>` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Renderizar detalles de productos procesados
function renderProcessedDetails(container) {
  if (importDetails.procesados.length === 0) {
    container.innerHTML = '<div class="empty-details">No hay información detallada disponible para productos procesados</div>';
    return;
  }
  
  let html = '<div class="details-list processed-list">';
  
  importDetails.procesados.forEach((producto, index) => {
    html += `
      <div class="detail-item processed-item">
        <div class="detail-header">
          <span class="detail-number">${index + 1}</span>
          <h4>${producto.codigo || 'Sin código'}: ${producto.nombre || 'Producto sin nombre'}</h4>
        </div>
        <div class="detail-content">
          <p><strong>Estado:</strong> <span class="badge ${getStatusClass(producto.estado)}">${producto.estado || 'Procesado'}</span></p>
          <p><strong>Categoría:</strong> ${producto.categoria || 'N/A'}</p>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Función auxiliar para determinar la clase CSS según el estado del producto
function getStatusClass(estado) {
  if (!estado) return '';
  
  switch(estado.toLowerCase()) {
    case 'creado': return 'success';
    case 'actualizado': return 'info';
    case 'error': return 'error';
    case 'procesando': return 'warning';
    default: return '';
  }
}

// Función para agregar entradas al log de importación
function addLogEntry(message, type = 'info') {
  const logsContent = document.getElementById('import-logs');
  if (!logsContent) return;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  
  let icon = '';
  switch (type) {
    case 'success': icon = '<i class="fas fa-check-circle"></i> '; break;
    case 'error': icon = '<i class="fas fa-times-circle"></i> '; break;
    case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i> '; break;
    case 'info': 
    default: icon = '<i class="fas fa-info-circle"></i> '; break;
  }
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-timestamp">${timeStr}</span>
    <span class="log-category">${type.toUpperCase()}</span>
    ${icon}${message}
  `;
  
  logsContent.appendChild(entry);
  
  // Desplazarse al final del log
  logsContent.scrollTop = logsContent.scrollHeight;
}

// Función para agregar sugerencia con las categorías disponibles
function addCategoriasSugerencia() {
  addLogEntry('Revisando categorías disponibles en el sistema...', 'info');
  
  const categoriasSelect = document.getElementById('categoria_id');
  if (categoriasSelect && categoriasSelect.options.length > 1) {
    let categoriasMsg = 'Categorías disponibles: ';
    const categoriasList = [];
    
    // Excluir la primera opción que generalmente es "Seleccione una categoría"
    for (let i = 1; i < categoriasSelect.options.length; i++) {
      const option = categoriasSelect.options[i];
      categoriasList.push(`ID ${option.value} = "${option.textContent}"`);
    }
    
    addLogEntry(categoriasMsg + categoriasList.join(', '), 'info');
    addLogEntry('Corrija los IDs de categoría en su archivo y vuelva a intentar la importación', 'warning');
  } else {
    addLogEntry('No se encontraron categorías disponibles. Por favor, cree categorías primero.', 'warning');
  }
}

// Función para formatear tamaños de archivo
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Sistema de notificaciones Toast mejorado
function showToast(message, type = 'info') {
  // Iconos según el tipo de notificación
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  // Crear elemento toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Estructura interna del toast
  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  // Añadir al contenedor
  const container = document.querySelector('.toast-container');
  container.appendChild(toast);
  
  // Configurar botón de cerrar
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });
  
  // Auto eliminar después de 6 segundos (aumentado de 3 a 6)
  setTimeout(() => {
    if (toast.parentElement) {
      // Añadir clase para animación de desvanecimiento
      toast.classList.add('fade-out');
      // Esperar a que termine la animación antes de remover
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 500); // 500ms para la animación
    }
  }, 6000);
}

// Crear diálogo de confirmación moderno
function createConfirmDialog() {
  const dialogHTML = `
    <div class="confirm-overlay"></div>
    <div class="confirm-dialog">
      <div class="confirm-dialog-header">
        <i class="fas fa-question-circle"></i>
        <h3 id="confirm-title">Confirmar acción</h3>
      </div>
      <div class="confirm-dialog-content" id="confirm-message">
        ¿Está seguro que desea realizar esta acción?
      </div>
      <div class="confirm-dialog-actions">
        <button id="confirm-cancel" class="secondary">Cancelar</button>
        <button id="confirm-ok" class="primary">Aceptar</button>
      </div>
    </div>
  `;
  
  // Insertar en el DOM
  const dialogContainer = document.createElement('div');
  dialogContainer.id = 'confirm-container';
  dialogContainer.innerHTML = dialogHTML;
  document.body.appendChild(dialogContainer);
  
  // Configurar eventos
  const overlay = document.querySelector('.confirm-overlay');
  const dialog = document.querySelector('.confirm-dialog');
  const cancelBtn = document.getElementById('confirm-cancel');
  
  overlay.addEventListener('click', hideConfirm);
  cancelBtn.addEventListener('click', hideConfirm);
}

// Mostrar diálogo de confirmación mejorado con soporte para tercer botón
function showConfirm(title, message, iconClass, onConfirm, onCancel, options) {
  const overlay = document.querySelector('.confirm-overlay');
  const dialog = document.querySelector('.confirm-dialog');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const iconEl = dialog.querySelector('.confirm-dialog-header i');
  const confirmBtn = document.getElementById('confirm-ok');
  const actionsContainer = document.querySelector('.confirm-dialog-actions');
  
  // Actualizar contenido
  titleEl.textContent = title;
  
  // Permitir HTML en el mensaje si contiene etiquetas <br>
  if (message.includes('<br>')) {
    messageEl.innerHTML = message;
  } else {
    messageEl.textContent = message;
  }
  
  if (iconClass) {
    iconEl.className = `fas ${iconClass}`;
  } else {
    iconEl.className = 'fas fa-question-circle';
  }
  
  // Eliminar el botón adicional si existe de una ejecución anterior
  const existingAdditionalBtn = document.getElementById('confirm-additional');
  if (existingAdditionalBtn) {
    existingAdditionalBtn.remove();
  }
  
  // Configurar botón de confirmar
  const cancelBtn = document.getElementById('confirm-cancel');
  
  confirmBtn.onclick = () => {
    hideConfirm();
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  };
  
  cancelBtn.onclick = () => {
    hideConfirm();
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };
  
  // Si se proporcionan opciones, procesarlas
  if (options) {
    // Cambiar texto del botón OK si se especifica
    if (options.okButtonText) {
      confirmBtn.textContent = options.okButtonText;
    } else {
      confirmBtn.textContent = 'Aceptar';
    }
    
    // Añadir botón adicional si se especifica
    if (options.additionalButton) {
      const additionalBtn = document.createElement('button');
      additionalBtn.id = 'confirm-additional';
      additionalBtn.textContent = options.additionalButton.text || 'Opción adicional';
      
      // Añadir clases específicas si se han definido
      if (options.additionalButton.className) {
        const classes = options.additionalButton.className.split(' ');
        classes.forEach(cls => additionalBtn.classList.add(cls));
      } else {
        additionalBtn.classList.add('primary'); // Clase por defecto
      }
      
      // Configurar el evento click
      additionalBtn.onclick = () => {
        hideConfirm();
        if (typeof options.additionalButton.onClick === 'function') {
          options.additionalButton.onClick();
        }
      };
      
      // Insertar entre el botón de cancelar y el botón OK
      cancelBtn.parentNode.insertBefore(additionalBtn, confirmBtn);
    }
  } else {
    // Restaurar texto por defecto si no hay opciones
    confirmBtn.textContent = 'Aceptar';
  }
  
  // Mostrar diálogo
  overlay.classList.add('active');
  dialog.classList.add('active');
}

// Ocultar diálogo de confirmación
function hideConfirm() {
  const overlay = document.querySelector('.confirm-overlay');
  const dialog = document.querySelector('.confirm-dialog');
  
  overlay.classList.remove('active');
  dialog.classList.remove('active');
}

// Utilidades
function showLoading() {
  // Implementar lógica de loading
  document.body.classList.add('loading');
}

function hideLoading() {
  // Ocultar loading
  document.body.classList.remove('loading');
}

// Funciones para el manejo de productos desactivados
function showInactiveProductsModal() {
  const modal = document.getElementById('inactive-products-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  loadInactiveProducts();
  modal.classList.add('active');
  modalOverlay.classList.add('active');
}

function closeInactiveProductsModal() {
  const modal = document.getElementById('inactive-products-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  modal.classList.remove('active');
  modalOverlay.classList.remove('active');
}

function loadInactiveProducts() {
  const token = localStorage.getItem('token');
  const productsList = document.getElementById('inactive-products-list');
  
  fetch('/api/productos?activo=false', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar productos desactivados');
    }
    return response.json();
  })
  .then(data => {
    inactiveProducts = data.productos || data.data || [];
    renderInactiveProducts(inactiveProducts);
  })
  .catch(error => {
    console.error('Error:', error);
    productsList.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">Error al cargar productos desactivados: ${error.message}</td>
      </tr>
    `;
    showToast(error.message, 'error');
  });
}

function renderInactiveProducts(products) {
  const productsList = document.getElementById('inactive-products-list');
  
  if (!products || products.length === 0) {
    productsList.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">No hay productos desactivados</td>
      </tr>
    `;
    return;
  }
  
  productsList.innerHTML = products.map(producto => `
    <tr>
      <td>
        ${producto.imagen 
          ? `<img src="${producto.imagen}" alt="${producto.nombre}" class="producto-thumbnail">`
          : '<div class="no-image"><i class="fas fa-box"></i></div>'}
      </td>
      <td>${producto.codigo || '-'}</td>
      <td>${producto.nombre}</td>
      <td>${producto.categoria ? producto.categoria.nombre : 'Sin categoría'}</td>
      <td>$${parseFloat(producto.precio_compra || 0).toFixed(2)}</td>
      <td>$${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="editProducto('${producto.codigo}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" onclick="toggleProductoStatus('${producto.codigo}', true)" title="Activar">
            <i class="fas fa-toggle-off"></i>
          </button>
          <button class="btn-icon" onclick="showHistorial('${producto.codigo}')" title="Ver historial">
            <i class="fas fa-history"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Configurar drag & drop para imágenes
function setupImageDropzone() {
  const dropzone = document.getElementById('image-dropzone');
  const imageInput = document.getElementById('image-input');
  const selectImageBtn = document.getElementById('select-image');
  const removeImageBtn = document.getElementById('remove-image');
  const previewContainer = document.querySelector('.preview-container');
  const imagePreview = document.getElementById('image-preview');
  const dropzoneContent = document.querySelector('.dropzone-content');
  
  // Variables para la compresión
  const maxWidth = 1024;  // Ancho máximo para imágenes
  const maxHeight = 1024; // Alto máximo para imágenes
  const quality = 0.8;    // Calidad de compresión (0-1)
  let originalFile = null; // Para guardar el archivo original
  let currentFile = null; // Para guardar el archivo comprimido

  // Manejar click en el botón de seleccionar archivo
  selectImageBtn.addEventListener('click', () => {
    imageInput.click();
  });

  // Manejar cambio en el input de archivo
  imageInput.addEventListener('change', handleImageSelect);

  // Eventos de arrastrar y soltar
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  });

  // Manejar eliminación de imagen
  removeImageBtn.addEventListener('click', () => {
    originalFile = null;
    currentFile = null;
    imagePreview.src = '';
    previewContainer.style.display = 'none';
    dropzoneContent.style.display = 'block';
    imageInput.value = '';
    
    // Eliminar mensaje de compresión si existe
    const compressionInfo = document.querySelector('.compression-info');
    if (compressionInfo) {
      compressionInfo.remove();
    }
  });

  function handleImageSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  }

  function handleImageFile(file) {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showToast('Por favor seleccione un archivo de imagen válido', 'error');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    // Guardar referencia al archivo original
    originalFile = file;
    
    // Si el archivo ya es pequeño (menos de 200KB), no comprimirlo
    if (file.size <= 200 * 1024) {
      currentFile = file;
      loadImagePreview(file);
      return;
    }
    
    // Comprimir la imagen
    compressImage(file)
      .then(compressedFile => {
        currentFile = compressedFile;
        loadImagePreview(compressedFile);
        
        // Mostrar información sobre la compresión
        showCompressionInfo(file.size, compressedFile.size);
      })
      .catch(error => {
        console.error('Error al comprimir imagen:', error);
        // Si hay error, usar el archivo original
        currentFile = file;
        loadImagePreview(file);
        showToast('No se pudo comprimir la imagen, se usará la original', 'warning');
      });
  }
  
  // Función para cargar la vista previa de la imagen
  function loadImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewContainer.style.display = 'block';
      dropzoneContent.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
  
  // Función para comprimir una imagen usando canvas
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round(width * maxHeight / height);
          height = maxHeight;
        }
        
        // Crear canvas para la compresión
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar la imagen en el canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con la calidad especificada
        canvas.toBlob(blob => {
          // Crear un nuevo File a partir del blob
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: new Date().getTime()
          });
          
          // Liberar memoria
          URL.revokeObjectURL(img.src);
          
          resolve(compressedFile);
        }, file.type, quality);
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
      };
    });
  }
  
  // Mostrar información sobre la compresión realizada
  function showCompressionInfo(originalSize, compressedSize) {
    // Eliminar mensaje anterior si existe
    const oldInfo = document.querySelector('.compression-info');
    if (oldInfo) {
      oldInfo.remove();
    }
    
    // Calcular porcentaje de compresión
    const reduction = Math.round((1 - (compressedSize / originalSize)) * 100);
    
    // Crear elemento para mostrar la información
    const infoElement = document.createElement('div');
    infoElement.className = 'compression-info';
    infoElement.innerHTML = `
      <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
        <i class="fas fa-compress-alt"></i> Imagen comprimida (${reduction}% reducción)
        <div style="font-size: 0.85em;">
          Original: ${formatBytes(originalSize)} → Comprimida: ${formatBytes(compressedSize)}
        </div>
      </div>
    `;
    
    // Añadir después del preview
    if (previewContainer) {
      previewContainer.appendChild(infoElement);
    }
  }

  // Función para obtener la imagen actual
  window.getCurrentImageFile = () => currentFile;
  
  // Función para obtener la imagen original (sin comprimir)
  window.getOriginalImageFile = () => originalFile;
}

// Ver gestión de códigos de barras
function showCodigosBarras(productoId) {
  const token = localStorage.getItem('token');
  
  // Buscar el producto por su código (clave primaria)
  const producto = productos.find(p => p.codigo === productoId);
  
  if (!producto) {
    showToast('Producto no encontrado', 'error');
    return;
  }
  
  const modal = document.getElementById('codigos-barras-modal');
  if (!modal) {
    showToast('Error al abrir la gestión de códigos de barras', 'error');
    return;
  }
  
  // Resetear el formulario
  document.getElementById('codigo-barras-form').reset();
  
  document.getElementById('producto-nombre-barcode').textContent = producto.nombre;
  document.getElementById('barcode-list').innerHTML = '<tr><td colspan="4" class="text-center">Cargando códigos de barras...</td></tr>';
  
  const modalOverlay = document.querySelector('.modal-overlay');
  
  modal.classList.add('active');
  modalOverlay.classList.add('active');
  
  // Configurar formulario para añadir códigos de barras
  document.getElementById('codigo-barras-form').onsubmit = function(e) {
    e.preventDefault();
    agregarCodigoBarras(productoId);
  };
  
  // Cargar códigos de barras existentes
  cargarCodigosBarras(productoId);
  
  // Configurar botón de escaneo con cámara
  document.getElementById('btn-scan-barcode').onclick = function() {
    iniciarEscaner(productoId);
  };
  
  // Inicializar el scanner por teclado para el campo de código de barras
  const barcodeInput = document.getElementById('barcode-input');
  if (window.BarcodeScanner) {
    // Configurar el scanner con opciones
    const scanner = new BarcodeScanner({
      // Tiempo máximo entre pulsaciones de teclas (para considerarlas parte del mismo código)
      timeGap: 150,
      // Longitud mínima del código para ser procesado
      minLength: 4,
      // Callback cuando se detecta un código
      onScan: function(codigo, tipo) {
        showToast('Código detectado: ' + codigo, 'success');
        // Puedes validar el código aquí si es necesario antes de agregarlo
        barcodeInput.value = codigo;
        
        // Si queremos que se envíe automáticamente el formulario al escanear
        // document.getElementById('barcode-tipo').value = tipo;
        // agregarCodigoBarras(productoId);
      },
      // Callback en caso de error en la lectura
      onError: function(error) {
        console.error('Error en lectura de código:', error);
        showToast('Error al leer código de barras: ' + error.message, 'error');
      }
    });
    
    // Configurar el input para capturar eventos del lector de códigos
    scanner.setupInput(barcodeInput);
  }
  
  // Generar un código aleatorio según el tipo seleccionado
  document.getElementById('generate-barcode').onclick = function() {
    const tipo = document.getElementById('barcode-tipo').value;
    if (window.BarcodeScanner) {
      const scanner = new BarcodeScanner();
      barcodeInput.value = scanner.generateBarcode(tipo);
    } else {
      // Fallback simple para generar códigos numéricos aleatorios
      let code = '';
      for (let i = 0; i < 13; i++) {
        code += Math.floor(Math.random() * 10);
      }
      barcodeInput.value = code;
    }
  };
}

function closeCodigosBarrasModal() {
  const modal = document.getElementById('codigos-barras-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal) modal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

function cargarCodigosBarras(productoId) {
  const token = localStorage.getItem('token');
  
  fetch(`/api/productos/${productoId}/codigos-barras`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar códigos de barras');
    }
    return response.json();
  })
  .then(data => {
    renderCodigosBarras(data.data || [], productoId);
  })
  .catch(error => {
    console.error('Error al cargar códigos de barras:', error);
    document.getElementById('barcode-list').innerHTML = `
      <tr><td colspan="4" class="text-center">Error al cargar códigos de barras: ${error.message}</td></tr>
    `;
    showToast('Error al cargar códigos de barras', 'error');
  });
}

function renderCodigosBarras(codigos, productoId) {
  const codigosList = document.getElementById('barcode-list');
  
  if (!codigos || codigos.length === 0) {
    codigosList.innerHTML = '<tr><td colspan="4" class="text-center">No hay códigos de barras registrados</td></tr>';
    return;
  }
  
  codigosList.innerHTML = '';
  
  codigos.forEach(codigo => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${codigo.codigo}</td>
      <td>${codigo.tipo}</td>
      <td>${codigo.principal ? '<span class="badge active">Principal</span>' : '-'}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="eliminarCodigoBarras('${productoId}', ${codigo.id})" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    codigosList.appendChild(row);
  });
}

function agregarCodigoBarras(productoId) {
  const token = localStorage.getItem('token');
  const codigo = document.getElementById('barcode-input').value;
  const tipo = document.getElementById('barcode-tipo').value;
  const principal = document.getElementById('barcode-principal').checked;
  
  if (!codigo) {
    showToast('El código de barras es requerido', 'error');
    return;
  }
  
  fetch(`/api/productos/${productoId}/codigos-barras`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      codigo,
      tipo,
      principal
    })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.message || 'Error al registrar código de barras');
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Código de barras registrado correctamente', 'success');
    document.getElementById('codigo-barras-form').reset();
    cargarCodigosBarras(productoId);
  })
  .catch(error => {
    console.error('Error al registrar código de barras:', error);
    showToast(error.message, 'error');
  });
}

function eliminarCodigoBarras(productoId, codigoId) {
  const token = localStorage.getItem('token');
  
  showConfirm(
    'Eliminar Código de Barras',
    '¿Está seguro que desea eliminar este código de barras?',
    'fa-barcode',
    () => {
      fetch(`/api/productos/${productoId}/codigos-barras/${codigoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.message || 'Error al eliminar código de barras');
          });
        }
        return response.json();
      })
      .then(data => {
        showToast('Código de barras eliminado correctamente', 'success');
        cargarCodigosBarras(productoId);
      })
      .catch(error => {
        console.error('Error al eliminar código de barras:', error);
        showToast(error.message, 'error');
      });
    }
  );
}

// Función para iniciar el escáner de códigos de barras
function iniciarEscaner(productoId) {
  const scannerContainer = document.getElementById('scanner-container');
  const previewElement = document.getElementById('scanner-preview');
  const closeButton = document.getElementById('close-scanner');
  
  // Mostrar el contenedor del escáner
  scannerContainer.style.display = 'block';
  
  // Agregar mensaje de estado
  const scannerMessage = document.querySelector('.scanner-message');
  scannerMessage.textContent = 'Iniciando cámara...';
  
  // Configurar el botón para cerrar el escáner
  closeButton.onclick = function() {
    detenerEscaner();
    scannerContainer.style.display = 'none';
  };
  
  // Verificar si Quagga está disponible
  if (typeof Quagga !== 'undefined') {
    initBarcodeScanner(previewElement, function(codigo) {
      document.getElementById('barcode-input').value = codigo;
      detenerEscaner();
      scannerContainer.style.display = 'none';
      showToast('Código de barras escaneado correctamente', 'success');
    });
    
    // Actualizar mensaje cuando la cámara esté activa
    setTimeout(() => {
      scannerMessage.textContent = 'Coloque el código de barras frente a la cámara';
    }, 1500);
  } else {
    // Cargar la biblioteca Quagga si no está disponible
    loadQuaggaJS(function() {
      initBarcodeScanner(previewElement, function(codigo) {
        document.getElementById('barcode-input').value = codigo;
        detenerEscaner();
        scannerContainer.style.display = 'none';
        showToast('Código de barras escaneado correctamente', 'success');
      });
      
      // Actualizar mensaje cuando la cámara esté activa
      setTimeout(() => {
        scannerMessage.textContent = 'Coloque el código de barras frente a la cámara';
      }, 1500);
    });
  }
}

// Función para cargar Quagga.js si no está disponible
function loadQuaggaJS(callback) {
  console.log('Cargando biblioteca Quagga.js...');
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js';
  script.onload = function() {
    console.log('Biblioteca Quagga.js cargada correctamente');
    if (typeof callback === 'function') {
      callback();
    }
  };
  script.onerror = function() {
    console.error('Error al cargar la biblioteca Quagga.js');
    showToast('Error al cargar el escáner de códigos de barras', 'error');
  };
  document.head.appendChild(script);
}

// Función para iniciar el escáner de códigos de barras para búsqueda
function iniciarEscanerParaBusqueda() {
  // Mostrar el contenedor del escáner
  const scannerContainer = document.getElementById('scanner-container');
  if (!scannerContainer) {
    showToast('Error al inicializar el escáner', 'error');
    return;
  }
  
  // Verificar compatibilidad de la cámara antes de continuar
  if (typeof checkCameraCompatibility === 'function') {
    checkCameraCompatibility()
      .then(info => {
        console.log(`Dispositivo con ${info.count} cámaras detectadas`);
        startScannerProcess();
      })
      .catch(error => {
        console.error('Problema de compatibilidad con la cámara:', error);
        // Mostrar solución alternativa si la cámara no es compatible
        if (typeof cameraFallbackSolution === 'function') {
          cameraFallbackSolution(error.type);
        } else {
          showToast('Tu dispositivo no tiene una cámara compatible o no has otorgado permisos', 'error');
        }
      });
  } else {
    // Si la función de verificación no está disponible, continuar con el proceso normal
    startScannerProcess();
  }
  
  function startScannerProcess() {
    scannerContainer.style.display = 'block';
    
    // Referencia al elemento donde se mostrará la vista previa
    const previewElement = document.getElementById('scanner-preview');
    
    // Configurar el botón para cerrar el escáner
    const closeButton = document.getElementById('close-scanner');
    if (closeButton) {
      closeButton.onclick = function() {
        detenerEscaner();
        scannerContainer.style.display = 'none';
      };
    }
    
    // Verificar si la función de inicialización del escáner está disponible
    if (typeof initBarcodeScanner !== 'function') {
      // Cargar el script de barcode-scanner.js si no está ya cargado
      const script = document.createElement('script');
      script.src = '/js/utils/barcode-scanner.js';
      script.onload = function() {
        // Una vez cargado el script, iniciar el escáner
        iniciarEscanerProcesoFinal();
      };
      script.onerror = function() {
        showToast('No se pudo cargar el escáner de códigos de barras', 'error');
        scannerContainer.style.display = 'none';
      };
      document.head.appendChild(script);
    } else {
      // Si ya está cargado, iniciar directamente
      iniciarEscanerProcesoFinal();
    }
  }
  
  function iniciarEscanerProcesoFinal() {
    // Actualizar mensaje del escáner
    const scannerMessage = document.querySelector('.scanner-message');
    if (scannerMessage) {
      scannerMessage.textContent = 'Iniciando cámara...';
    }
    
    try {
      // Iniciar el escáner con la función de la biblioteca
      initBarcodeScanner(document.getElementById('scanner-preview'), function(codigo) {
        console.log("====== DIAGNÓSTICO DE ESCANEO ======");
        console.log("1. Código detectado por el escáner:", codigo);
        
        // Cuando se detecta un código de barras, asignar directamente al input
        const inputBarcode = document.getElementById('search-barcode-input');
        inputBarcode.value = codigo.trim();
        console.log("2. Código asignado al input:", inputBarcode.value);
        
        // Detener el escáner y ocultar el contenedor
        detenerEscaner();
        scannerContainer.style.display = 'none';
        
        // Notificar al usuario
        showToast('Código de barras escaneado: ' + codigo, 'success');
        
        // Buscar el producto inmediatamente por código de barras
        console.log("3. Preparando búsqueda en API para código:", codigo);
        
        const token = localStorage.getItem('token');
        console.log("4. Token disponible:", token ? "Sí" : "No");
        
        const resultsContainer = document.getElementById('barcode-search-results');
        console.log("5. Contenedor de resultados encontrado:", resultsContainer ? "Sí" : "No");
        
        // Mostrar mensaje de carga en el contenedor de resultados
        resultsContainer.innerHTML = `
          <div class="loading-result">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Buscando producto con código: ${codigo}...</p>
          </div>
        `;
        console.log("6. Mensaje de carga mostrado en el contenedor");
        
        // Llamar directamente a la API sin pasar por searchByBarcode para evitar problemas
        const apiUrl = `/api/productos/barcode/${encodeURIComponent(codigo.trim())}`;
        console.log("7. URL de la API a llamar:", apiUrl);
        
        fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          console.log("8. Respuesta API recibida, status:", response.status);
          console.log("9. Headers de respuesta:", Array.from(response.headers.entries()));
          
          if (!response.ok) {
            console.error("10. Respuesta no válida:", response.status, response.statusText);
            throw new Error('No se encontró ningún producto con este código de barras');
          }
          return response.json();
        })
        .then(data => {
          console.log("11. Datos recibidos de API:", JSON.stringify(data, null, 2));
          
          if (!data.success || !data.data) {
            console.error("12. Error en respuesta:", data);
            throw new Error('Respuesta inválida del servidor: ' + JSON.stringify(data));
          }
          
          const producto = data.data;
          console.log("13. Producto encontrado:", producto.codigo, producto.nombre);
          
          // Construir la presentación del producto encontrado
          console.log("14. Generando HTML para mostrar el producto");
          const html = `
            <div class="product-result">
              <div class="product-result-header">
                <div class="product-image">
                  ${producto.imagen_url 
                    ? `<img src="${producto.imagen_url}" alt="${producto.nombre}">`
                    : '<div class="no-image"><i class="fas fa-box"></i></div>'}
                </div>
                <div class="product-info">
                  <h3>${producto.nombre}</h3>
                  <p class="product-code">Código: ${producto.codigo}</p>
                  <p class="product-category">Categoría: ${producto.categoria ? producto.categoria.nombre : 'Sin categoría'}</p>
                  <p class="product-stock ${parseInt(producto.cantidad || 0) <= parseInt(producto.stock_minimo || 0) ? 'low-stock' : ''}">
                    <i class="fas fa-layer-group"></i> Stock: <strong>${producto.cantidad || 0}</strong> ${producto.unidad_medida || 'unidad(es)'}
                    ${parseInt(producto.cantidad || 0) <= parseInt(producto.stock_minimo || 0) ? ' <span class="badge warning">Stock Bajo</span>' : ''}
                  </p>
                </div>
              </div>
              <div class="product-details">
                <div class="detail-row">
                  <span class="detail-label">Precio Compra:</span>
                  <span class="detail-value">$${parseFloat(producto.precio_compra || 0).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Precio Venta:</span>
                  <span class="detail-value">$${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Estado:</span>
                  <span class="detail-value">${producto.activo 
                    ? '<span class="badge active">Activo</span>' 
                    : '<span class="badge inactive">Inactivo</span>'}
                  </span>
                </div>
              </div>
              <div class="product-actions">
                <button type="button" class="primary" onclick="editProducto('${producto.codigo}'); closeBarcodeSearchModal();">
                  <i class="fas fa-edit"></i> Editar Producto
                </button>
              </div>
            </div>
          `;
          
          // Actualizar el contenedor con los resultados
          resultsContainer.innerHTML = html;
          console.log("15. HTML insertado en el contenedor de resultados");
          
          // Verificar si el contenedor está visible y dentro de la vista
          const rect = resultsContainer.getBoundingClientRect();
          console.log("16. Posición del contenedor:", rect);
          console.log("17. ¿Contenedor es visible en DOM?", 
                     window.getComputedStyle(resultsContainer).display !== 'none');
          
          console.log("====== FIN DIAGNÓSTICO ======");
        })
        .catch(error => {
          console.error("ERROR en la búsqueda:", error);
          resultsContainer.innerHTML = `
            <div class="empty-result">
              <i class="fas fa-exclamation-triangle"></i>
              <p>${error.message}</p>
              <small>Intente buscar manualmente con el código: ${codigo}</small>
            </div>
          `;
        });
      });
      
      // Actualizar mensaje cuando la cámara esté activa
      setTimeout(() => {
        if (scannerMessage) {
          scannerMessage.textContent = 'Coloque el código de barras frente a la cámara';
        }
      }, 1500);
    } catch (error) {
      console.error("Error crítico al iniciar el escáner:", error);
      showToast('Error al iniciar el escáner de códigos', 'error');
      scannerContainer.style.display = 'none';
    }
  }
}

// Función para detener el escáner de códigos de barras
function detenerEscaner() {
  // Verificar si la función stopBarcodeScanner está disponible (proviene de barcode-scanner.js)
  if (typeof stopBarcodeScanner === 'function') {
    stopBarcodeScanner();
    console.log('Escáner de códigos de barras detenido');
  } else {
    console.warn('La función stopBarcodeScanner no está disponible');
    
    // Intentar detener Quagga directamente como respaldo
    if (typeof Quagga !== 'undefined' && Quagga.stop) {
      try {
        Quagga.stop();
        console.log('Quagga detenido manualmente');
      } catch (error) {
        console.error('Error al detener Quagga:', error);
      }
    }
  }
  
  // Limpiar la vista previa
  const previewElement = document.getElementById('scanner-preview');
  if (previewElement) {
    // Eliminar todos los elementos hijos (video, canvas, etc.)
    while (previewElement.firstChild) {
      previewElement.removeChild(previewElement.firstChild);
    }
  }
}

// Función para mostrar el modal de búsqueda por código de barras
function showBarcodeSearchModal() {
  const modal = document.getElementById('barcode-search-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  if (modal && modalOverlay) {
    modal.classList.add('active');
    modalOverlay.classList.add('active');
    
    // Enfocar el campo de entrada
    setTimeout(() => {
      const input = document.getElementById('search-barcode-input');
      if (input) input.focus();
    }, 100);
  }
}

// Función para actualizar el contador de filtros activos
function updateActiveFiltersCount() {
  const badge = document.getElementById('active-filters-badge');
  if (!badge) return;
  
  let count = 0;
  
  // Contar filtros activos
  const categoriaId = document.getElementById('filter-categoria') ? document.getElementById('filter-categoria').value : '';
  const filterStockValue = document.getElementById('filter-stock-value') ? document.getElementById('filter-stock-value').value : '';
  const filterPrecioMin = document.getElementById('filter-precio-min') ? document.getElementById('filter-precio-min').value : '';
  const filterPrecioMax = document.getElementById('filter-precio-max') ? document.getElementById('filter-precio-max').value : '';
  const filterEstado = document.getElementById('filter-estado') ? document.getElementById('filter-estado').value : '';
  
  if (categoriaId) count++;
  if (filterStockValue) count++;
  if (filterPrecioMin) count++;
  if (filterPrecioMax) count++;
  if (filterEstado) count++;
  
  // Actualizar la visibilidad del badge
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
  
  // También actualizar el estado del botón de resetear filtros
  const btnResetFilters = document.getElementById('btn-reset-filters');
  if (btnResetFilters) {
    btnResetFilters.disabled = count === 0;
  }
}

// Añadir esta función después de loadProductos() para probar específicamente con la categoría ID
function aplicarFiltroCategoria() {
  const categoriaSelect = document.getElementById('filter-categoria');
  if (!categoriaSelect) return;
  
  const categoriaId = categoriaSelect.value;
  if (!categoriaId) {
    showToast('Por favor selecciona una categoría', 'warning');
    return;
  }
  
  const token = localStorage.getItem('token');
  showLoading();
  
  // Construir URL específica para categoría
  const url = `/api/productos?categoria=${categoriaId}&activo=true`;
  
  console.log('Probando URL alternativa para categoría:', url);
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al filtrar por categoría');
    }
    return response.json();
  })
  .then(data => {
    console.log(`Respuesta con filtro alternativo: ${data.productos ? data.productos.length : 0} productos`);
    productos = data.productos || data.data || [];
    totalPages = data.totalPages || 1;
    currentPage = 1;
    renderProductos();
    updatePagination();
  })
  .catch(error => {
    console.error('Error al filtrar por categoría:', error);
    showToast(error.message, 'error');
  })
  .finally(() => {
    hideLoading();
  });
}