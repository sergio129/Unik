// Gestión de categorías
document.addEventListener('DOMContentLoaded', () => {
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
  const btnCancel = document.getElementById('btn-cancel');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deleteCategoryName = document.getElementById('delete-category-name');
  const confirmModal = document.getElementById('confirm-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  const closeModalButtons = document.querySelectorAll('.close-modal');
  const productosModal = document.getElementById('productos-categoria-modal');
  const categoriaNombreSpan = document.getElementById('categoria-nombre');
  const productosListElement = document.getElementById('productos-categoria-list');
  const btnCloseProductos = document.getElementById('btn-close-productos');
  const userDisplay = document.getElementById('user-display');
  const btnLogout = document.getElementById('btn-logout');

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

  // Cargar todas las categorías
  const loadCategorias = async (searchTerm = '') => {
    try {
      const response = await fetch('/api/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }

      const data = await response.json();
      let categorias = data.data;

      // Filtrar categorías por término de búsqueda si existe
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        categorias = categorias.filter(categoria => 
          categoria.nombre.toLowerCase().includes(term) || 
          (categoria.descripcion && categoria.descripcion.toLowerCase().includes(term))
        );
      }

      renderCategoriasList(categorias);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cargar las categorías', 'error');
    }
  };

  // Renderizar lista de categorías
  const renderCategoriasList = (categorias) => {
    if (categorias.length === 0) {
      categoriasListElement.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No se encontraron categorías</td>
        </tr>
      `;
      return;
    }

    categoriasListElement.innerHTML = categorias.map(categoria => `
      <tr>
        <td>${categoria.id}</td>
        <td>${categoria.nombre}</td>
        <td>${categoria.descripcion || '-'}</td>
        <td class="text-center">
          <button class="btn-link btn-show-productos" data-id="${categoria.id}" data-nombre="${categoria.nombre}">
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
            <button class="btn-icon btn-edit" data-id="${categoria.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" data-id="${categoria.id}" data-nombre="${categoria.nombre}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Asignar eventos a los botones de acciones
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editCategoria(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id, btn.dataset.nombre));
    });

    document.querySelectorAll('.btn-show-productos').forEach(btn => {
      btn.addEventListener('click', () => showProductos(btn.dataset.id, btn.dataset.nombre));
    });
  };

  // Mostrar/cargar productos de una categoría
  const showProductos = async (categoriaId, categoriaNombre) => {
    try {
      categoriaNombreSpan.textContent = categoriaNombre;
      
      // Mostrar modal de carga
      productosListElement.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Cargando productos...</td>
        </tr>
      `;
      
      showModal(productosModal);

      // Cargar productos de la categoría
      const response = await fetch(`/api/categorias/${categoriaId}/productos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      // Corregido: Acceder directamente a data.data que contiene el array de productos
      const productos = data.data;

      if (!productos || productos.length === 0) {
        productosListElement.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">Esta categoría no tiene productos</td>
          </tr>
        `;
        return;
      }

      productosListElement.innerHTML = productos.map(producto => `
        <tr>
          <td style="width: 15%;">${producto.codigo}</td>
          <td style="width: 45%;">${producto.nombre}</td>
          <td style="width: 15%; text-align: center;">${producto.cantidad || 0}</td>
          <td style="width: 25%; text-align: right;">$${parseFloat(producto.precio || 0).toFixed(2)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error:', error);
      productosListElement.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Error al cargar productos</td>
        </tr>
      `;
    }
  };

  // Función para mostrar el modal de confirmar eliminación
  const showDeleteConfirm = (id, nombre) => {
    deleteCategoryName.textContent = nombre;
    btnConfirmDelete.dataset.id = id;
    showModal(confirmModal);
  };

  // Función para eliminar una categoría
  const deleteCategoria = async (id) => {
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
      loadCategorias();
      hideModal(confirmModal);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
    }
  };

  // Función para editar una categoría
  const editCategoria = async (id) => {
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
    }
  };

  // Función para resetear el formulario
  const resetForm = () => {
    categoriaForm.reset();
    categoriaIdInput.value = '';
    document.getElementById('activo-group').style.display = 'none';
  };

  // Función para guardar una categoría (crear o actualizar)
  const saveCategoria = async (e) => {
    e.preventDefault();

    const categoriaId = categoriaIdInput.value;
    const isEdit = !!categoriaId;

    const categoriaData = {
      nombre: nombreInput.value,
      descripcion: descripcionInput.value
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
      loadCategorias();
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion(error.message, 'error');
    }
  };

  // Funciones para manejar modales
  const showModal = (modal) => {
    modal.classList.add('active'); // Cambiado de 'show' a 'active'
    modalOverlay.classList.add('active'); // Cambiado de 'show' a 'active'
  };

  const hideModal = (modal) => {
    modal.classList.remove('active'); // Cambiado de 'show' a 'active'
    modalOverlay.classList.remove('active'); // Cambiado de 'show' a 'active'
  };

  // Función para mostrar notificaciones
  const mostrarNotificacion = (mensaje, tipo) => {
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    notificacion.innerHTML = `<p>${mensaje}</p>`;
    document.body.appendChild(notificacion);
    
    // Mostrar notificación
    setTimeout(() => {
      notificacion.classList.add('show');
    }, 100);
    
    // Ocultar y eliminar
    setTimeout(() => {
      notificacion.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notificacion);
      }, 300);
    }, 3000);
  };

  // Event Listeners
  
  // Buscar categorías
  searchInput.addEventListener('input', debounce(() => {
    loadCategorias(searchInput.value);
  }, 300));

  // Abrir modal para nueva categoría
  btnNewCategory.addEventListener('click', () => {
    resetForm();
    modalTitle.textContent = 'Nueva Categoría';
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

  // Función debounce para evitar múltiples llamadas en búsqueda
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  // Inicializar - cargar categorías
  loadCategorias();
});