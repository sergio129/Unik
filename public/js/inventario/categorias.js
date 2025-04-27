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
  
  // Verificación de elementos del DOM
  const elementosRequeridos = {
    'categoriasListElement': categoriasListElement,
    'spinnerOverlay': spinnerOverlay,
    'paginationInfo': paginationInfo,
    'currentPageSpan': currentPageSpan,
    'prevPageButton': prevPageButton,
    'nextPageButton': nextPageButton,
    'tableHeaders': tableHeaders.length > 0 ? true : false
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
      
      // Aplicar filtro de búsqueda localmente
      let filteredCategorias = allCategorias;
      if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filteredCategorias = allCategorias.filter(categoria => 
          categoria.nombre.toLowerCase().includes(term) || 
          (categoria.descripcion && categoria.descripcion.toLowerCase().includes(term))
        );
      }

      totalItems = filteredCategorias.length;

      // Aplicar ordenación localmente
      filteredCategorias.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        // Manejar booleanos (activo)
        if (typeof valA === 'boolean') {
          valA = valA ? 1 : 0;
          valB = valB ? 1 : 0;
        }
        // Manejar strings (case-insensitive)
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
      categoriasListElement.innerHTML = `<tr><td colspan="6" class="text-center">Error al cargar datos.</td></tr>`;
      updatePaginationControls(0, 0);
    } finally {
      hideSpinner();
    }
  };

  // --- Funciones de Renderizado ---
  const renderCategoriasPage = (categorias) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = categorias.slice(startIndex, endIndex);

    if (paginatedItems.length === 0 && totalItems === 0) {
      categoriasListElement.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No se encontraron categorías ${currentSearchTerm ? 'para "'+currentSearchTerm+'"' : ''}</td>
        </tr>
      `;
    } else if (paginatedItems.length === 0 && totalItems > 0) {
       categoriasListElement.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No hay categorías en esta página.</td>
        </tr>
      `;
    } else {
      categoriasListElement.innerHTML = paginatedItems.map(categoria => `
        <tr data-id="${categoria.id}" data-nombre="${categoria.nombre}">
          <td>${categoria.id}</td>
          <td>${categoria.nombre}</td>
          <td>${categoria.descripcion || '-'}</td>
          <td class="text-center">
            <button class="btn-link btn-show-productos">
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
              <button class="btn-icon btn-edit">
                <i class="fas fa-edit" aria-label="Editar"></i>
              </button>
              <button class="btn-icon btn-delete">
                <i class="fas fa-trash-alt" aria-label="Eliminar"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
    updatePaginationControls(startIndex, endIndex);
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
    loadCategorias(); // Recargar para aplicar paginación
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
    currentPage = 1; // Resetear a la primera página al ordenar
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

  // --- Funciones de Acciones CRUD ---
  const showProductos = async (categoriaId, categoriaNombre) => {
    categoriaNombreSpan.textContent = categoriaNombre;
    productosListElement.innerHTML = ''; // Limpiar lista anterior
    productosLoadingDiv.style.display = 'block'; // Mostrar carga
    productosEmptyDiv.style.display = 'none';
    searchProductosModalInput.value = ''; // Limpiar búsqueda modal
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
      allProductosCategoria = data.data || []; // Guardar todos los productos de esta categoría
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
    // Reset button state
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
      // Optimización: en lugar de recargar todo, eliminar de `allCategorias` y re-renderizar
      allCategorias = allCategorias.filter(cat => cat.id !== parseInt(id));
      totalItems = allCategorias.length;
      // Ajustar currentPage si la última página quedó vacía
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
      }
      renderCategoriasPage(allCategorias); // Re-renderizar con datos actualizados
      hideModal(confirmModal);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
      // Re-enable button on error
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
    nombreError.style.display = 'none'; // Ocultar error
    nombreInput.classList.remove('is-invalid'); // Quitar clase de error
    document.getElementById('activo-group').style.display = 'none';
    // Reset button state
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
    // Añadir más validaciones si es necesario
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
      descripcion: descripcionInput.value.trim()
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
      // Optimización: Actualizar o añadir en `allCategorias` y re-renderizar
      // En lugar de llamar a loadCategorias() que hace otra llamada API
      if (isEdit) {
        const index = allCategorias.findIndex(cat => cat.id === parseInt(categoriaId));
        if (index !== -1) {
          allCategorias[index] = { ...allCategorias[index], ...categoriaData, id: parseInt(categoriaId) }; // Actualizar datos
        }
      } else {
        // Asumiendo que la API devuelve la nueva categoría con su ID
        const nuevaCategoria = data.data; 
        allCategorias.push(nuevaCategoria);
        totalItems = allCategorias.length;
      }
      // Recalcular y re-renderizar la página actual
      currentPage = isEdit ? currentPage : Math.ceil(totalItems / itemsPerPage); // Ir a la última página si es nuevo
      loadCategorias(); // Recargar para aplicar filtros/ordenación/paginación actualizados

    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
      // Re-enable button on error
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      btnSaveCategoria.disabled = false;
    }
  };

  const showModal = (modal) => {
    modal.classList.add('active');
    modalOverlay.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    // Focus trap (simple example, might need a library for robustness)
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) focusableElements[0].focus();
  };

  const hideModal = (modal) => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    // Solo quitar overlay si no hay otros modales activos
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
    
    setTimeout(removeNotif, 5000); // Auto-cierre después de 5 segundos
  };

  // --- Event Listeners ---
  
  // Búsqueda principal
  searchInput.addEventListener('input', debounce(() => {
    currentSearchTerm = searchInput.value;
    currentPage = 1; // Resetear a la primera página al buscar
    loadCategorias();
  }, 300));

  // Búsqueda en modal de productos
  searchProductosModalInput.addEventListener('input', debounce(filterProductosModal, 300));

  // Abrir modal para nueva categoría
  btnNewCategory.addEventListener('click', () => {
    resetForm();
    modalTitle.textContent = 'Nueva Categoría';
    document.getElementById('activo-group').style.display = 'none'; // Ocultar estado para nuevo
    showModal(categoryModal);
  });

  // Cerrar modales
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

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(modal => {
        hideModal(modal);
      });
    }
  });

  // Cancelar formulario
  btnCancel.addEventListener('click', () => {
    hideModal(categoryModal);
  });

  // Cancelar eliminación
  btnCancelDelete.addEventListener('click', () => {
    hideModal(confirmModal);
  });

  // Cerrar modal de productos
  btnCloseProductos.addEventListener('click', () => {
    hideModal(productosModal);
  });

  // Confirmar eliminación
  btnConfirmDelete.addEventListener('click', () => {
    deleteCategoria(btnConfirmDelete.dataset.id);
  });

  // Guardar categoría
  categoriaForm.addEventListener('submit', saveCategoria);

  // Paginación
  prevPageButton.addEventListener('click', () => goToPage(currentPage - 1));
  nextPageButton.addEventListener('click', () => goToPage(currentPage + 1));

  // Ordenación
  tableHeaders.forEach(th => {
    th.addEventListener('click', () => handleSort(th.dataset.sort));
  });

  // Event Delegation para botones de acción en la tabla
  categoriasListElement.addEventListener('click', (event) => {
    const target = event.target;
    const actionButton = target.closest('.btn-edit, .btn-delete, .btn-show-productos');
    
    if (!actionButton) return; // No se hizo clic en un botón de acción

    const row = target.closest('tr');
    const categoriaId = row.dataset.id;
    const categoriaNombre = row.dataset.nombre;

    if (actionButton.classList.contains('btn-edit')) {
      editCategoria(categoriaId);
    } else if (actionButton.classList.contains('btn-delete')) {
      showDeleteConfirm(categoriaId, categoriaNombre);
    } else if (actionButton.classList.contains('btn-show-productos')) {
      showProductos(categoriaId, categoriaNombre);
    }
  });

  // --- Función Debounce ---
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  // --- Inicialización ---
  loadCategorias(); // Carga inicial
});