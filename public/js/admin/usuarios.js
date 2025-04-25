// Funcionalidad para la administración de usuarios
document.addEventListener('DOMContentLoaded', function() {
  // Verificar que el usuario tenga permisos de administrador
  checkAdminPermissions();
  
  // Inicializar componentes
  initializeModals();
  setupEventListeners();
  
  // Cargar lista de usuarios
  loadUsers();
});

// Verificar que el usuario sea administrador
function checkAdminPermissions() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.rol !== 'admin') {
      // Redirigir si no es administrador
      window.location.href = '/dashboard';
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
  
  // Manejar envío del formulario
  userForm.addEventListener('submit', handleUserFormSubmit);
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
  
  searchInput.addEventListener('input', filterUsers);
  roleFilter.addEventListener('change', filterUsers);
}

// Cargar lista de usuarios desde el servidor
async function loadUsers() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
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
    
    if (result.success) {
      renderUsers(result.data);
    } else {
      showMessage('Error al cargar usuarios: ' + result.message, 'error');
    }
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    showMessage('Error al cargar la lista de usuarios', 'error');
  }
}

// Renderizar la lista de usuarios
function renderUsers(users) {
  const tbody = document.getElementById('users-list');
  
  // Si no hay usuarios, mostrar mensaje
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">No hay usuarios registrados</td>
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
}

// Filtrar usuarios según búsqueda y rol
function filterUsers() {
  const searchTerm = document.getElementById('search-users').value.toLowerCase();
  const roleFilter = document.getElementById('filter-role').value;
  
  const rows = document.querySelectorAll('#users-list tr');
  
  rows.forEach(row => {
    const username = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
    const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
    const email = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
    const role = row.querySelector('.role-badge').className;
    
    const matchesSearch = username.includes(searchTerm) || 
                          name.includes(searchTerm) || 
                          email.includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || role.includes(roleFilter);
    
    if (matchesSearch && matchesRole) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
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
  
  const userData = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    nombre_completo: document.getElementById('nombre_completo').value,
    email: document.getElementById('email').value,
    rol: document.getElementById('rol').value
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
      
      // Cerrar modal y recargar lista
      closeAllModals();
      loadUsers();
    } else {
      showMessage(result.message || 'Error al guardar usuario', 'error');
    }
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    showMessage('Error al guardar usuario', 'error');
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
      closeAllModals();
      loadUsers();
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