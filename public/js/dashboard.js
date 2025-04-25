// Dashboard functionality for La UNIKA
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación primero
    if (!await checkAuthentication()) {
        return;
    }
    
    // Configurar modales antes de cualquier otra operación
    setupModals();
    
    // Configurar elementos de la interfaz
    setupUI();
    
    // Cargar datos del dashboard
    loadDashboardData();
});

// Verificar si el usuario está autenticado
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        // Redirigir al login si no hay token
        window.location.href = '/login';
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token inválido, limpiar localStorage y redirigir al login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        return false;
    }
}

// Configurar elementos de la interfaz
function setupUI() {
    // Cargar información del usuario
    loadUserInfo();
    
    // Resaltar página actual en el menú
    highlightCurrentPage();
    
    // Configurar función de logout
    document.querySelector('button.secondary').addEventListener('click', logout);
}

// Mostrar información del usuario
function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.textContent = user.nombre_completo || user.username;
            }
            
            // Mostrar elementos específicos según el rol del usuario
            if (user.rol) {
                document.body.setAttribute('data-role', user.rol);
                
                // Ajustar visibilidad de elementos según el rol
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
        console.error('Error al cargar información del usuario:', error);
    }
}

// Resaltar página actual en el menú
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

// Función para cerrar sesión
function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Hacer petición al servidor para invalidar el token
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            // Independientemente de la respuesta, limpiamos localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirigir al login
            window.location.href = '/login';
        })
        .catch(error => {
            console.error('Error al cerrar sesión:', error);
            
            // En caso de error, igualmente limpiamos y redirigimos
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    } else {
        // Si no hay token, simplemente redirigir
        window.location.href = '/login';
    }
}

// Cargar datos para el dashboard
function loadDashboardData() {
    // Cargar conteo de productos
    loadProductCount();
    
    // Cargar resumen de ventas
    loadSalesData();
    
    // Cargar conteo de pedidos pendientes
    loadPendingOrders();
    
    // Cargar actividad reciente
    loadRecentActivity();
    
    // Cargar productos con bajo stock
    loadLowStockProducts();
}

// Cargar conteo de productos en inventario
function loadProductCount() {
    const token = localStorage.getItem('token');
    
    // Obtener el conteo real desde la API
    fetch('/api/productos?activo=true', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const count = data.data.length;
            document.getElementById('total-productos').textContent = count.toLocaleString();
        } else {
            throw new Error(data.message || 'Error al cargar el conteo de productos');
        }
    })
    .catch(error => {
        console.error('Error al cargar conteo de productos:', error);
        document.getElementById('total-productos').textContent = '...';
    });
}

// Cargar datos de ventas
function loadSalesData() {
    const token = localStorage.getItem('token');
    
    fetch('/api/ventas/resumen/diario', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al obtener datos de ventas');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Formatear el total con separadores de miles
            const total = parseFloat(data.data.total).toLocaleString('es-CO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Actualizar los elementos del DOM
            document.getElementById('ventas-hoy').textContent = `$${total}`;
            
            // Mostrar el texto con el número de transacciones
            const cantidad = data.data.cantidad;
            document.getElementById('transacciones-hoy').textContent = 
                `${cantidad} ${cantidad === 1 ? 'transacción' : 'transacciones'} hoy`;
        } else {
            throw new Error(data.message || 'Error al obtener los datos de ventas');
        }
    })
    .catch(error => {
        console.error('Error al cargar datos de ventas:', error);
        document.getElementById('ventas-hoy').textContent = '$0.00';
        document.getElementById('transacciones-hoy').textContent = '0 transacciones hoy';
    });
}

// Cargar conteo de pedidos pendientes
function loadPendingOrders() {
    // En una aplicación real, esto se cargaría desde la API
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
        document.getElementById('pedidos-pendientes').textContent = '8';
    }, 600);
}

// Cargar actividad reciente
function loadRecentActivity() {
    const token = localStorage.getItem('token');
    const activityLog = document.getElementById('activity-log');
    
    // Mostrar mensaje de carga mientras se obtienen los datos
    activityLog.innerHTML = '<tr><td colspan="4" class="text-center">Cargando actividad reciente...</td></tr>';
    
    // Hacer petición a la API para obtener la actividad reciente
    fetch('/api/actividad/reciente?limit=5', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al obtener la actividad reciente');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const actividades = data.data;
            
            // Si no hay actividades recientes
            if (actividades.length === 0) {
                activityLog.innerHTML = '<tr><td colspan="4" class="text-center">No hay actividades recientes</td></tr>';
                return;
            }
            
            // Limpiar tabla
            activityLog.innerHTML = '';
            
            // Poblar tabla con datos reales
            actividades.forEach(item => {
                const row = document.createElement('tr');
                
                // Formatear fecha
                const fecha = new Date(item.fecha);
                const fechaFormateada = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                
                // Determinar la clase del badge según el tipo de actividad
                let badgeClass, badgeValue;
                if (item.tipo === 'venta') {
                    badgeClass = 'badge-success';
                    badgeValue = `$${parseFloat(item.detalle.valor).toLocaleString('es-CO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
                } else if (item.tipo === 'entrada_producto') {
                    badgeClass = 'badge-primary';
                    badgeValue = `${item.detalle.cantidad} unidades`;
                } else if (item.tipo === 'salida_producto') {
                    badgeClass = 'badge-warning';
                    badgeValue = `${item.detalle.cantidad} unidades`;
                } else {
                    badgeClass = 'badge-info';
                    badgeValue = 'Ver detalle';
                }
                
                row.innerHTML = `
                    <td>${fechaFormateada}</td>
                    <td>${item.descripcion}</td>
                    <td>${item.usuario}</td>
                    <td><span class="badge ${badgeClass}">${badgeValue}</span></td>
                `;
                
                activityLog.appendChild(row);
            });
            
            // Agregar funcionalidad al botón "Ver todo"
            document.querySelector('.card-header button.secondary').addEventListener('click', function() {
                // Aquí podríamos navegar a una página de historial completo si existiera
                showNotification('Esta funcionalidad estará disponible próximamente', 'info');
            });
            
        } else {
            throw new Error(data.message || 'Error al obtener la actividad reciente');
        }
    })
    .catch(error => {
        console.error('Error al cargar actividad reciente:', error);
        activityLog.innerHTML = `<tr><td colspan="4" class="text-center">Error al cargar la actividad: ${error.message}</td></tr>`;
    });
}

// Cargar productos con bajo stock
function loadLowStockProducts() {
    const token = localStorage.getItem('token');
    const lowStockTable = document.getElementById('low-stock-products');
    
    // Limpiar tabla
    lowStockTable.innerHTML = '<tr><td colspan="5" class="text-center">Cargando productos...</td></tr>';
    
    // Obtener productos con bajo stock desde la API
    fetch('/api/productos/bajo-stock', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Error al cargar productos con bajo stock');
        }
        
        const productos = data.data;
        
        // Actualizar mensaje con la cantidad real de productos
        document.getElementById('low-stock-count').textContent = 
            `${productos.length} producto${productos.length !== 1 ? 's' : ''} con bajo inventario`;
        
        // Si no hay productos con bajo stock
        if (productos.length === 0) {
            lowStockTable.innerHTML = '<tr><td colspan="5" class="text-center">No hay productos con bajo stock</td></tr>';
            return;
        }
        
        // Limpiar tabla
        lowStockTable.innerHTML = '';
        
        // Poblar tabla con datos reales
        productos.forEach(item => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.categoria ? item.categoria.nombre : 'Sin categoría'}</td>
                <td><span class="badge badge-danger">${item.cantidad}</span></td>
                <td>${item.stock_minimo}</td>
                <td>
                    <button class="secondary" onclick="ordenarProducto('${item.codigo}')">
                        <i class="fas fa-plus"></i> Ordenar
                    </button>
                </td>
            `;
            
            lowStockTable.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error al cargar productos con bajo stock:', error);
        lowStockTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Error al cargar productos con bajo stock: ${error.message}
                </td>
            </tr>
        `;
    });
}

// Función para ordenar un producto
function ordenarProducto(productId) {
    showPedidoModal(productId);
}

// Funciones para la modal de pedidos
function showPedidoModal(productoId) {
    const token = localStorage.getItem('token');
    const modal = document.getElementById('pedido-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    
    // Limpiar formulario antes de mostrar la modal
    const form = document.getElementById('pedido-form');
    if (form) form.reset();
    
    // Obtener información del producto
    fetch(`/api/productos/${productoId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const producto = data.data;
            document.getElementById('producto-id').value = producto.codigo;
            document.getElementById('producto-nombre').value = producto.nombre;
            document.getElementById('precio-unitario').value = producto.precio_compra || '';

            // Establecer fecha mínima de entrega a mañana
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('fecha-entrega').min = tomorrow.toISOString().split('T')[0];
            
            // Mostrar la modal
            if (modal) modal.classList.add('active');
            if (modalOverlay) modalOverlay.classList.add('active');
        } else {
            showNotification('Error al cargar información del producto', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al cargar información del producto', 'error');
    });
}

function hidePedidoModal() {
    const modal = document.getElementById('pedido-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const form = document.getElementById('pedido-form');

    // Ocultar modal y overlay
    if (modal) modal.classList.remove('active');
    if (modalOverlay) modalOverlay.classList.remove('active');
    
    // Limpiar formulario al cerrar
    if (form) form.reset();
}

function setupModals() {
    const pedidoModal = document.getElementById('pedido-modal');
    const pedidoForm = document.getElementById('pedido-form');
    const btnCancelPedido = document.getElementById('btn-cancel-pedido');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');

    // Asegurarse de que la modal esté oculta inicialmente
    hidePedidoModal();
    
    if (pedidoForm) {
        pedidoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showNotification('Pedido creado exitosamente', 'success');
            hidePedidoModal();
        });
    }
    
    if (btnCancelPedido) {
        btnCancelPedido.addEventListener('click', hidePedidoModal);
    }
    
    // Cerrar modal con el botón X
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', hidePedidoModal);
    });

    // Cerrar modal con click en overlay
    modalOverlay?.addEventListener('click', hidePedidoModal);
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}