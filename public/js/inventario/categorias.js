// Gestión de categorías
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, iniciando script de categorías');
  
  // Referencias a elementos del DOM
  const categoriasListElement = document.getElementById('categorias-list');
  const searchInput = document.getElementById('search-categorias');
  const btnNewCategory = document.getElementById('btn-new-category');
  const categoryModal = document.getElementById('categoria-modal');
  const modalTitle = document.getElementById('modal-title');
  const categoriaForm = document.getElementById('categoria-form');
  const categoriaIdInput = document.getElementById('categoria-id');
  const nombreInput = document.getElementById('nombre');
  const descripcionInput = document.getElementById('descripcion');
  const activoInput = document.getElementById('activo');
  const nombreError = document.getElementById('nombre-error');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSaveCategoria = document.getElementById('btn-save-categoria');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deleteCategoryName = document.getElementById('delete-category-name');
  const confirmModal = document.getElementById('confirm-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  const closeModalButtons = document.querySelectorAll('.close-modal');
  const productosModal = document.getElementById('productos-categoria-modal');
  const categoriaNombreSpan = document.getElementById('categoria-nombre');
  const productosListElement = document.getElementById('productos-categoria-list');
  const searchProductosModalInput = document.getElementById('search-productos-modal');
  const productosLoadingDiv = document.getElementById('productos-loading');
  const productosEmptyDiv = document.getElementById('productos-empty');
  const btnCloseProductos = document.getElementById('btn-close-productos');
  const userDisplay = document.getElementById('user-display');
  const btnLogout = document.getElementById('btn-logout');
  const spinnerOverlay = document.getElementById('spinner-overlay');
  const paginationInfo = document.getElementById('pagination-info');
  const currentPageSpan = document.getElementById('current-page');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const tableHeaders = document.querySelectorAll('#categorias-table th.sortable');
  // Elementos para selección múltiple
  const selectAllCheckbox = document.querySelector('#categorias-table thead input[type="checkbox"]');
  const bulkActionsBar = document.querySelector('.bulk-actions');
  const selectedCountSpan = document.querySelector('.bulk-actions .selected-count');
  const btnBulkActivate = document.getElementById('btn-bulk-activate');
  const btnBulkDeactivate = document.getElementById('btn-bulk-deactivate');
  const btnBulkDelete = document.getElementById('btn-bulk-delete');
  const bulkActionModal = document.getElementById('bulk-action-modal');
  const bulkActionModalTitle = document.getElementById('bulk-action-modal-title');
  const bulkActionMessage = document.getElementById('bulk-action-message');
  const selectedCountText = document.getElementById('selected-count-text');
  const btnCancelBulk = document.getElementById('btn-cancel-bulk');
  const btnConfirmBulk = document.getElementById('btn-confirm-bulk');
  
  // Elementos para filtros avanzados
  const btnAdvancedFilters = document.getElementById('btn-advanced-filters');
  const advancedFiltersSection = document.getElementById('advanced-filters');
  const filterEstado = document.getElementById('filter-estado');
  const filterProductos = document.getElementById('filter-productos');
  const filterFechaInicio = document.getElementById('filter-fecha-inicio');
  const filterFechaFin = document.getElementById('filter-fecha-fin');
  const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
  const filterBadge = document.getElementById('filter-badge');
  
  // Verificación de elementos del DOM
  const elementosRequeridos = {
    'categoriasListElement': categoriasListElement,
    'spinnerOverlay': spinnerOverlay,
    'paginationInfo': paginationInfo,
    'currentPageSpan': currentPageSpan,
    'prevPageButton': prevPageButton,
    'nextPageButton': nextPageButton,
    'tableHeaders': tableHeaders.length > 0 ? true : false,
    'selectAllCheckbox': selectAllCheckbox,
    'bulkActionsBar': bulkActionsBar,
    'btnBulkActivate': btnBulkActivate,
    'btnBulkDeactivate': btnBulkDeactivate,
    'btnBulkDelete': btnBulkDelete,
    'bulkActionModal': bulkActionModal
  };
  
  console.log('Verificación de elementos DOM requeridos:', elementosRequeridos);
  
  // Reportar elementos faltantes
  const elementosFaltantes = Object.entries(elementosRequeridos)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (elementosFaltantes.length > 0) {
    console.error('Elementos DOM no encontrados:', elementosFaltantes);
  }

  // Estado de la aplicación
  let allCategorias = [];
  let allProductosCategoria = []; // Para almacenar productos del modal
  let currentPage = 1;
  const itemsPerPage = 10; // O el número que prefieras
  let totalItems = 0;
  let sortColumn = 'id';
  let sortDirection = 'asc';
  let currentSearchTerm = '';
  let selectedCategories = new Set(); // Conjunto para almacenar IDs de categorías seleccionadas
  let currentBulkAction = ''; // 'activate', 'deactivate', 'delete'
  
  // Estado de filtros avanzados
  let advancedFilters = {
    estado: '',
    productos: '',
    fechaInicio: '',
    fechaFin: ''
  };
  let filtersActive = false;

  // Verificación de autenticación
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    window.location.href = '/login';
    return;
  }

  // Mostrar información del usuario
  userDisplay.textContent = `${user.username} (${user.rol})`;
  
  // Ocultar elementos solo para administradores si el usuario no es admin
  if (user.rol !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }

  // Evento de logout
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  });

  // --- Funciones Spinner ---
  const showSpinner = () => spinnerOverlay.classList.add('active');
  const hideSpinner = () => spinnerOverlay.classList.remove('active');

  // --- Funciones de Carga de Datos ---
  const loadCategorias = async () => {
    showSpinner();
    try {
      // NOTA: Idealmente, la API debería soportar paginación, ordenación y búsqueda en el backend.
      // Por ahora, simularemos esto en el frontend después de obtener *todos* los datos.
      const response = await fetch('/api/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }

      const data = await response.json();
      allCategorias = data.data || []; // Guardar todos los datos
      
      // Primero aplicar filtro de búsqueda 
      let filteredCategorias = allCategorias;
      if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filteredCategorias = allCategorias.filter(categoria => 
          categoria.nombre.toLowerCase().includes(term) || 
          (categoria.descripcion && categoria.descripcion.toLowerCase().includes(term))
        );
      }
      
      // Aplicar filtros avanzados
      filteredCategorias = applyAdvancedFilters(filteredCategorias);

      totalItems = filteredCategorias.length;

      // Aplicar ordenación
      filteredCategorias.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (typeof valA === 'boolean') {
          valA = valA ? 1 : 0;
          valB = valB ? 1 : 0;
        }
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      renderCategoriasPage(filteredCategorias);
      updateSortIcons();

    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cargar las categorías', 'error');
      categoriasListElement.innerHTML = `<tr><td colspan="7" class="text-center">Error al cargar datos.</td></tr>`;
      updatePaginationControls(0, 0);
    } finally {
      hideSpinner();
    }
  };

  // --- Funciones para filtrado avanzado ---
  const toggleAdvancedFilters = () => {
    if (advancedFiltersSection.classList.contains('active')) {
      advancedFiltersSection.classList.remove('active');
      btnAdvancedFilters.classList.remove('active');
    } else {
      advancedFiltersSection.classList.add('active');
      btnAdvancedFilters.classList.add('active');
    }
  };

  const applyAdvancedFilters = (categorias) => {
    if (!filtersActive) return categorias;
    
    return categorias.filter(categoria => {
      // Filtro por estado
      if (advancedFilters.estado !== '') {
        const estadoDeseado = advancedFilters.estado === 'true';
        if (categoria.activo !== estadoDeseado) return false;
      }
      
      // Filtro por fecha de creación
      if (advancedFilters.fechaInicio || advancedFilters.fechaFin) {
        const fechaCreacion = new Date(categoria.fecha_creacion);
        
        if (advancedFilters.fechaInicio) {
          const fechaInicio = new Date(advancedFilters.fechaInicio);
          fechaInicio.setHours(0, 0, 0, 0);
          if (fechaCreacion < fechaInicio) return false;
        }
        
        if (advancedFilters.fechaFin) {
          const fechaFin = new Date(advancedFilters.fechaFin);
          fechaFin.setHours(23, 59, 59, 999);
          if (fechaCreacion > fechaFin) return false;
        }
      }
      
      // Filtro por cantidad de productos (esto requiere que cada categoría tenga un contador de productos)
      if (advancedFilters.productos !== '') {
        // Para simplificar, asumimos que tenemos la información de productos por categoría
        // En una implementación real, esto podría requerir una llamada API separada
        const productosCount = getProductosCount(categoria.id);
        
        switch (advancedFilters.productos) {
          case '0':
            if (productosCount !== 0) return false;
            break;
          case '1-10':
            if (productosCount < 1 || productosCount > 10) return false;
            break;
          case '11-50':
            if (productosCount < 11 || productosCount > 50) return false;
            break;
          case '50+':
            if (productosCount <= 50) return false;
            break;
        }
      }
      
      return true;
    });
  };

  // Función para obtener el número de productos por categoría
  // En un sistema real, esto podría venir directamente de la API
  const getProductosCount = (categoriaId) => {
    // Simulamos la cantidad de productos por categoría (esto debe reemplazarse con datos reales)
    // En una implementación real, esta información podría venir con los datos de categoría o mediante otra API
    const categoria = allCategorias.find(cat => cat.id === categoriaId);
    return categoria.productos_count || 0;
  };

  const handleApplyFilters = () => {
    advancedFilters = {
      estado: filterEstado.value,
      productos: filterProductos.value,
      fechaInicio: filterFechaInicio.value,
      fechaFin: filterFechaFin.value
    };
    
    // Contar los filtros activos
    const activeFilters = Object.values(advancedFilters).filter(value => value !== '').length;
    
    // Actualizar contador de filtros
    if (activeFilters > 0) {
      filterBadge.textContent = activeFilters;
      filterBadge.classList.remove('hidden');
      filtersActive = true;
    } else {
      filterBadge.classList.add('hidden');
      filtersActive = false;
    }
    
    currentPage = 1; // Resetear a primera página al filtrar
    loadCategorias();
  };

  const handleClearFilters = () => {
    // Limpiar todos los campos de filtro
    filterEstado.value = '';
    filterProductos.value = '';
    filterFechaInicio.value = '';
    filterFechaFin.value = '';
    
    // Reiniciar estado de filtros
    advancedFilters = {
      estado: '',
      productos: '',
      fechaInicio: '',
      fechaFin: ''
    };
    
    filterBadge.classList.add('hidden');
    filtersActive = false;
    
    currentPage = 1;
    loadCategorias();
  };

  // --- Funciones de Renderizado ---
  const renderCategoriasPage = (categorias) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = categorias.slice(startIndex, endIndex);

    if (paginatedItems.length === 0 && totalItems === 0) {
      categoriasListElement.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No se encontraron categorías ${currentSearchTerm ? 'para "'+currentSearchTerm+'"' : ''}</td>
        </tr>
      `;
      selectAllCheckbox.disabled = true;
      selectAllCheckbox.checked = false;
    } else if (paginatedItems.length === 0 && totalItems > 0) {
       categoriasListElement.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No hay categorías en esta página.</td>
        </tr>
      `;
      selectAllCheckbox.disabled = true;
      selectAllCheckbox.checked = false;
    } else {
      selectAllCheckbox.disabled = false;
      
      categoriasListElement.innerHTML = paginatedItems.map(categoria => {
        // Obtener información de la categoría padre si existe
        const categoriaPadre = categoria.categoria_padre ? 
          `<a href="#" class="btn-link btn-ver-categoria" data-id="${categoria.categoria_padre.id}">${categoria.categoria_padre.nombre}</a>` : 
          '<span class="text-muted">-</span>';

        // Clase para mostrar la indentación basada en el nivel de la categoría
        const nivelClass = categoria.nivel > 1 ? `nivel-${Math.min(categoria.nivel, 4)}` : '';
        
        return `
          <tr data-id="${categoria.id}" data-nombre="${categoria.nombre}" class="${selectedCategories.has(categoria.id) ? 'selected' : ''} ${nivelClass}">
            <td class="checkbox-column">
              <label class="custom-checkbox">
                <input type="checkbox" ${selectedCategories.has(categoria.id) ? 'checked' : ''} data-id="${categoria.id}">
                <span class="checkbox-mark"></span>
              </label>
            </td>
            <td>${categoria.id}</td>
            <td>
              ${categoria.nivel > 1 ? 
                '<i class="fas fa-level-down-alt" style="transform: rotate(-90deg); margin-right: 5px; opacity: 0.5;"></i>' : ''} 
              ${categoria.nombre}
            </td>
            <td>${categoria.descripcion || '-'}</td>
            <td>${categoriaPadre}</td>
            <td class="text-center">
              <button class="btn-link btn-show-productos" data-incluir-subcategorias="true">
                Ver productos
              </button>
            </td>
            <td>
              <span class="badge ${categoria.activo ? 'success' : 'danger'}">
                ${categoria.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="btn-icon btn-add-subcategory" title="Añadir subcategoría">
                  <i class="fas fa-sitemap" aria-label="Añadir subcategoría"></i>
                </button>
                <button class="btn-icon btn-edit" title="Editar">
                  <i class="fas fa-edit" aria-label="Editar"></i>
                </button>
                <button class="btn-icon btn-delete" title="Eliminar">
                  <i class="fas fa-trash-alt" aria-label="Eliminar"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      
      const checkboxes = categoriasListElement.querySelectorAll('input[type="checkbox"]');
      const allSelected = Array.from(checkboxes).every(checkbox => checkbox.checked);
      selectAllCheckbox.checked = allSelected && checkboxes.length > 0;
    }
    updatePaginationControls(startIndex, endIndex);
    updateBulkActionsVisibility();
  };

  const renderProductosList = (productos) => {
    productosLoadingDiv.style.display = 'none';
    if (!productos || productos.length === 0) {
      productosEmptyDiv.style.display = 'block';
      productosListElement.innerHTML = '';
      return;
    }
    productosEmptyDiv.style.display = 'none';
    productosListElement.innerHTML = productos.map(producto => `
      <tr>
        <td style="width: 15%;">${producto.codigo || '-'}</td>
        <td style="width: 45%;">${producto.nombre}</td>
        <td style="width: 15%; text-align: center;">${producto.cantidad !== undefined && producto.cantidad !== null ? producto.cantidad : 0}</td>
        <td style="width: 25%; text-align: right;">$${parseFloat(producto.precio || 0).toFixed(2)}</td>
      </tr>
    `).join('');
  };

  // --- Funciones de Paginación y Ordenación ---
  const updatePaginationControls = (startIndex, endIndex) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    currentPageSpan.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    paginationInfo.textContent = `Mostrando ${totalItems > 0 ? startIndex + 1 : 0}-${Math.min(endIndex, totalItems)} de ${totalItems}`;

    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
  };

  const goToPage = (page) => {
    if (page < 1 || page > Math.ceil(totalItems / itemsPerPage)) return;
    currentPage = page;
    loadCategorias();
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
    currentPage = 1;
    loadCategorias();
  };

  const updateSortIcons = () => {
    tableHeaders.forEach(th => {
      th.classList.remove('asc', 'desc');
      if (th.dataset.sort === sortColumn) {
        th.classList.add(sortDirection);
      }
    });
  };

  // --- Funciones para selección múltiple ---
  const updateSelectedCount = () => {
    const count = selectedCategories.size;
    selectedCountSpan.textContent = `${count} seleccionado${count !== 1 ? 's' : ''}`;
    selectedCountText.textContent = `${count} categoría${count !== 1 ? 's' : ''}`;
    
    // Determinar si hay categorías activas e inactivas entre las seleccionadas
    const activas = [];
    const inactivas = [];
    
    selectedCategories.forEach(id => {
      const categoria = allCategorias.find(cat => cat.id === id);
      if (categoria) {
        if (categoria.activo) {
          activas.push(id);
        } else {
          inactivas.push(id);
        }
      }
    });
    
    // Mostrar u ocultar botones según corresponda
    if (activas.length > 0 && inactivas.length === 0) {
      // Solo hay categorías activas seleccionadas
      btnBulkActivate.style.display = 'none';
      btnBulkDeactivate.style.display = 'inline-block';
    } else if (inactivas.length > 0 && activas.length === 0) {
      // Solo hay categorías inactivas seleccionadas
      btnBulkActivate.style.display = 'inline-block';
      btnBulkDeactivate.style.display = 'none';
    } else {
      // Hay mezcla de categorías activas e inactivas o ninguna seleccionada
      btnBulkActivate.style.display = 'inline-block';
      btnBulkDeactivate.style.display = 'inline-block';
    }
  };

  const updateBulkActionsVisibility = () => {
    if (selectedCategories.size > 0) {
      bulkActionsBar.classList.add('visible');
    } else {
      bulkActionsBar.classList.remove('visible');
    }
    updateSelectedCount();
  };

  const toggleRowSelection = (checkbox, categoryId) => {
    const row = checkbox.closest('tr');
    
    if (checkbox.checked) {
      selectedCategories.add(categoryId);
      row.classList.add('selected');
    } else {
      selectedCategories.delete(categoryId);
      row.classList.remove('selected');
      selectAllCheckbox.checked = false;
    }
    
    updateBulkActionsVisibility();
  };

  const toggleAllSelection = (checked) => {
    const checkboxes = categoriasListElement.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      const categoryId = parseInt(checkbox.dataset.id);
      checkbox.checked = checked;
      
      const row = checkbox.closest('tr');
      if (checked) {
        selectedCategories.add(categoryId);
        row.classList.add('selected');
      } else {
        selectedCategories.delete(categoryId);
        row.classList.remove('selected');
      }
    });
    
    updateBulkActionsVisibility();
  };

  const showBulkActionConfirm = (action) => {
    currentBulkAction = action;
    
    switch (action) {
      case 'activate':
        bulkActionModalTitle.textContent = 'Confirmar activación masiva';
        bulkActionMessage.innerHTML = `¿Está seguro que desea <strong>activar</strong> <strong id="selected-count-text">${selectedCategories.size} categoría${selectedCategories.size !== 1 ? 's' : ''}</strong>?`;
        btnConfirmBulk.className = 'primary';
        btnConfirmBulk.querySelector('.btn-text').textContent = 'Activar';
        break;
      case 'deactivate':
        bulkActionModalTitle.textContent = 'Confirmar desactivación masiva';
        bulkActionMessage.innerHTML = `¿Está seguro que desea <strong>desactivar</strong> <strong id="selected-count-text">${selectedCategories.size} categoría${selectedCategories.size !== 1 ? 's' : ''}</strong>?`;
        btnConfirmBulk.className = 'secondary';
        btnConfirmBulk.querySelector('.btn-text').textContent = 'Desactivar';
        break;
      case 'delete':
        bulkActionModalTitle.textContent = 'Confirmar eliminación masiva';
        bulkActionMessage.innerHTML = `¿Está seguro que desea <strong>eliminar</strong> <strong id="selected-count-text">${selectedCategories.size} categoría${selectedCategories.size !== 1 ? 's' : ''}</strong>?`;
        btnConfirmBulk.className = 'danger';
        btnConfirmBulk.querySelector('.btn-text').textContent = 'Eliminar';
        break;
    }
    
    const btnText = btnConfirmBulk.querySelector('.btn-text');
    const btnSpinner = btnConfirmBulk.querySelector('.btn-spinner');
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    btnConfirmBulk.disabled = false;
    
    showModal(bulkActionModal);
  };

  const executeBulkAction = async () => {
    const btnText = btnConfirmBulk.querySelector('.btn-text');
    const btnSpinner = btnConfirmBulk.querySelector('.btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    btnConfirmBulk.disabled = true;

    try {
      const categoryIds = Array.from(selectedCategories);
      let endpoint = '';
      let method = 'POST';
      let actionMessage = '';
      
      switch (currentBulkAction) {
        case 'activate':
          endpoint = '/api/categorias/bulk-activate';
          actionMessage = 'activadas';
          break;
        case 'deactivate':
          endpoint = '/api/categorias/bulk-deactivate';
          actionMessage = 'desactivadas';
          break;
        case 'delete':
          endpoint = '/api/categorias/bulk-delete';
          actionMessage = 'eliminadas';
          break;
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: categoryIds })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Error al realizar la acción masiva`);
      }
      
      mostrarNotificacion(
        `${selectedCategories.size} categorías ${actionMessage} correctamente`, 
        'success'
      );
      
      if (currentBulkAction === 'delete') {
        allCategorias = allCategorias.filter(cat => !selectedCategories.has(cat.id));
      } else {
        const newStatus = currentBulkAction === 'activate';
        allCategorias = allCategorias.map(cat => {
          if (selectedCategories.has(cat.id)) {
            return { ...cat, activo: newStatus };
          }
          return cat;
        });
      }
      
      selectedCategories.clear();
      totalItems = allCategorias.length;
      
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
      }
      
      hideModal(bulkActionModal);
      renderCategoriasPage(allCategorias);
      
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      btnConfirmBulk.disabled = false;
    }
  };

  // --- Funciones de Acciones CRUD ---
  // Cargar lista de categorías disponibles para ser padre (excluyendo la categoría actual en edición)
  const cargarCategoriasPadre = (categoriaIdExcluir) => {
    const categoriaPadreSelect = document.getElementById('categoria_padre_id');
    categoriaPadreSelect.innerHTML = '<option value="">Ninguna (Categoría principal)</option>';
    
    // Filtrar categorías activas que no son la actual ni subcategorías de la actual
    const categoriasElegibles = allCategorias.filter(cat => {
      return cat.activo && (!categoriaIdExcluir || cat.id !== parseInt(categoriaIdExcluir));
    });
    
    // Ordenar las categorías elegibles
    const categoriasOrdenadas = categoriasElegibles.sort((a, b) => {
      // Primero ordenar por nivel
      if (a.nivel !== b.nivel) {
        return a.nivel - b.nivel;
      }
      // Si tienen el mismo nivel, ordenar por nombre
      return a.nombre.localeCompare(b.nombre);
    });
    
    categoriasOrdenadas.forEach(cat => {
      // Añadir indentación según el nivel
      const indentacion = '&nbsp;'.repeat((cat.nivel - 1) * 4);
      const opcion = document.createElement('option');
      opcion.value = cat.id;
      opcion.innerHTML = `${indentacion}${cat.nivel > 1 ? '↳ ' : ''}${cat.nombre}`;
      categoriaPadreSelect.appendChild(opcion);
    });
  };
  
  // Mostrar modal para añadir una subcategoría
  const showAddSubcategoryModal = (parentId, parentName) => {
    resetForm();
    modalTitle.textContent = `Nueva Subcategoría de "${parentName}"`;
    document.getElementById('categoria_padre_id').value = parentId;
    document.getElementById('activo-group').style.display = 'none';
    cargarCategoriasPadre();
    showModal(categoryModal);
  };

  const showProductos = async (categoriaId, categoriaNombre) => {
    categoriaNombreSpan.textContent = categoriaNombre;
    productosListElement.innerHTML = '';
    productosLoadingDiv.style.display = 'block';
    productosEmptyDiv.style.display = 'none';
    searchProductosModalInput.value = '';
    showModal(productosModal);

    try {
      const response = await fetch(`/api/categorias/${categoriaId}/productos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      allProductosCategoria = data.data || [];
      renderProductosList(allProductosCategoria);

    } catch (error) {
      console.error('Error:', error);
      productosLoadingDiv.style.display = 'none';
      productosEmptyDiv.textContent = 'Error al cargar productos.';
      productosEmptyDiv.style.display = 'block';
    }
  };

  const filterProductosModal = () => {
    const searchTerm = searchProductosModalInput.value.toLowerCase();
    const filteredProductos = allProductosCategoria.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchTerm))
    );
    renderProductosList(filteredProductos);
  };

  const showDeleteConfirm = (id, nombre) => {
    deleteCategoryName.textContent = nombre;
    btnConfirmDelete.dataset.id = id;
    const btnText = btnConfirmDelete.querySelector('.btn-text');
    const btnSpinner = btnConfirmDelete.querySelector('.btn-spinner');
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    btnConfirmDelete.disabled = false;
    showModal(confirmModal);
  };

  const deleteCategoria = async (id) => {
    const btnText = btnConfirmDelete.querySelector('.btn-text');
    const btnSpinner = btnConfirmDelete.querySelector('.btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    btnConfirmDelete.disabled = true;

    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al eliminar categoría');
      }

      mostrarNotificacion('Categoría eliminada correctamente', 'success');
      allCategorias = allCategorias.filter(cat => cat.id !== parseInt(id));
      totalItems = allCategorias.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
      }
      renderCategoriasPage(allCategorias);
      hideModal(confirmModal);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      btnConfirmDelete.disabled = false;
    }
  };

  const editCategoria = async (id) => {
    showSpinner();
    try {
      resetForm();
      modalTitle.textContent = 'Editar Categoría';
      
      const response = await fetch(`/api/categorias/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos de la categoría');
      }

      const data = await response.json();
      const categoria = data.data;

      categoriaIdInput.value = categoria.id;
      nombreInput.value = categoria.nombre;
      descripcionInput.value = categoria.descripcion || '';
      activoInput.value = categoria.activo.toString();

      document.getElementById('activo-group').style.display = 'block';
      cargarCategoriasPadre(categoria.id);
      showModal(categoryModal);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cargar los datos de la categoría', 'error');
    } finally {
      hideSpinner();
    }
  };

  // --- Funciones de Formulario y Modal ---
  const resetForm = () => {
    categoriaForm.reset();
    categoriaIdInput.value = '';
    nombreError.style.display = 'none';
    nombreInput.classList.remove('is-invalid');
    document.getElementById('activo-group').style.display = 'none';
    const btnText = btnSaveCategoria.querySelector('.btn-text');
    const btnSpinner = btnSaveCategoria.querySelector('.btn-spinner');
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    btnSaveCategoria.disabled = false;
  };

  const validateForm = () => {
    let isValid = true;
    nombreError.style.display = 'none';
    nombreInput.classList.remove('is-invalid');

    if (!nombreInput.value.trim()) {
      nombreError.textContent = 'El nombre es obligatorio.';
      nombreError.style.display = 'block';
      nombreInput.classList.add('is-invalid');
      isValid = false;
    }
    return isValid;
  };

  const saveCategoria = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const btnText = btnSaveCategoria.querySelector('.btn-text');
    const btnSpinner = btnSaveCategoria.querySelector('.btn-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    btnSaveCategoria.disabled = true;

    const categoriaId = categoriaIdInput.value;
    const isEdit = !!categoriaId;

    const categoriaData = {
      nombre: nombreInput.value.trim(),
      descripcion: descripcionInput.value.trim(),
      categoria_padre_id: document.getElementById('categoria_padre_id').value || null
    };

    if (isEdit) {
      categoriaData.activo = activoInput.value === 'true';
    }

    try {
      const url = isEdit 
        ? `/api/categorias/${categoriaId}` 
        : '/api/categorias';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoriaData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar la categoría');
      }

      mostrarNotificacion(
        isEdit ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente', 
        'success'
      );
      
      hideModal(categoryModal);
      if (isEdit) {
        const index = allCategorias.findIndex(cat => cat.id === parseInt(categoriaId));
        if (index !== -1) {
          allCategorias[index] = { ...allCategorias[index], ...categoriaData, id: parseInt(categoriaId) };
        }
      } else {
        const nuevaCategoria = data.data; 
        allCategorias.push(nuevaCategoria);
        totalItems = allCategorias.length;
      }
      currentPage = isEdit ? currentPage : Math.ceil(totalItems / itemsPerPage);
      loadCategorias();

    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      btnSaveCategoria.disabled = false;
    }
  };

  const showModal = (modal) => {
    modal.classList.add('active');
    modalOverlay.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) focusableElements[0].focus();
  };

  const hideModal = (modal) => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.active')) {
      modalOverlay.classList.remove('active');
    }
  };

  // --- Función de Notificación ---
  const mostrarNotificacion = (mensaje, tipo) => {
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    notificacion.setAttribute('role', 'alert');
    notificacion.innerHTML = `<p>${mensaje}</p><button class="close-notification" aria-label="Cerrar notificación">&times;</button>`;
    document.body.appendChild(notificacion);

    const closeBtn = notificacion.querySelector('.close-notification');
    const removeNotif = () => {
        notificacion.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                document.body.removeChild(notificacion);
            }
        }, 300);
    };

    closeBtn.onclick = removeNotif;
    
    setTimeout(() => {
      notificacion.classList.add('show');
    }, 10);
    
    setTimeout(removeNotif, 5000);
  };

  // --- Event Listeners ---
  
  searchInput.addEventListener('input', debounce(() => {
    currentSearchTerm = searchInput.value;
    currentPage = 1;
    loadCategorias();
  }, 300));

  searchProductosModalInput.addEventListener('input', debounce(filterProductosModal, 300));

  btnNewCategory.addEventListener('click', () => {
    resetForm();
    modalTitle.textContent = 'Nueva Categoría';
    document.getElementById('activo-group').style.display = 'none';
    cargarCategoriasPadre();
    showModal(categoryModal);
  });

  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      hideModal(button.closest('.modal'));
    });
  });

  modalOverlay.addEventListener('click', () => {
    document.querySelectorAll('.modal.active').forEach(modal => {
      hideModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(modal => {
        hideModal(modal);
      });
    }
  });

  btnCancel.addEventListener('click', () => {
    hideModal(categoryModal);
  });

  btnCancelDelete.addEventListener('click', () => {
    hideModal(confirmModal);
  });

  btnCloseProductos.addEventListener('click', () => {
    hideModal(productosModal);
  });

  btnConfirmDelete.addEventListener('click', () => {
    deleteCategoria(btnConfirmDelete.dataset.id);
  });

  categoriaForm.addEventListener('submit', saveCategoria);

  prevPageButton.addEventListener('click', () => goToPage(currentPage - 1));
  nextPageButton.addEventListener('click', () => goToPage(currentPage + 1));

  tableHeaders.forEach(th => {
    th.addEventListener('click', () => handleSort(th.dataset.sort));
  });

  categoriasListElement.addEventListener('click', (event) => {
    const target = event.target;
    const actionButton = target.closest('.btn-edit, .btn-delete, .btn-show-productos, .btn-add-subcategory');
    
    if (!actionButton) return;

    const row = target.closest('tr');
    const categoriaId = row.dataset.id;
    const categoriaNombre = row.dataset.nombre;

    if (actionButton.classList.contains('btn-edit')) {
      editCategoria(categoriaId);
    } else if (actionButton.classList.contains('btn-delete')) {
      showDeleteConfirm(categoriaId, categoriaNombre);
    } else if (actionButton.classList.contains('btn-show-productos')) {
      showProductos(categoriaId, categoriaNombre);
    } else if (actionButton.classList.contains('btn-add-subcategory')) {
      showAddSubcategoryModal(categoriaId, categoriaNombre);
    }
  });

  categoriasListElement.addEventListener('change', (event) => {
    const target = event.target;
    if (target.type === 'checkbox') {
      const categoryId = parseInt(target.dataset.id);
      toggleRowSelection(target, categoryId);
    }
  });
  
  selectAllCheckbox.addEventListener('change', () => {
    toggleAllSelection(selectAllCheckbox.checked);
  });
  
  btnBulkActivate.addEventListener('click', () => showBulkActionConfirm('activate'));
  btnBulkDeactivate.addEventListener('click', () => showBulkActionConfirm('deactivate'));
  btnBulkDelete.addEventListener('click', () => showBulkActionConfirm('delete'));
  
  btnCancelBulk.addEventListener('click', () => {
    hideModal(bulkActionModal);
  });
  
  btnConfirmBulk.addEventListener('click', executeBulkAction);

  btnAdvancedFilters.addEventListener('click', toggleAdvancedFilters);
  btnAplicarFiltros.addEventListener('click', handleApplyFilters);
  btnLimpiarFiltros.addEventListener('click', handleClearFilters);

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  loadCategorias();
});