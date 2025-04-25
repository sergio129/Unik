// Inventory Dashboard functionality for La UNIKA
document.addEventListener('DOMContentLoaded', function() {
    // Verify authentication
    checkAuthentication();
    
    // Setup UI elements
    setupUI();
    
    // Load inventory data
    loadInventoryData();
});

// Función de utilidad para mostrar notificaciones toast
function showToast(message, type = 'info', duration = 3000) {
    const types = {
        success: 'toast-success',
        error: 'toast-error',
        warning: 'toast-warning',
        info: 'toast-info'
    };
    
    const icon = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    Toastify({
        text: `${icon[type] || ''} ${message}`,
        duration: duration,
        close: true,
        className: types[type] || 'toast-info',
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        escapeMarkup: false // Permite interpretar HTML
    }).showToast();
}

// Verify authentication
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        // Usar toast en lugar de alerta para redirigir
        showToast('Sesión no válida. Redirigiendo a login...', 'warning');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return false;
    }
    
    // Verify token validity by making a request to the API
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            // Usar toast en lugar de alerta para token inválido
            showToast('Sesión expirada. Por favor, inicie sesión de nuevo.', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return false;
        }
        return response.json();
    })
    .then(data => {
        if (data && data.success) {
            // Solo mostrar el mensaje de bienvenida la primera vez, no en cada recarga
            const lastAuth = sessionStorage.getItem('lastAuth');
            const now = new Date().getTime();
            
            if (!lastAuth || (now - parseInt(lastAuth)) > 300000) { // 5 minutos
                showToast(`Bienvenido, ${data.data.nombre_completo || data.data.username}`, 'success');
                sessionStorage.setItem('lastAuth', now);
            }
        }
    })
    .catch(error => {
        console.error('Error verifying authentication:', error);
        // No mostrar el error a menos que sea el primer intento de autenticación
        const authAttempts = sessionStorage.getItem('authAttempts') || 0;
        if (authAttempts < 1) {
            showToast('Error de conexión. Intente más tarde.', 'error');
            sessionStorage.setItem('authAttempts', 1);
        }
        return false;
    });
    
    return true;
}

// Set up UI elements
function setupUI() {
    // Load user information
    loadUserInfo();
    
    // Highlight current page in menu
    highlightCurrentPage();
    
    // Set up logout function
    document.querySelector('button.secondary').addEventListener('click', logout);
}

// Display user information
function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.textContent = user.nombre_completo || user.username;
            }
            
            // Show specific elements based on user role
            if (user.rol) {
                document.body.setAttribute('data-role', user.rol);
                
                // Adjust visibility of elements based on role
                const adminElements = document.querySelectorAll('.admin-only');
                const vendedorElements = document.querySelectorAll('.vendedor-only');
                const inventarioElements = document.querySelectorAll('.inventario-only');
                
                adminElements.forEach(el => {
                    el.style.display = user.rol === 'admin' ? 'block' : 'none';
                });
                
                vendedorElements.forEach(el => {
                    el.style.display = user.rol === 'vendedor' || user.rol === 'admin' ? 'block' : 'none';
                });
                
                inventarioElements.forEach(el => {
                    el.style.display = user.rol === 'inventario' || user.rol === 'admin' ? 'block' : 'none';
                });
            }
        }
    } catch (error) {
        console.error('Error loading user information:', error);
    }
}

// Highlight current page in menu
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Logout function
function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Make request to server to invalidate the token
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            // Clear localStorage regardless of response
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login
            window.location.href = '/login';
        })
        .catch(error => {
            console.error('Error during logout:', error);
            
            // In case of error, still clear and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    } else {
        // If there's no token, simply redirect
        window.location.href = '/login';
    }
}

// Load data for the inventory dashboard
function loadInventoryData() {
    // Load product count
    loadProductCount();
    
    // Load categories count
    loadCategoriesCount();
    
    // Load movements count
    loadMovementsCount();
    
    // Load low stock count
    loadLowStockCount();
    
    // Load recent movements
    loadRecentMovements();
}

// Load product count
function loadProductCount() {
    const token = localStorage.getItem('token');
    
    // In a real application, this would be loaded from the API
    // For now, let's use example data
    fetch('/api/productos', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('total-productos').textContent = data.data.length;
        }
    })
    .catch(error => {
        console.error('Error loading product count:', error);
        document.getElementById('total-productos').textContent = '...';
    });
}

// Load categories count
function loadCategoriesCount() {
    const token = localStorage.getItem('token');
    
    // In a real application, this would be loaded from the API
    fetch('/api/categorias', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('total-categorias').textContent = data.data.length;
        }
    })
    .catch(error => {
        console.error('Error loading categories count:', error);
        document.getElementById('total-categorias').textContent = '...';
    });
}

// Load movements count
function loadMovementsCount() {
    const token = localStorage.getItem('token');
    
    // For now, use example data
    setTimeout(() => {
        document.getElementById('total-movimientos').textContent = '27';
    }, 600);
}

// Load low stock count
function loadLowStockCount() {
    const token = localStorage.getItem('token');
    
    // For now, use example data
    setTimeout(() => {
        document.getElementById('bajo-stock').textContent = '5';
    }, 500);
}

// Load recent inventory movements
function loadRecentMovements() {
    const token = localStorage.getItem('token');
    const recentMovementsTable = document.getElementById('recent-movements');
    
    // Mostrar indicador de carga
    recentMovementsTable.innerHTML = '<tr><td colspan="5" class="text-center">Cargando movimientos...</td></tr>';
    
    // Obtener movimientos recientes desde la API
    fetch('/api/movimientos?limit=5', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar movimientos recientes');
        }
        return response.json();
    })
    .then(data => {
        // Verificar si se obtuvieron datos
        if (!data.success || !data.data || data.data.length === 0) {
            recentMovementsTable.innerHTML = '<tr><td colspan="5" class="text-center">No hay movimientos recientes</td></tr>';
            return;
        }
        
        // Limpiar tabla
        recentMovementsTable.innerHTML = '';
        
        // Mostrar los 5 movimientos más recientes
        const movimientos = data.data.slice(0, 5);
        
        // Generar filas para cada movimiento
        movimientos.forEach(movimiento => {
            // Formatear fecha
            const fecha = new Date(movimiento.fecha_creacion);
            const fechaFormateada = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString().substr(0, 5);
            
            // Determinar clase para el badge según el tipo de movimiento
            let badgeClass = 'badge-warning'; // Por defecto para ajustes
            if (movimiento.tipo_movimiento === 'entrada') {
                badgeClass = 'badge-success';
            } else if (movimiento.tipo_movimiento === 'salida') {
                badgeClass = 'badge-danger';
            }
            
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${fechaFormateada}</td>
                <td><span class="badge ${badgeClass}">${capitalizar(movimiento.tipo_movimiento)}</span></td>
                <td>${movimiento.producto ? movimiento.producto.nombre : 'Producto desconocido'}</td>
                <td>${Math.abs(movimiento.cantidad)}</td>
                <td>${movimiento.usuario ? (movimiento.usuario.nombre_completo || movimiento.usuario.username) : 'Usuario desconocido'}</td>
            `;
            
            recentMovementsTable.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error loading recent movements:', error);
        recentMovementsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar movimientos recientes</td></tr>';
        showToast('No se pudieron cargar los movimientos recientes', 'error');
    });
}

// Función auxiliar para capitalizar texto
function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}