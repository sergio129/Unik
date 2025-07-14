// Funcionalidad para la administración de usuarios
document.addEventListener('DOMContentLoaded', function() {
  // Verificar que el usuario tenga permisos de administrador
  checkAdminPermissions();
  
  // Inicializar componentes
  initializeModals();
  setupEventListeners();
  
  // Cargar lista de usuarios con la nueva función paginada
  loadUsersWithPagination();
  
  // Inicializar funcionalidad de perfiles
  initializeProfileTabs();
});

// Verificar que el usuario sea administrador
function checkAdminPermissions() {
  try {
    const user = JSON.parse(localStorage.getItem('usuario')); // Cambiado de 'user' a 'usuario'
    if (!user || user.rol !== 'admin') {
      // Redirigir si no es administrador
      window.location.href = '/dashboard';
    } else {
      // Mostrar nombre de usuario
      document.getElementById('user-display').textContent = user.username;
    }
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    window.location.href = '/login';
  }
}

// Inicializar los modales
function initializeModals() {
  // Modal de usuario
  const userModal = document.getElementById('user-modal');
  const userForm = document.getElementById('user-form');
  const modalOverlay = document.querySelector('.modal-overlay');
  const closeButtons = document.querySelectorAll('.close-modal');
  const btnCancel = document.getElementById('btn-cancel');
  
  // Modal de confirmación para eliminar
  const confirmModal = document.getElementById('confirm-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  
  // Cerrar modal al hacer clic en botones de cerrar o cancelar
  closeButtons.forEach(button => {
    button.addEventListener('click', closeAllModals);
  });
  
  btnCancel.addEventListener('click', closeAllModals);
  btnCancelDelete.addEventListener('click', closeAllModals);
  
  // Cerrar modal al hacer clic en overlay
  modalOverlay.addEventListener('click', closeAllModals);
  
  // Evitar que el clic dentro del modal cierre el modal
  userModal.addEventListener('click', e => e.stopPropagation());
  confirmModal.addEventListener('click', e => e.stopPropagation());
  
  // Toggle para mostrar/ocultar contraseña
  const togglePassword = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');
  
  togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Cambiar icono
    const eyeIcon = this.querySelector('i');
    eyeIcon.classList.toggle('fa-eye');
    eyeIcon.classList.toggle('fa-eye-slash');
  });
  
  // Inicializar las pestañas del formulario
  initializeUserFormTabs();
  
  // Inicializar el campo de habilidades
  initializeSkillsField();
  
  // Manejar envío del formulario
  userForm.addEventListener('submit', handleUserFormSubmit);
}

// Inicializar las pestañas del formulario de usuario
function initializeUserFormTabs() {
  const tabLinks = document.querySelectorAll('#userFormTabs .nav-link');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remover clase active de todos los enlaces y paneles
      document.querySelectorAll('#userFormTabs .nav-link').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelectorAll('#user-form .tab-pane').forEach(item => {
        item.classList.remove('active');
      });
      
      // Agregar clase active al enlace actual
      this.classList.add('active');
      
      // Mostrar el panel correspondiente
      const tabId = this.getAttribute('href').substring(1);
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Inicializar el campo de habilidades
function initializeSkillsField() {
  const habilidadesInput = document.getElementById('habilidades');
  const habilidadesContainer = document.getElementById('habilidades-tags');
  
  if (!habilidadesInput) return;
  
  // Función para renderizar las etiquetas de habilidades
  function renderSkillTags() {
    const skills = habilidadesInput.value
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill !== '');
    
    habilidadesContainer.innerHTML = '';
    
    skills.forEach(skill => {
      if (skill) {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.innerHTML = `${skill} <i class="fas fa-times remove-skill"></i>`;
        habilidadesContainer.appendChild(tag);
        
        // Añadir evento para eliminar habilidad
        tag.querySelector('.remove-skill').addEventListener('click', () => {
          const updatedSkills = habilidadesInput.value
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== skill && s !== '')
            .join(', ');
          
          habilidadesInput.value = updatedSkills;
          renderSkillTags();
        });
      }
    });
  }
  
  // Evento para actualizar tags cuando se modifica el input
  habilidadesInput.addEventListener('change', renderSkillTags);
  habilidadesInput.addEventListener('blur', renderSkillTags);
  
  // Evento para añadir habilidad con coma o Enter
  habilidadesInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      
      const currentValue = this.value.trim();
      if (currentValue) {
        const skills = currentValue.split(',').map(s => s.trim()).filter(s => s !== '');
        
        // Si ya hay valor y no termina en coma, añadir coma
        if (skills.length > 0 && !currentValue.endsWith(',')) {
          this.value = skills.join(', ') + ', ';
        }
        
        renderSkillTags();
      }
    }
  });
}

// Configurar eventos para botones y filtros
function setupEventListeners() {
  // Botón para crear nuevo usuario
  const btnNewUser = document.getElementById('btn-new-user');
  btnNewUser.addEventListener('click', () => openUserModal());
  
  // Botón confirmar eliminación
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  btnConfirmDelete.addEventListener('click', deleteUser);
  
  // Búsqueda y filtrado
  const searchInput = document.getElementById('search-users');
  const roleFilter = document.getElementById('filter-role');
  
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    loadUsersWithPagination();
  });
  
  roleFilter.addEventListener('change', () => {
    currentPage = 1;
    loadUsersWithPagination();
  });
  
  // Botones de paginación
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsersWithPagination();
    }
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadUsersWithPagination();
    }
  });
  
  // Selector de tamaño de página
  document.getElementById('page-size-selector').addEventListener('change', function() {
    pageSize = parseInt(this.value);
    currentPage = 1;
    loadUsersWithPagination();
    
    // Guardar preferencia en localStorage
    localStorage.setItem('userTablePageSize', pageSize);
  });
  
  // Botones del modal de perfil
  document.getElementById('btn-close-profile').addEventListener('click', closeAllModals);
  document.getElementById('btn-edit-profile').addEventListener('click', editUserProfileFromView);
  
  // Botón Ver Perfil Completo en el formulario de usuario
  document.getElementById('btn-view-profile').addEventListener('click', function() {
    const userId = document.getElementById('user-id').value;
    if (userId) {
      viewUserProfile(userId);
    }
  });
}

// Variables para paginación
let currentPage = 1;
let pageSize = 25;
let totalItems = 0;
let totalPages = 0;
let cachedUsers = []; // Caché de usuarios

// Cargar lista de usuarios desde el servidor con paginación
async function loadUsersWithPagination() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    // Recuperar tamaño de página guardado
    const savedPageSize = localStorage.getItem('userTablePageSize');
    if (savedPageSize) {
      pageSize = parseInt(savedPageSize);
      document.getElementById('page-size-selector').value = pageSize;
    }
    
    // Mostrar indicador de carga
    const tbody = document.getElementById('users-list');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...
        </td>
      </tr>
    `;
    
    // Obtener filtros actuales
    const searchTerm = document.getElementById('search-users').value.toLowerCase();
    const roleFilter = document.getElementById('filter-role').value;
    
    // Si no hay filtros y tenemos caché, usar caché
    let users;
    if (!searchTerm && roleFilter === 'all' && cachedUsers.length > 0) {
      users = cachedUsers;
    } else {
      // Obtener usuarios del servidor
      const response = await fetch('/api/usuarios', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        showMessage('Error al cargar usuarios: ' + result.message, 'error');
        return;
      }
      
      users = result.data;
      
      // Guardar en caché si no hay filtros
      if (!searchTerm && roleFilter === 'all') {
        cachedUsers = users;
      }
    }
    
    // Aplicar filtros localmente
    let filteredUsers = users;
    
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(user => 
        (user.username && user.username.toLowerCase().includes(searchTerm)) ||
        (user.nombre_completo && user.nombre_completo.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm))
      );
    }
    
    if (roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.rol === roleFilter);
    }
    
    // Calcular paginación
    totalItems = filteredUsers.length;
    totalPages = Math.ceil(totalItems / pageSize);
    
    // Ajustar página actual si es necesario
    if (currentPage > totalPages) {
      currentPage = totalPages || 1;
    }
    
    // Obtener usuarios para la página actual
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Renderizar usuarios
    renderUsers(paginatedUsers);
    
    // Actualizar información de paginación
    updatePaginationInfo(startIndex, endIndex, totalItems);
    
    // Actualizar botones de paginación
    updatePaginationButtons();
    
    // Generar números de página
    generatePaginationNumbers();
    
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    showMessage('Error al cargar la lista de usuarios', 'error');
    
    const tbody = document.getElementById('users-list');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar usuarios
        </td>
      </tr>
    `;
  }
}

// Actualizar información de paginación
function updatePaginationInfo(start, end, total) {
  document.getElementById('showing-from').textContent = total > 0 ? start + 1 : 0;
  document.getElementById('showing-to').textContent = end;
  document.getElementById('total-items').textContent = total;
}

// Actualizar estado de los botones de paginación
function updatePaginationButtons() {
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  
  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

// Generar números de paginación
function generatePaginationNumbers() {
  const paginationNumbers = document.getElementById('pagination-numbers');
  paginationNumbers.innerHTML = '';
  
  // Limitar número de botones visibles
  const maxVisibleButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
  
  // Ajustar si estamos cerca del final
  if (endPage - startPage + 1 < maxVisibleButtons && startPage > 1) {
    startPage = Math.max(1, endPage - maxVisibleButtons + 1);
  }
  
  // Añadir botón para primera página si no es visible
  if (startPage > 1) {
    addPageNumberButton(paginationNumbers, 1);
    if (startPage > 2) {
      addEllipsis(paginationNumbers);
    }
  }
  
  // Añadir botones de número de página
  for (let i = startPage; i <= endPage; i++) {
    addPageNumberButton(paginationNumbers, i);
  }
  
  // Añadir botón para última página si no es visible
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      addEllipsis(paginationNumbers);
    }
    addPageNumberButton(paginationNumbers, totalPages);
  }
}

// Añadir botón de número de página
function addPageNumberButton(container, pageNum) {
  const button = document.createElement('button');
  button.textContent = pageNum;
  button.className = currentPage === pageNum ? 'active' : '';
  button.addEventListener('click', () => {
    if (currentPage !== pageNum) {
      currentPage = pageNum;
      loadUsersWithPagination();
    }
  });
  container.appendChild(button);
}

// Añadir elipsis para páginas ocultas
function addEllipsis(container) {
  const ellipsis = document.createElement('span');
  ellipsis.textContent = '...';
  ellipsis.className = 'pagination-ellipsis';
  container.appendChild(ellipsis);
}

// Renderizar la lista de usuarios
function renderUsers(users) {
  const tbody = document.getElementById('users-list');
  
  // Si no hay usuarios, mostrar mensaje
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">No hay usuarios que coincidan con los criterios de búsqueda</td>
      </tr>
    `;
    return;
  }
  
  // Crear las filas de la tabla
  tbody.innerHTML = users.map(user => `
    <tr data-id="${user.id}" data-username="${user.username}">
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.nombre_completo || '-'}</td>
      <td>${user.email || '-'}</td>
      <td>
        <span class="role-badge role-${user.rol}">
          ${mapRoleName(user.rol)}
        </span>
      </td>
      <td>${formatDate(user.ultimo_acceso)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" title="Ver Perfil" onclick="viewUserProfile(${user.id})">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-action btn-edit" title="Editar" onclick="editUser(${user.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action btn-delete" title="Eliminar" onclick="confirmDeleteUser(${user.id}, '${user.username}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Si hay pocos usuarios, no mostrar paginación
  const paginationControls = document.querySelector('.pagination-controls');
  paginationControls.style.display = totalItems <= pageSize ? 'none' : 'flex';
}

// Abrir el modal para crear un nuevo usuario
function openUserModal(userId = null) {
  const modal = document.getElementById('user-modal');
  const modalTitle = document.getElementById('modal-title');
  const userForm = document.getElementById('user-form');
  const userIdInput = document.getElementById('user-id');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  // Limpiar formulario
  userForm.reset();
  
  if (userId) {
    // Modo edición
    modalTitle.textContent = 'Editar Usuario';
    userIdInput.value = userId;
    userForm.classList.add('edit-mode');
    
    // Cargar datos del usuario
    loadUserData(userId);
  } else {
    // Modo creación
    modalTitle.textContent = 'Nuevo Usuario';
    userIdInput.value = '';
    userForm.classList.remove('edit-mode');
    
    // Hacer campo de contraseña requerido en modo creación
    document.getElementById('password').setAttribute('required', 'required');
  }
  
  // Mostrar modal
  modal.style.display = 'block';
  modalOverlay.style.display = 'block';
  
  // Enfocar primer campo
  setTimeout(() => {
    document.getElementById('username').focus();
  }, 100);
}

// Cargar datos de un usuario para edición
async function loadUserData(userId) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/usuarios/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar información del usuario');
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Cargar datos en el formulario
      const user = result.data;
      document.getElementById('username').value = user.username;
      document.getElementById('nombre_completo').value = user.nombre_completo || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('rol').value = user.rol;
      
      // Cargar campos extendidos del perfil
      document.getElementById('telefono').value = user.telefono || '';
      document.getElementById('cargo').value = user.cargo || '';
      document.getElementById('departamento').value = user.departamento || '';
      document.getElementById('direccion').value = user.direccion || '';
      document.getElementById('biografia').value = user.biografia || '';
      
      // Formatear la fecha de nacimiento para el input type="date"
      if (user.fecha_nacimiento) {
        const fecha = new Date(user.fecha_nacimiento);
        if (!isNaN(fecha.getTime())) {
          // Formato YYYY-MM-DD para input type="date"
          const fechaFormateada = fecha.toISOString().split('T')[0];
          document.getElementById('fecha_nacimiento').value = fechaFormateada;
        }
      }
      
      // Cargar habilidades
      document.getElementById('habilidades').value = Array.isArray(user.habilidades) ? user.habilidades.join(', ') : (user.habilidades || '');
      
      // Cargar redes sociales si existen
      if (user.redes_sociales) {
        let redes = typeof user.redes_sociales === 'string' ? 
                    JSON.parse(user.redes_sociales) : user.redes_sociales;
        
        if (redes) {
          document.getElementById('linkedin').value = redes.linkedin || '';
          document.getElementById('twitter').value = redes.twitter || '';
          document.getElementById('facebook').value = redes.facebook || '';
        }
      }
      
      // Renderizar etiquetas de habilidades
      initializeSkillsField();
      
      // Mostrar botón de ver perfil completo en modo edición
      document.getElementById('btn-view-profile').style.display = 'block';
      
      // Quitar requerimiento de contraseña en modo edición
      document.getElementById('password').removeAttribute('required');
    } else {
      showMessage('Error al cargar información del usuario', 'error');
      closeAllModals();
    }
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    showMessage('Error al cargar información del usuario', 'error');
    closeAllModals();
  }
}

// Manejar el envío del formulario de usuario
async function handleUserFormSubmit(event) {
  event.preventDefault();
  
  const userId = document.getElementById('user-id').value;
  const isEditing = !!userId;
  
  // Procesar las habilidades como array
  let habilidades = document.getElementById('habilidades').value.trim();
  habilidades = habilidades ? habilidades.split(',').map(h => h.trim()).filter(h => h !== '') : [];
  
  // Construir el objeto de redes sociales
  const redes_sociales = {
    linkedin: document.getElementById('linkedin').value.trim(),
    twitter: document.getElementById('twitter').value.trim(),
    facebook: document.getElementById('facebook').value.trim()
  };
  
  const userData = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    nombre_completo: document.getElementById('nombre_completo').value,
    email: document.getElementById('email').value,
    rol: document.getElementById('rol').value,
    telefono: document.getElementById('telefono').value,
    direccion: document.getElementById('direccion').value,
    fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
    cargo: document.getElementById('cargo').value,
    departamento: document.getElementById('departamento').value,
    biografia: document.getElementById('biografia').value,
    habilidades: habilidades,
    redes_sociales: redes_sociales
  };
  
  // Si estamos editando y no se proporciona contraseña, eliminarla del objeto
  if (isEditing && !userData.password) {
    delete userData.password;
  }
  
  try {
    const token = localStorage.getItem('token');
    
    const url = isEditing ? `/api/usuarios/${userId}` : '/api/usuarios';
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mostrar mensaje de éxito
      const message = isEditing ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente';
      showMessage(message, 'success');
      
      // Crear notificación para otros administradores
      createUserNotification(isEditing ? 'user_updated' : 'user_created', userData.username);
      
      // Cerrar modal y recargar lista
      closeAllModals();
      
      // Limpiar caché y recargar
      cachedUsers = [];
      loadUsersWithPagination();
      
      // Si tenemos estadísticas, actualizarlas
      if (typeof loadUserStatistics === 'function') {
        loadUserStatistics();
        loadUserCharts();
      }
    } else {
      showMessage(result.message || 'Error al guardar usuario', 'error');
    }
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    showMessage('Error al guardar usuario', 'error');
  }
}

// Crear notificación sobre cambios de usuarios
function createUserNotification(type, username) {
  try {
    // Si no existe el WebSocket o no está conectado, salir
    if (!window.notificationsSocket || window.notificationsSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Obtener usuario actual
    const currentUser = JSON.parse(localStorage.getItem('usuario')); // Cambiado de 'user' a 'usuario'
    if (!currentUser) return;
    
    // Enviar notificación
    window.notificationsSocket.send(JSON.stringify({
      type: 'notification',
      data: {
        type: type,
        module: 'users',
        message: getNotificationMessage(type, username, currentUser.username),
        important: type === 'user_deleted',
        requiresRefresh: true
      }
    }));
  } catch (error) {
    console.error('Error al crear notificación:', error);
    // No mostrar error al usuario
  }
}

// Obtener mensaje para notificación según el tipo
function getNotificationMessage(type, username, actorUsername) {
  switch (type) {
    case 'user_created':
      return `El administrador ${actorUsername} ha creado el usuario ${username}`;
    case 'user_updated':
      return `El administrador ${actorUsername} ha actualizado el usuario ${username}`;
    case 'user_deleted':
      return `El administrador ${actorUsername} ha eliminado el usuario ${username}`;
    default:
      return `Cambio en el usuario ${username} por ${actorUsername}`;
  }
}

// Editar un usuario
function editUser(userId) {
  openUserModal(userId);
}

// Confirmar eliminación de usuario
function confirmDeleteUser(userId, username) {
  const confirmModal = document.getElementById('confirm-modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  const deleteUserName = document.getElementById('delete-user-name');
  
  // Guardar ID del usuario a eliminar
  confirmModal.dataset.userId = userId;
  
  // Mostrar nombre del usuario
  deleteUserName.textContent = username;
  
  // Mostrar modal
  confirmModal.style.display = 'block';
  modalOverlay.style.display = 'block';
}

// Eliminar un usuario
async function deleteUser() {
  const confirmModal = document.getElementById('confirm-modal');
  const userId = confirmModal.dataset.userId;
  
  try {
    const token = localStorage.getItem('token');
    
    // Obtener nombre de usuario antes de eliminar
    const userRow = document.querySelector(`tr[data-id="${userId}"]`);
    const username = userRow ? userRow.dataset.username : 'desconocido';
    
    const response = await fetch(`/api/usuarios/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showMessage('Usuario eliminado exitosamente', 'success');
      
      // Crear notificación para otros administradores
      createUserNotification('user_deleted', username);
      
      closeAllModals();
      
      // Limpiar caché y recargar
      cachedUsers = [];
      loadUsersWithPagination();
      
      // Si tenemos estadísticas, actualizarlas
      if (typeof loadUserStatistics === 'function') {
        loadUserStatistics();
        loadUserCharts();
      }
    } else {
      showMessage(result.message || 'Error al eliminar usuario', 'error');
    }
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    showMessage('Error al eliminar usuario', 'error');
  }
}

// Cerrar todos los modales
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  const modalOverlay = document.querySelector('.modal-overlay');
  
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
  
  modalOverlay.style.display = 'none';
}

// Mostrar mensaje flotante (toast)
function showMessage(message, type = 'info') {
  // Crear elemento para el mensaje
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Añadir al DOM
  document.body.appendChild(toast);
  
  // Mostrar con animación
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Quitar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Verificar si es una fecha válida
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  // Formatear fecha: DD/MM/YYYY HH:MM
  return `${date.getDate().toString().padStart(2, '0')}/${
    (date.getMonth() + 1).toString().padStart(2, '0')}/${
    date.getFullYear()} ${
    date.getHours().toString().padStart(2, '0')}:${
    date.getMinutes().toString().padStart(2, '0')}`;
}

// Función auxiliar para mapear nombres de roles
function mapRoleName(role) {
  const roles = {
    'admin': 'Admin',
    'vendedor': 'Vendedor',
    'inventario': 'Inventario'
  };
  
  return roles[role] || role;
}

// Inicializar las pestañas del perfil
function initializeProfileTabs() {
  const tabLinks = document.querySelectorAll('.nav-link');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remover clase active de todos los enlaces y paneles
      document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelectorAll('.tab-pane').forEach(item => {
        item.classList.remove('active');
      });
      
      // Agregar clase active al enlace actual
      this.classList.add('active');
      
      // Mostrar el panel correspondiente
      const tabId = this.getAttribute('href').substring(1);
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Función para ver el perfil completo de un usuario
async function viewUserProfile(userId) {
  try {
    const token = localStorage.getItem('token');
    
    // Mostrar indicador de carga
    document.getElementById('profile-modal-title').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando perfil...';
    
    // Mostrar el modal
    const profileModal = document.getElementById('profile-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    profileModal.style.display = 'block';
    modalOverlay.style.display = 'block';
    
    // Obtener datos del usuario
    const response = await fetch(`/api/perfil/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar perfil del usuario');
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.mensaje || 'Error al cargar perfil');
    }
    
    // Mostrar datos en el perfil
    const usuario = result.usuario;
    
    // Configurar el modal con la información del usuario
    document.getElementById('profile-modal-title').textContent = `Perfil de ${usuario.nombre_completo || usuario.username}`;
    document.getElementById('profile-name').textContent = usuario.nombre_completo || usuario.username;
    document.getElementById('profile-role').textContent = mapRoleName(usuario.rol);
    document.getElementById('profile-account-since').querySelector('span').textContent = formatDate(usuario.fecha_creacion);
    document.getElementById('profile-last-login').querySelector('span').textContent = formatDate(usuario.ultimo_acceso);
    
    // Información personal
    document.getElementById('profile-username').textContent = usuario.username || '-';
    document.getElementById('profile-email').textContent = usuario.email || '-';
    document.getElementById('profile-telefono').textContent = usuario.telefono || '-';
    document.getElementById('profile-direccion').textContent = usuario.direccion || '-';
    document.getElementById('profile-fecha-nacimiento').textContent = formatDate(usuario.fecha_nacimiento) || '-';
    
    // Información profesional
    document.getElementById('profile-cargo').textContent = usuario.cargo || '-';
    document.getElementById('profile-departamento').textContent = usuario.departamento || '-';
    document.getElementById('profile-biografia').textContent = usuario.biografia || '-';
    
    // Foto de perfil
    if (usuario.foto_perfil) {
      document.getElementById('profile-photo').src = usuario.foto_perfil;
    } else {
      document.getElementById('profile-photo').src = '../images/default-profile.png';
    }
    
    // Habilidades
    const habilidadesContainer = document.getElementById('profile-habilidades');
    habilidadesContainer.innerHTML = '';
    
    try {
      let habilidades = [];
      if (usuario.habilidades) {
        habilidades = typeof usuario.habilidades === 'string' ? 
                      JSON.parse(usuario.habilidades) : usuario.habilidades;
      }
      
      if (habilidades && habilidades.length > 0) {
        habilidades.forEach(habilidad => {
          const badge = document.createElement('span');
          badge.className = 'skill-badge';
          badge.textContent = habilidad;
          habilidadesContainer.appendChild(badge);
        });
      } else {
        habilidadesContainer.innerHTML = '<p class="text-muted">No se han agregado habilidades</p>';
      }
    } catch (error) {
      console.error('Error al procesar habilidades:', error);
      habilidadesContainer.innerHTML = '<p class="text-muted">No se pudieron cargar las habilidades</p>';
    }
    
    // Redes sociales
    const redesContainer = document.getElementById('profile-redes');
    redesContainer.innerHTML = '';
    
    try {
      let redes = {};
      if (usuario.redes_sociales) {
        redes = typeof usuario.redes_sociales === 'string' ? 
                JSON.parse(usuario.redes_sociales) : usuario.redes_sociales;
      }
      
      if (redes && (redes.linkedin || redes.twitter || redes.facebook)) {
        if (redes.linkedin) {
          redesContainer.innerHTML += `
            <li>
              <a href="${redes.linkedin}" target="_blank">
                <span class="social-icon linkedin"><i class="fab fa-linkedin-in"></i></span>
                LinkedIn
              </a>
            </li>
          `;
        }
        
        if (redes.twitter) {
          redesContainer.innerHTML += `
            <li>
              <a href="${redes.twitter}" target="_blank">
                <span class="social-icon twitter"><i class="fab fa-twitter"></i></span>
                Twitter
              </a>
            </li>
          `;
        }
        
        if (redes.facebook) {
          redesContainer.innerHTML += `
            <li>
              <a href="${redes.facebook}" target="_blank">
                <span class="social-icon facebook"><i class="fab fa-facebook-f"></i></span>
                Facebook
              </a>
            </li>
          `;
        }
      } else {
        redesContainer.innerHTML = '<p class="text-muted">No se han agregado redes sociales</p>';
      }
    } catch (error) {
      console.error('Error al procesar redes sociales:', error);
      redesContainer.innerHTML = '<p class="text-muted">No se pudieron cargar las redes sociales</p>';
    }
    
    // Guardar userId en el modal para referencia
    profileModal.dataset.userId = userId;
    
  } catch (error) {
    console.error('Error al cargar perfil de usuario:', error);
    document.getElementById('profile-modal-title').textContent = 'Error al cargar perfil';
    showMessage('Error al cargar perfil del usuario', 'error');
  }
}

// Función para editar el perfil desde la vista de perfil
function editUserProfileFromView() {
  const profileModal = document.getElementById('profile-modal');
  const userId = profileModal.dataset.userId;
  
  // Cerrar modal de perfil
  closeAllModals();
  
  // Abrir modal de edición
  if (userId) {
    openUserModal(userId);
  }
}

// Exponer funciones necesarias globalmente para eventos onclick
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.viewUserProfile = viewUserProfile;