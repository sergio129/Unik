/**
 * dashboard.js - Script principal para el panel de control
 * La UNIKA - Sistema de gestión de inventario
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes del dashboard
    initDashboard();
    
    // Cargar datos del dashboard
    loadDashboardData();
    
    // Inicializar manejo de notificaciones
    initNotifications();
    
    // Inicializar el panel de bajo stock
    initLowStockPanel();
});

// Función para inicializar el dashboard
function initDashboard() {
    // Configurar el nombre de usuario
    const userDisplay = document.getElementById('user-display');
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (userData && userData.nombre) {
        userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${userData.nombre}`;
    } else {
        userDisplay.innerHTML = '<i class="fas fa-user-circle"></i> Usuario';
    }
    
    // Configurar botón de salir
    const logoutButton = document.querySelector('.user-menu button');
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    });
    
    // Mostrar/ocultar elementos según el rol del usuario
    configureUserRoleElements();
}

// Configurar elementos según el rol del usuario
function configureUserRoleElements() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const adminElements = document.querySelectorAll('.admin-only');
    
    if (userData && userData.rol === 'admin') {
        adminElements.forEach(el => el.style.display = 'block');
    } else {
        adminElements.forEach(el => el.style.display = 'none');
    }
}

// Cargar datos para el dashboard
function loadDashboardData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // Cargar datos para el dashboard original (secciones estáticas)
    loadDashboardCounts();
    loadActivityLog();
}

// Cargar contadores para el dashboard estático
function loadDashboardCounts() {
    const token = localStorage.getItem('token');
    
    // Cargar conteo de productos
    fetch('/api/productos/count', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('total-productos').textContent = data.count || 0;
        }
    })
    .catch(error => {
        console.error('Error al cargar conteo de productos:', error);
        document.getElementById('total-productos').textContent = '0';
    });
    
    // Cargar ventas del día
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    fetch(`/api/ventas/conteo-diario?fecha=${formattedDate}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const ventasElement = document.getElementById('ventas-hoy');
            const transaccionesElement = document.getElementById('transacciones-hoy');
            
            if (ventasElement) {
                ventasElement.textContent = `$${data.total.toLocaleString()}`;
            }
            
            if (transaccionesElement) {
                const word = data.count === 1 ? 'transacción' : 'transacciones';
                transaccionesElement.textContent = `${data.count} ${word} hoy`;
            }
        }
    })
    .catch(error => {
        console.error('Error al cargar ventas del día:', error);
        if (document.getElementById('ventas-hoy')) {
            document.getElementById('ventas-hoy').textContent = '$0';
        }
        if (document.getElementById('transacciones-hoy')) {
            document.getElementById('transacciones-hoy').textContent = '0 transacciones hoy';
        }
    });
    
    // Cargar pedidos pendientes
    fetch('/api/pedidos/pendientes/count', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const pedidosElement = document.getElementById('pedidos-pendientes');
            if (pedidosElement) {
                pedidosElement.textContent = data.count || 0;
            }
        }
    })
    .catch(error => {
        console.error('Error al cargar pedidos pendientes:', error);
        if (document.getElementById('pedidos-pendientes')) {
            document.getElementById('pedidos-pendientes').textContent = '0';
        }
    });
}

// Cargar log de actividad reciente
function loadActivityLog() {
    const token = localStorage.getItem('token');
    
    fetch('/api/actividad?limit=10', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data) {
            renderActivityLog(data.data);
        }
    })
    .catch(error => {
        console.error('Error al cargar log de actividad:', error);
    });
}

// Renderizar el log de actividad
function renderActivityLog(activities) {
    const activityLogElement = document.getElementById('activity-log');
    if (!activityLogElement || !activities.length) return;
    
    let html = '';
    activities.forEach(activity => {
        const fecha = new Date(activity.fecha_creacion);
        const fechaFormateada = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString().substr(0, 5)}`;
        
        let badgeClass = 'badge-info';
        let detalle = activity.detalle || '';
        
        // Determinar el tipo de badge según el tipo de actividad
        if (activity.tipo.includes('venta')) {
            badgeClass = 'badge-success';
            if (activity.detalle && !isNaN(activity.detalle)) {
                detalle = `$${parseFloat(activity.detalle).toLocaleString()}`;
            }
        } else if (activity.tipo.includes('inventario') || activity.tipo.includes('producto')) {
            badgeClass = 'badge-primary';
        } else if (activity.tipo.includes('pedido')) {
            badgeClass = 'badge-warning';
        } else if (activity.tipo.includes('error') || activity.tipo.includes('eliminado')) {
            badgeClass = 'badge-danger';
        }
        
        html += `
        <tr>
            <td>${fechaFormateada}</td>
            <td>${activity.tipo}</td>
            <td>${activity.usuario || 'Sistema'}</td>
            <td><span class="badge ${badgeClass}">${detalle}</span></td>
        </tr>
        `;
    });
    
    activityLogElement.innerHTML = html;
}

// Inicializar panel de bajo stock
function initLowStockPanel() {
    const token = localStorage.getItem('token');
    
    fetch('/api/productos/bajo-stock', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const lowStockProducts = data.products || [];
            renderLowStockProducts(lowStockProducts);
            
            // Actualizar mensaje de alerta
            const lowStockCount = document.getElementById('low-stock-count');
            if (lowStockCount) {
                if (lowStockProducts.length > 0) {
                    lowStockCount.innerHTML = `Hay <strong>${lowStockProducts.length}</strong> productos con bajo stock que requieren atención.`;
                } else {
                    lowStockCount.innerHTML = 'No hay productos con bajo stock actualmente.';
                    document.getElementById('low-stock-message').className = 'alert alert-success';
                }
            }
        }
    })
    .catch(error => {
        console.error('Error al obtener productos con bajo stock:', error);
        const lowStockCount = document.getElementById('low-stock-count');
        if (lowStockCount) {
            lowStockCount.textContent = 'Error al cargar productos con bajo stock.';
            document.getElementById('low-stock-message').className = 'alert alert-danger';
        }
    });
    
    // Configurar modal de creación de pedidos
    setupPedidoModal();
}

// Renderizar tabla de productos con bajo stock
function renderLowStockProducts(products) {
    const tableBody = document.getElementById('low-stock-products');
    if (!tableBody) return;
    
    if (!products.length) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No hay productos con bajo stock actualmente.</td></tr>`;
        return;
    }
    
    let html = '';
    products.forEach(product => {
        const porcentajeStock = (product.stock / product.stock_minimo) * 100;
        let stockClass = 'text-danger';
        
        if (porcentajeStock >= 75) {
            stockClass = 'text-warning';
        }
        
        html += `
        <tr>
            <td>${product.nombre}</td>
            <td>${product.categoria ? product.categoria.nombre : 'Sin categoría'}</td>
            <td class="${stockClass}"><strong>${product.stock}</strong></td>
            <td>${product.stock_minimo}</td>
            <td>
                <button class="button-sm crear-pedido" data-id="${product.id}" data-nombre="${product.nombre}">
                    <i class="fas fa-truck"></i> Crear pedido
                </button>
            </td>
        </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Añadir event listeners a los botones de crear pedido
    document.querySelectorAll('.crear-pedido').forEach(btn => {
        btn.addEventListener('click', function() {
            const productoId = this.getAttribute('data-id');
            const productoNombre = this.getAttribute('data-nombre');
            openPedidoModal(productoId, productoNombre);
        });
    });
}

// Configurar modal de creación de pedidos
function setupPedidoModal() {
    const modal = document.getElementById('pedido-modal');
    const overlay = document.querySelector('.modal-overlay');
    const closeButton = modal.querySelector('.close-modal');
    const cancelButton = document.getElementById('btn-cancel-pedido');
    const form = document.getElementById('pedido-form');
    
    // Configurar fecha mínima para entrega (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('fecha-entrega').min = tomorrow.toISOString().split('T')[0];
    
    // Cargar lista de proveedores
    loadProveedores();
    
    // Cerrar modal con botón X
    closeButton.addEventListener('click', function() {
        closeModal();
    });
    
    // Cerrar modal con botón Cancelar
    cancelButton.addEventListener('click', function() {
        closeModal();
    });
    
    // Cerrar modal al hacer clic en overlay
    overlay.addEventListener('click', function() {
        closeModal();
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        crearPedido();
    });
    
    function closeModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        form.reset();
    }
    
    // Exportar función al ámbito global
    window.closeModal = closeModal;
}

// Cargar lista de proveedores para el modal
function loadProveedores() {
    const token = localStorage.getItem('token');
    const selectProveedor = document.getElementById('proveedor');
    
    fetch('/api/proveedores', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data) {
            const proveedores = data.data;
            let options = '<option value="">Seleccione un proveedor</option>';
            
            proveedores.forEach(proveedor => {
                options += `<option value="${proveedor.id}">${proveedor.nombre}</option>`;
            });
            
            selectProveedor.innerHTML = options;
        }
    })
    .catch(error => {
        console.error('Error al cargar proveedores:', error);
        selectProveedor.innerHTML = '<option value="">Error al cargar proveedores</option>';
    });
}

// Abrir modal de creación de pedido
function openPedidoModal(productoId, productoNombre) {
    document.getElementById('producto-id').value = productoId;
    document.getElementById('producto-nombre').value = productoNombre;
    
    // Mostrar modal
    document.getElementById('pedido-modal').style.display = 'block';
    document.querySelector('.modal-overlay').style.display = 'block';
}

// Crear pedido desde el modal
function crearPedido() {
    const token = localStorage.getItem('token');
    const productoId = document.getElementById('producto-id').value;
    const proveedorId = document.getElementById('proveedor').value;
    const cantidad = document.getElementById('cantidad-pedido').value;
    const precioUnitario = document.getElementById('precio-unitario').value;
    const fechaEntrega = document.getElementById('fecha-entrega').value;
    const notas = document.getElementById('notas').value;
    
    // Preparar datos para enviar
    const pedidoData = {
        producto_id: productoId,
        proveedor_id: proveedorId,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        fecha_entrega_estimada: fechaEntrega,
        notas: notas,
        estado: 'pendiente'
    };
    
    // Enviar pedido a la API
    fetch('/api/pedidos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pedidoData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cerrar modal
            window.closeModal();
            
            // Mostrar notificación de éxito
            showNotification('¡Pedido creado!', 'El pedido ha sido creado correctamente.', 'success');
            
            // Recargar la lista de productos con bajo stock
            initLowStockPanel();
        } else {
            throw new Error(data.message || 'Error al crear el pedido');
        }
    })
    .catch(error => {
        console.error('Error al crear pedido:', error);
        showNotification('Error', 'No se pudo crear el pedido: ' + error.message, 'error');
    });
}

// Inicializar sistema de notificaciones
function initNotifications() {
    // El código de notificaciones se maneja en notificaciones.js
    if (typeof initializeNotifications === 'function') {
        initializeNotifications();
    }
}

// Función para mostrar notificaciones
function showNotification(title, message, type = 'info') {
    if (typeof displayNotification === 'function') {
        displayNotification(title, message, type);
    } else {
        // Implementación alternativa si displayNotification no está disponible
        alert(`${title}: ${message}`);
    }
}