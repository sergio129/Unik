// Perfil de usuario - perfil.js

// Variables globales
let usuario = null;
let habilidadesArray = [];
let redesSociales = {
    linkedin: '',
    twitter: '',
    facebook: ''
};
let perfilOriginal = null; // Para guardar el estado original del perfil

// Cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!checkAuth()) {
        window.location.href = '/login.html';
        return;
    }
    
    // Cargar perfil del usuario
    cargarPerfil();
    
    // Configurar manejadores de eventos
    setupEventListeners();
});

// Cargar datos del perfil
async function cargarPerfil() {
    try {
        mostrarCargando('Cargando datos del perfil...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/perfil`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.mensaje || 'Error al cargar perfil');
        }
        
        usuario = data.usuario;
        
        // Guardar una copia del perfil original para comparaciones
        perfilOriginal = JSON.parse(JSON.stringify(usuario));
        
        // Mostrar datos en el formulario
        mostrarDatosPerfil(usuario);
        
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        mostrarError('Error al cargar los datos del perfil', error.message);
    } finally {
        ocultarCargando();
    }
}

// Mostrar los datos del perfil en el formulario
function mostrarDatosPerfil(usuario) {
    // Datos básicos
    document.getElementById('username-field').value = usuario.username || '';
    document.getElementById('email').value = usuario.email || '';
    document.getElementById('nombre_completo').value = usuario.nombre_completo || '';
    document.getElementById('telefono').value = usuario.telefono || '';
    document.getElementById('cargo').value = usuario.cargo || '';
    document.getElementById('departamento').value = usuario.departamento || '';
    
    // Formatear fecha de nacimiento si existe
    if (usuario.fecha_nacimiento) {
        const fecha = new Date(usuario.fecha_nacimiento);
        const fechaFormateada = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        document.getElementById('fecha_nacimiento').value = fechaFormateada;
    }
    
    document.getElementById('direccion').value = usuario.direccion || '';
    document.getElementById('biografia').value = usuario.biografia || '';
    
    // Mostrar nombre y rol en la tarjeta de perfil
    document.getElementById('user-display-name').innerText = usuario.nombre_completo || usuario.username;
    document.getElementById('user-role').innerText = traducirRol(usuario.rol);
    
    // Mostrar estadísticas
    if (usuario.ultimo_acceso) {
        document.getElementById('ultimo-acceso').innerText = formatearFecha(usuario.ultimo_acceso);
    }
    if (usuario.fecha_creacion) {
        document.getElementById('fecha-creacion').innerText = formatearFecha(usuario.fecha_creacion);
    }
    
    // Cargar foto de perfil si existe
    if (usuario.foto_perfil) {
        document.getElementById('profile-pic').src = usuario.foto_perfil;
    } else {
        document.getElementById('profile-pic').src = '../images/default-profile.png';
    }
    
    // Cargar habilidades si existen
    if (usuario.habilidades) {
        try {
            if (typeof usuario.habilidades === 'string') {
                habilidadesArray = JSON.parse(usuario.habilidades);
            } else {
                habilidadesArray = usuario.habilidades || [];
            }
            renderizarHabilidades();
        } catch (error) {
            console.error('Error al parsear habilidades:', error);
            habilidadesArray = [];
        }
    }
    
    // Cargar redes sociales si existen
    if (usuario.redes_sociales) {
        try {
            const redes = typeof usuario.redes_sociales === 'string' 
                ? JSON.parse(usuario.redes_sociales) 
                : usuario.redes_sociales;
            
            redesSociales = {
                linkedin: redes.linkedin || '',
                twitter: redes.twitter || '',
                facebook: redes.facebook || ''
            };
            
            document.getElementById('linkedin').value = redesSociales.linkedin;
            document.getElementById('twitter').value = redesSociales.twitter;
            document.getElementById('facebook').value = redesSociales.facebook;
        } catch (error) {
            console.error('Error al parsear redes sociales:', error);
        }
    }
}

// Configurar los manejadores de eventos
function setupEventListeners() {
    // Formulario principal de perfil
    document.getElementById('profile-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await actualizarPerfil();
    });
    
    // Formulario de cambio de contraseña
    document.getElementById('password-form').addEventListener('submit', function(e) {
        e.preventDefault();
        cambiarContrasena();
    });
    
    // Cargar foto de perfil
    document.getElementById('foto-input').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            subirFotoPerfil(e.target.files[0]);
        }
    });
    
    // Eliminar foto de perfil
    document.getElementById('remove-photo').addEventListener('click', eliminarFotoPerfil);
    
    // Manejo de habilidades
    document.getElementById('add-habilidad').addEventListener('click', agregarHabilidad);
    document.getElementById('nueva-habilidad').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            agregarHabilidad();
        }
    });
    
    // Botón de reset
    document.getElementById('btn-reset').addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas descartar los cambios?')) {
            mostrarDatosPerfil(perfilOriginal);
        }
    });
}

// Actualizar perfil del usuario
async function actualizarPerfil() {
    try {
        mostrarCargando('Actualizando perfil...');
        
        // Recopilar datos del formulario
        const perfilActualizado = {
            email: document.getElementById('email').value.trim(),
            nombre_completo: document.getElementById('nombre_completo').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            cargo: document.getElementById('cargo').value.trim(),
            departamento: document.getElementById('departamento').value.trim(),
            fecha_nacimiento: document.getElementById('fecha_nacimiento').value || null,
            direccion: document.getElementById('direccion').value.trim(),
            biografia: document.getElementById('biografia').value.trim(),
            habilidades: habilidadesArray,
            redes_sociales: {
                linkedin: document.getElementById('linkedin').value.trim(),
                twitter: document.getElementById('twitter').value.trim(),
                facebook: document.getElementById('facebook').value.trim()
            }
        };
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/perfil`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(perfilActualizado)
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.mensaje || 'Error al actualizar perfil');
        }
        
        // Actualizar datos locales
        usuario = data.usuario;
        perfilOriginal = JSON.parse(JSON.stringify(usuario));
        
        mostrarExito('Perfil actualizado', 'Tus datos han sido actualizados correctamente');
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        mostrarError('Error al actualizar perfil', error.message);
    } finally {
        ocultarCargando();
    }
}

// Subir foto de perfil
async function subirFotoPerfil(archivo) {
    try {
        mostrarCargando('Subiendo foto...');
        
        // Validar tamaño y tipo de archivo
        if (archivo.size > 5 * 1024 * 1024) { // 5MB
            throw new Error('La imagen no puede ser mayor a 5MB');
        }
        
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!tiposPermitidos.includes(archivo.type)) {
            throw new Error('Solo se permiten imágenes JPG y PNG');
        }
        
        // Crear FormData para enviar el archivo
        const formData = new FormData();
        formData.append('foto_perfil', archivo);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/perfil/foto`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.mensaje || 'Error al subir foto');
        }
        
        // Actualizar la imagen de perfil en la interfaz
        document.getElementById('profile-pic').src = `${data.rutaFoto}?t=${new Date().getTime()}`;
        usuario.foto_perfil = data.rutaFoto;
        
        mostrarExito('Foto actualizada', 'Tu foto de perfil ha sido actualizada correctamente');
        
    } catch (error) {
        console.error('Error al subir foto:', error);
        mostrarError('Error al subir foto', error.message);
    } finally {
        ocultarCargando();
    }
}

// Eliminar foto de perfil
async function eliminarFotoPerfil() {
    try {
        if (!usuario.foto_perfil) {
            mostrarAdvertencia('Información', 'No tienes una foto de perfil para eliminar');
            return;
        }
        
        if (!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
            return;
        }
        
        mostrarCargando('Eliminando foto...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/perfil/foto`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.mensaje || 'Error al eliminar foto');
        }
        
        // Actualizar la imagen de perfil en la interfaz
        document.getElementById('profile-pic').src = '../images/default-profile.png';
        usuario.foto_perfil = null;
        
        mostrarExito('Foto eliminada', 'Tu foto de perfil ha sido eliminada correctamente');
        
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        mostrarError('Error al eliminar foto', error.message);
    } finally {
        ocultarCargando();
    }
}

// Cambiar contraseña
async function cambiarContrasena() {
    try {
        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        
        // Validaciones básicas
        if (!currentPassword || !newPassword || !confirmPassword) {
            mostrarAdvertencia('Campos incompletos', 'Por favor completa todos los campos');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            mostrarAdvertencia('Error de validación', 'Las contraseñas no coinciden');
            return;
        }
        
        if (newPassword.length < 6) {
            mostrarAdvertencia('Error de validación', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        
        mostrarCargando('Actualizando contraseña...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/auth/cambiar-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.mensaje || 'Error al cambiar contraseña');
        }
        
        // Limpiar formulario
        document.getElementById('password-form').reset();
        
        mostrarExito('Contraseña actualizada', 'Tu contraseña ha sido actualizada correctamente');
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        mostrarError('Error al cambiar contraseña', error.message);
    } finally {
        ocultarCargando();
    }
}

// Funciones para manejar habilidades
function agregarHabilidad() {
    const inputHabilidad = document.getElementById('nueva-habilidad');
    const habilidad = inputHabilidad.value.trim();
    
    if (!habilidad) return;
    
    if (habilidadesArray.includes(habilidad)) {
        mostrarAdvertencia('Habilidad duplicada', 'Esta habilidad ya está en tu lista');
        return;
    }
    
    habilidadesArray.push(habilidad);
    inputHabilidad.value = '';
    renderizarHabilidades();
}

function eliminarHabilidad(index) {
    habilidadesArray.splice(index, 1);
    renderizarHabilidades();
}

function renderizarHabilidades() {
    const container = document.getElementById('habilidades-container');
    container.innerHTML = '';
    
    habilidadesArray.forEach((habilidad, index) => {
        const badge = document.createElement('div');
        badge.className = 'skill-badge';
        badge.innerHTML = `
            <span>${habilidad}</span>
            <span class="remove-skill" onclick="eliminarHabilidad(${index})">
                <i class="fas fa-times"></i>
            </span>
        `;
        container.appendChild(badge);
    });
}

// Función para exponer eliminarHabilidad al contexto global
window.eliminarHabilidad = eliminarHabilidad;

// Funciones de utilidad
function formatearFecha(fechaString) {
    if (!fechaString) return '-';
    
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function traducirRol(rol) {
    const roles = {
        'admin': 'Administrador',
        'vendedor': 'Vendedor',
        'inventario': 'Inventario'
    };
    return roles[rol] || rol;
}

// Funciones para mostrar notificaciones
function mostrarCargando(mensaje = 'Cargando...') {
    Swal.fire({
        title: mensaje,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

function ocultarCargando() {
    Swal.close();
}

function mostrarExito(titulo, mensaje) {
    Swal.fire({
        icon: 'success',
        title: titulo,
        text: mensaje,
        timer: 2000,
        showConfirmButton: false
    });
}

function mostrarError(titulo, mensaje) {
    Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje
    });
}

function mostrarAdvertencia(titulo, mensaje) {
    Swal.fire({
        icon: 'warning',
        title: titulo,
        text: mensaje
    });
}