/**
 * Módulo de Autenticación
 * Maneja el inicio de sesión, cierre de sesión y verificación de autenticación
 */

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si el usuario está autenticado, false en caso contrario
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token; // Convierte a booleano
}

/**
 * Obtiene el token de autenticación
 * @returns {string|null} - El token de autenticación o null si no está disponible
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Obtiene la información del usuario actual
 * @returns {Object|null} - El objeto con la información del usuario o null si no está disponible
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('usuario');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Error al parsear la información del usuario', e);
        return null;
    }
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
    // Mostrar un mensaje de confirmación
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        // Eliminar token y datos de usuario
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        
        // Redirigir al login
        window.location.href = '/login.html';
    }
}

/**
 * Inicializa los datos del usuario en la interfaz
 * @param {string} userDisplaySelector - Selector CSS para el elemento que muestra el nombre del usuario
 */
function initUserData(userDisplaySelector = '#username') {
    const user = getCurrentUser();
    if (user && document.querySelector(userDisplaySelector)) {
        document.querySelector(userDisplaySelector).textContent = user.nombre || user.username || 'Usuario';
    }
}