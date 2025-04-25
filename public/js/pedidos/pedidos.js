/**
 * Módulo de Gestión de Pedidos a Proveedores
 * Este archivo contiene la lógica para administrar pedidos a proveedores, incluyendo
 * crear nuevos pedidos, listar pedidos existentes, actualizar estados,
 * y manejar los productos dentro de cada pedido.
 */

// Variables globales
let pedidosTable;
let productosDisponibles = [];
let proveedoresDisponibles = [];
let productosPedidoActual = [];
let pedidoActual = null;
let modoEdicion = false;

// Constantes
const URL_API_PEDIDOS = '/api/pedidos';
const URL_API_PRODUCTOS = '/api/productos';
const URL_API_PROVEEDORES = '/api/proveedores';
const URL_API_WHATSAPP = '/api/whatsapp'; // API para integraciones con WhatsApp

// Inicialización cuando el documento está listo
$(document).ready(function() {
    console.log('Inicializando módulo de pedidos a proveedores...');
    
    // Verificar si el usuario está autenticado
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Inicializar el nombre de usuario en la interfaz
    initUserInfo();

    // Cargar el menú lateral según el rol del usuario
    cargarMenuSidebar();

    // Configurar el logout
    $('#btn-logout').click(function(e) {
        e.preventDefault();
        logout();
    });

    // Inicializar la tabla de pedidos
    initPedidosTable();

    // Cargar datos iniciales
    cargarProveedores();
    cargarProductos();
    cargarEstadisticas();
    cargarPedidos();  // Cargar los pedidos iniciales

    // Configurar eventos para botones principales
    configurarEventos();
    
    // Inicializar el sistema de pestañas
    configurarSistemaTabs();
    
    // Inicializar la fecha actual en el modal de pedidos
    $('#fecha-pedido-display').val(moment().format('DD/MM/YYYY'));
    
    // Configurar valor predeterminado para la fecha de entrega estimada (7 días después)
    $('#fecha-entrega').val(moment().add(7, 'days').format('YYYY-MM-DD'));
});

/**
 * Configura el sistema de pestañas dentro del modal del pedido
 */
function configurarSistemaTabs() {
    // Manejar clics en las pestañas
    $('.modal-tab').on('click', function() {
        const tabId = $(this).data('tab');
        
        // Activar esta pestaña y desactivar las demás
        $('.modal-tab').removeClass('active');
        $(this).addClass('active');
        
        // Mostrar el contenido correspondiente y ocultar los demás
        $('.modal-tab-content').removeClass('active');
        $('#tab-' + tabId).addClass('active');
    });
}

/**
 * Configura todos los eventos de la interfaz de usuario
 */
function configurarEventos() {
    console.log('Configurando eventos de la interfaz...');
    
    // Evento para el botón de nuevo pedido
    $('#btn-nuevo-pedido').off('click').on('click', function() {
        console.log('Botón Nuevo Pedido clickeado');
        abrirModalNuevoPedido();
    });

    // Botón para gestionar proveedores
    $('#btn-gestionar-proveedores').off('click').on('click', function() {
        abrirModalGestionProveedores();
    });
	  // Botón para agregar un nuevo proveedor rápidamente
    $('#btn-nuevo-proveedor-rapido').off('click').on('click', function() {
        abrirModalNuevoProveedor();
    });

    // Otros botones y eventos
    $('#btn-guardar-pedido').off('click').on('click', guardarPedido);
    $('#btn-agregar-producto').off('click').on('click', agregarProductoAlPedido);
    $('#btn-cambiar-estado').off('click').on('click', cambiarEstadoPedido);
    $('#btn-limpiar-filtros').off('click').on('click', limpiarFiltros);
    $('#btn-nuevo-proveedor').off('click').on('click', abrirModalNuevoProveedor);
    $('#btn-guardar-proveedor').off('click').on('click', guardarProveedor);
	 $('#btn-limpiar-productos').off('click').on('click', limpiarProductosPedido);
    
    // Búsqueda rápida de productos
    $('#buscar-producto').off('keyup').on('keyup', function() {
        buscarProductoRapido($(this).val());
    });
    
    // Mostrar detalles del proveedor al seleccionar uno
    $('#proveedor-select').off('change').on('change', function() {
        const proveedorId = $(this).val();
        if (proveedorId) {
            mostrarInfoProveedor(proveedorId);
            cargarHistorialPedidosProveedor(proveedorId);
        } else {
            $('#info-proveedor').text('');
            $('#historial-pedidos-proveedor').html('<div class="text-center py-3 text-muted"><i class="fas fa-info-circle"></i> Seleccione un proveedor para ver su historial</div>');
        }
    });
    
    // Mostrar stock actual al seleccionar un producto
    $('#producto-select').off('change').on('change', function() {
        const productoId = $(this).val();
        if (productoId) {
            mostrarStockProducto(productoId);
        } else {
            $('#stock-actual').text('');
        }
    });
    
    // Escanear código de barras (simulación)
    $('#btn-escanear-codigo').off('click').on('click', simularEscaneoCodigoBarras);
    
    // Form de filtros
    $('#filter-form').off('submit').on('submit', function(e) {
        e.preventDefault();
        filtrarPedidos();
    });
    
    // Prevenir envío automático del formulario de pedido
    $('#pedido-form').off('submit').on('submit', function(e) {
        e.preventDefault();
        console.log('Formulario de pedido intentó enviarse, pero fue prevenido');
        return false;
    });

    // Configuración adicional para modales
    $('#pedidoModal').on('hidden.bs.modal', function() {
        limpiarFormularioPedido();
    });
    
    // Configurar eventos para eliminar productos de un pedido
    $('#tabla-productos-pedido').on('click', '.btn-eliminar-producto', function() {
        const index = $(this).data('index');
        eliminarProductoDePedido(index);
    });
}

/**
 * Limpia todos los productos del pedido actual
 */
function limpiarProductosPedido() {
    if (productosPedidoActual.length === 0) {
        showNotification('No hay productos para limpiar', 'info');
        return;
    }
    
    if (confirm('¿Está seguro de querer eliminar todos los productos del pedido?')) {
        productosPedidoActual = [];
        actualizarTablaPedido();
        actualizarContadorProductos();
        showNotification('Lista de productos limpiada', 'success');
    }
}

/**
 * Inicializa la tabla de pedidos con DataTables
 */
function initPedidosTable() {
    pedidosTable = $('#tabla-pedidos').DataTable({
        responsive: true,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.10.22/i18n/Spanish.json'
        },
        columns: [
            { data: 'codigo' },
            { 
                data: null,
                render: function(data, type, row) {
                    // Tomar el proveedor_id y buscar el nombre del proveedor
                    const proveedor = proveedoresDisponibles.find(p => p.id === row.proveedor_id);
                    return proveedor ? proveedor.nombre : `Proveedor ID: ${row.proveedor_id}`;
                }
            },
            { 
                data: 'fecha_pedido',
                render: function(data) {
                    return moment(data).format('DD/MM/YYYY HH:mm');
                }
            },
            { 
                data: 'fecha_entrega_estimada',
                render: function(data) {
                    return data ? moment(data).format('DD/MM/YYYY') : 'No especificada';
                }
            },
            { 
                data: 'estado',
                render: function(data) {
                    let claseBadge = '';
                    let textoEstado = '';
                    
                    switch (data) {
                        case 'pendiente':
                            textoEstado = 'Pendiente';
                            claseBadge = 'bg-warning';
                            break;
                        case 'en_proceso':
                            textoEstado = 'En Proceso';
                            claseBadge = 'bg-info';
                            break;
                        case 'completado':
                            textoEstado = 'Completado';
                            claseBadge = 'bg-success';
                            break;
                        case 'cancelado':
                            textoEstado = 'Cancelado';
                            claseBadge = 'bg-danger';
                            break;
                        default:
                            textoEstado = data;
                            claseBadge = 'bg-secondary';
                    }
                    
                    return '<span class="badge rounded-pill ' + claseBadge + '">' + textoEstado + '</span>';
                }
            },
            { 
                data: 'prioridad',
                render: function(data) {
                    let claseBadge = '';
                    let textoPrioridad = '';
                    
                    switch (data) {
                        case 'baja':
                            textoPrioridad = 'Baja';
                            claseBadge = 'bg-secondary';
                            break;
                        case 'media':
                            textoPrioridad = 'Media';
                            claseBadge = 'bg-primary';
                            break;
                        case 'alta':
                            textoPrioridad = 'Alta';
                            claseBadge = 'bg-warning';
                            break;
                        case 'urgente':
                            textoPrioridad = 'Urgente';
                            claseBadge = 'bg-danger';
                            break;
                        default:
                            textoPrioridad = data;
                            claseBadge = 'bg-secondary';
                    }
                    
                    return '<span class="badge rounded-pill ' + claseBadge + '">' + textoPrioridad + '</span>';
                }
            },
            { 
                data: null,
                orderable: false,
                className: 'action-buttons',
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-info btn-action btn-ver" data-id="${data.id}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${data.estado !== 'completado' && data.estado !== 'cancelado' ? 
                        `<button class="btn btn-sm btn-primary btn-action btn-editar" data-id="${data.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>` : ''}
                    `;
                }
            }
        ],
        createdRow: function(row, data) {
            // Aplicar clase especial a filas según prioridad
            if (data.prioridad === 'urgente') {
                $(row).addClass('prioridad-urgente');
            } else if (data.prioridad === 'alta') {
                $(row).addClass('prioridad-alta');
            }
        },
        order: [[2, 'desc']] // Ordenar por fecha
    });

    // Eventos para botones de acción
    $('#tabla-pedidos').on('click', '.btn-ver', function() {
        const pedidoId = $(this).data('id');
        verDetallePedido(pedidoId);
    });

    $('#tabla-pedidos').on('click', '.btn-editar', function() {
        const pedidoId = $(this).data('id');
        editarPedido(pedidoId);
    });
}

/**
 * Carga la lista de proveedores desde la API
 */
function cargarProveedores() {
    console.log('Iniciando carga de proveedores...');
    
    // Mostrar indicador de carga en el selector
    const selectProveedor = $('#proveedor-select');
    selectProveedor.empty();
    selectProveedor.append('<option value="">Cargando proveedores...</option>');
    selectProveedor.prop('disabled', true);
    
    // Preparar selector de filtro también
    const filterProveedor = $('#filter-proveedor');
    filterProveedor.empty();
    filterProveedor.append('<option value="">Cargando...</option>');
    filterProveedor.prop('disabled', true);

    fetch(URL_API_PROVEEDORES, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        console.log('Respuesta de API proveedores recibida:', response.status);
        if (!response.ok) {
            throw new Error(`Error al cargar los proveedores: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Datos de proveedores recibidos:', data);
        
        // Habilitar el selector
        selectProveedor.prop('disabled', false);
        filterProveedor.prop('disabled', false);
        
        // Limpiar selectores
        selectProveedor.empty();
        selectProveedor.append('<option value="">Seleccionar proveedor...</option>');
        
        filterProveedor.empty();
        filterProveedor.append('<option value="">Todos</option>');
        
        // Extraer proveedores de la respuesta, manejando diferentes estructuras posibles
        let proveedoresList = [];
        
        if (data && data.success === true && data.data && data.data.proveedores) {
            // Formato actual: { success: true, data: { proveedores: [] } }
            proveedoresList = data.data.proveedores;
        } else if (data && data.success === true && data.data && Array.isArray(data.data)) {
            // Formato anterior: data.data[]
            proveedoresList = data.data;
        } else if (data && data.success === true && Array.isArray(data.proveedores)) {
            // Nuevo formato: { success: true, proveedores: [] }
            proveedoresList = data.proveedores;
        } else if (Array.isArray(data)) {
            // Formato directo: data[]
            proveedoresList = data;
        }
        
        // Asignar proveedores a la variable global
        proveedoresDisponibles = proveedoresList;
        
        console.log(`Se cargaron ${proveedoresDisponibles.length} proveedores`);
        
        if (proveedoresDisponibles.length === 0) {
            selectProveedor.append('<option value="" disabled>No hay proveedores disponibles</option>');
            console.warn('No se encontraron proveedores en la respuesta de la API');
        } else {
            // Poblar selectores con los proveedores
            proveedoresDisponibles.forEach(proveedor => {
                console.log(`Agregando proveedor: ${proveedor.id} - ${proveedor.nombre}`);
                selectProveedor.append(`<option value="${proveedor.id}">${proveedor.nombre}</option>`);
                filterProveedor.append(`<option value="${proveedor.id}">${proveedor.nombre}</option>`);
            });
        }
    })
    .catch(error => {
        // Habilitar el selector y mostrar error
        selectProveedor.prop('disabled', false);
        filterProveedor.prop('disabled', false);
        
        selectProveedor.empty();
        selectProveedor.append('<option value="">Seleccionar proveedor...</option>');
        selectProveedor.append('<option value="" disabled>Error al cargar proveedores</option>');
        
        filterProveedor.empty();
        filterProveedor.append('<option value="">Todos</option>');
        
        console.error('Error al cargar proveedores:', error);
        showNotification('Error al cargar proveedores: ' + error.message, 'error');
    });
}

/**
 * Carga la lista de productos disponibles desde la API
 */
function cargarProductos() {
    console.log('Iniciando carga de productos...');
    
    // Mostrar indicador de carga en el selector
    const selectProducto = $('#producto-select');
    selectProducto.empty();
    selectProducto.append('<option value="">Cargando productos...</option>');
    selectProducto.prop('disabled', true);
    
    fetch(URL_API_PRODUCTOS, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        console.log('Respuesta de API productos recibida:', response.status);
        if (!response.ok) {
            throw new Error(`Error al cargar los productos: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Datos de productos recibidos:', data);
        
        // Habilitar el selector
        selectProducto.prop('disabled', false);
        selectProducto.empty();
        selectProducto.append('<option value="">Seleccionar producto...</option>');
        
        if (data.success) {
            productosDisponibles = data.data;
            console.log(`Se cargaron ${productosDisponibles.length} productos`);
            
            if (productosDisponibles.length === 0) {
                selectProducto.append('<option value="" disabled>No hay productos disponibles</option>');
            } else {
                // Poblar selector de productos - IMPORTANTE: usar el CODIGO como valor en lugar del ID
                productosDisponibles.forEach(producto => {
                    // Usar el código como value del option, ya que es nuestra clave primaria real
                    selectProducto.append(`<option value="${producto.codigo}" data-precio="${producto.precio_venta || producto.precio || 0}">${producto.nombre} (${producto.codigo})</option>`);
                });
            }
        } else {
            selectProducto.append('<option value="" disabled>Error al cargar productos</option>');
            console.error('Error en respuesta de productos:', data.message);
        }
    })
    .catch(error => {
        // Habilitar el selector y mostrar error
        selectProducto.prop('disabled', false);
        selectProducto.empty();
        selectProducto.append('<option value="">Seleccionar producto...</option>');
        selectProducto.append('<option value="" disabled>Error al cargar productos</option>');
        
        console.error('Error al cargar productos:', error);
        showNotification('Error al cargar productos: ' + error.message, 'error');
    });
}

/**
 * Carga estadísticas de pedidos para el dashboard
 */
function cargarEstadisticas() {
    fetch(`${URL_API_PEDIDOS}/estadisticas/resumen`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const stats = data.data;
            
            // Actualizar contadores
            $('#stats-total-pedidos').text(stats.totalPedidos || 0);
            
            // Contar por estado
            let pendientes = 0;
            let enProceso = 0;
            let completados = 0;
            
            if (stats.pedidosPorEstado && Array.isArray(stats.pedidosPorEstado)) {
                stats.pedidosPorEstado.forEach(item => {
                    if (item.estado === 'pendiente') pendientes = item.total;
                    if (item.estado === 'en_proceso') enProceso = item.total;
                    if (item.estado === 'completado') completados = item.total;
                });
            }
            
            $('#stats-pendientes').text(pendientes);
            $('#stats-en-proceso').text(enProceso);
            $('#stats-completados').text(completados);
        }
    })
    .catch(error => {
        console.error('Error al cargar estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    });
}

/**
 * Carga la lista de pedidos según los filtros aplicados
 */
function cargarPedidos() {
    // Mostrar spinner de carga
    $('#tabla-pedidos tbody').html('<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Cargando...</span></div></td></tr>');
    
    // Obtener filtros
    const estado = $('#filter-estado').val();
    const proveedor_id = $('#filter-proveedor').val();
    const fecha_inicio = $('#filter-fecha-inicio').val();
    const fecha_fin = $('#filter-fecha-fin').val();
    
    // Construir URL con parámetros de filtrado
    let url = URL_API_PEDIDOS + '?';
    if (estado) url += `estado=${estado}&`;
    if (proveedor_id) url += `proveedor_id=${proveedor_id}&`;
    if (fecha_inicio) url += `fecha_inicio=${fecha_inicio}&`;
    if (fecha_fin) url += `fecha_fin=${fecha_fin}&`;
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar pedidos');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Limpiar tabla y añadir nuevos datos
            pedidosTable.clear();
            pedidosTable.rows.add(data.data.pedidos).draw();
            
            // Actualizar estadísticas
            cargarEstadisticas();
            
            // Notificar a la vista de calendario sobre los cambios
            if (window.pedidosCalendario) {
                // Disparar evento con los datos de pedidos actualizados
                const eventoPedidosActualizados = new CustomEvent('pedidosActualizados', {
                    detail: data.data.pedidos
                });
                document.dispatchEvent(eventoPedidosActualizados);
            }
        } else {
            showNotification('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error al cargar pedidos:', error);
        showNotification('Error al cargar pedidos', 'error');
        
        // Mostrar mensaje de error en la tabla
        $('#tabla-pedidos tbody').html('<tr><td colspan="8" class="text-center text-danger">Error al cargar pedidos</td></tr>');
    });
}

/**
 * Aplica filtros a la tabla de pedidos
 */
function filtrarPedidos() {
    cargarPedidos();
}

/**
 * Limpia todos los filtros y recarga los datos
 */
function limpiarFiltros() {
    $('#filter-estado').val('');
    $('#filter-proveedor').val('');
    $('#filter-fecha-inicio').val('');
    $('#filter-fecha-fin').val('');
    cargarPedidos();
}

/**
 * Abre el modal para crear un nuevo pedido
 */
function abrirModalNuevoPedido() {
    modoEdicion = false;
    pedidoActual = null;
    productosPedidoActual = [];
    
    // Configurar el modal
    $('#pedidoModalLabel').text('Nuevo Pedido a Proveedor');
    
    // Limpiar y reiniciar el formulario
    limpiarFormularioPedido();
    
    // Actualizar la tabla sin validaciones que puedan causar errores
    const tbody = $('#tabla-productos-pedido tbody');
    tbody.empty();
    tbody.append('<tr><td colspan="3" class="text-center">No hay productos en este pedido</td></tr>');
    
    // Actualizar contador
    $('#contador-productos').text('0');
    
    // Abrir el modal
    $('#pedidoModal').modal('show');
}

/**
 * Abre el modal para gestionar proveedores
 */
function abrirModalGestionProveedores() {
    // Cargar la tabla de proveedores
    cargarTablaProveedores();
    
    // Abrir el modal
    $('#proveedorModal').modal('show');
}

/**
 * Carga la tabla de proveedores con datos actualizados
 */
function cargarTablaProveedores() {
    // Mostrar spinner de carga
    $('#tabla-proveedores tbody').html('<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Cargando...</span></div></td></tr>');
    
    fetch(URL_API_PROVEEDORES, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar proveedores');
        }
        return response.json();
    })
    .then(data => {
        // Manejar la nueva estructura de la respuesta
        let proveedores = [];
        
        if (data && data.success === true && data.data && data.data.proveedores) {
            // Nuevo formato: { success: true, data: { proveedores: [] } }
            proveedores = data.data.proveedores;
        } else if (data && data.success === true && Array.isArray(data.data)) {
            // Formato anterior: { success: true, data: [] }
            proveedores = data.data;
        } else if (Array.isArray(data)) {
            // Formato directo: []
            proveedores = data;
        }
        
        // Limpiar tabla
        $('#tabla-proveedores tbody').empty();
        
        if (proveedores.length === 0) {
            $('#tabla-proveedores tbody').html('<tr><td colspan="6" class="text-center">No hay proveedores registrados</td></tr>');
            return;
        }
        
        // Añadir proveedores a la tabla
        proveedores.forEach(proveedor => {
            $('#tabla-proveedores tbody').append(`
                <tr>
                    <td>${proveedor.id}</td>
                    <td>${proveedor.nombre}</td>
                    <td>${proveedor.telefono || '-'}</td>
                    <td>${proveedor.email || '-'}</td>
                    <td>${proveedor.direccion || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-editar-proveedor" data-id="${proveedor.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
        
        // Configurar eventos para botones de editar
        $('.btn-editar-proveedor').off('click').on('click', function() {
            const proveedorId = $(this).data('id');
            editarProveedor(proveedorId);
        });
    })
    .catch(error => {
        console.error('Error al cargar proveedores:', error);
        $('#tabla-proveedores tbody').html('<tr><td colspan="6" class="text-center text-danger">Error al cargar proveedores</td></tr>');
    });
}

/**
 * Abre el modal para crear un nuevo proveedor
 */
function abrirModalNuevoProveedor() {
    // Limpiar formulario
    $('#proveedor-id').val('');
    $('#proveedor-nombre').val('');
    $('#proveedor-telefono').val('');
    $('#proveedor-email').val('');
    $('#proveedor-direccion').val('');
    $('#proveedor-notas').val('');
    
    // Configurar título
    $('#editProveedorModalLabel').text('Nuevo Proveedor');
    
    // Configurar botón de guardar
    $('#btn-guardar-proveedor').off('click').on('click', guardarProveedor);
    
    // Abrir modal
    $('#proveedorModal').modal('hide');
    $('#editProveedorModal').modal('show');
}

/**
 * Abre el modal para editar un proveedor existente
 */
function editarProveedor(proveedorId) {
    // Buscar el proveedor en la lista
    const proveedor = proveedoresDisponibles.find(p => p.id == proveedorId);
    
    if (!proveedor) {
        showNotification('Proveedor no encontrado', 'error');
        return;
    }
    
    // Llenar formulario
    $('#proveedor-id').val(proveedor.id);
    $('#proveedor-nombre').val(proveedor.nombre);
    $('#proveedor-telefono').val(proveedor.telefono || '');
    $('#proveedor-email').val(proveedor.email || '');
    $('#proveedor-direccion').val(proveedor.direccion || '');
    $('#proveedor-notas').val(proveedor.notas || '');
    
    // Configurar título
    $('#editProveedorModalLabel').text('Editar Proveedor');
    
    // Configurar botón de guardar
    $('#btn-guardar-proveedor').off('click').on('click', guardarProveedor);
    
    // Abrir modal
    $('#proveedorModal').modal('hide');
    $('#editProveedorModal').modal('show');
}

/**
 * Guarda un nuevo proveedor o actualiza uno existente
 */
function guardarProveedor() {
    // Validar campos requeridos
    const nombre = $('#proveedor-nombre').val();
    
    if (!nombre) {
        showNotification('El nombre del proveedor es obligatorio', 'warning');
        return;
    }
    
    // Recopilar datos del formulario
    const proveedorData = {
        nombre: nombre,
        telefono: $('#proveedor-telefono').val(),
        email: $('#proveedor-email').val(),
        direccion: $('#proveedor-direccion').val(),
        notas: $('#proveedor-notas').val()
    };
    
    // Determinar si es creación o actualización
    const proveedorId = $('#proveedor-id').val();
    const isEditing = !!proveedorId;
    
    // URL y método según operación
    let url = URL_API_PROVEEDORES;
    let method = 'POST';
    
    if (isEditing) {
        url = `${URL_API_PROVEEDORES}/${proveedorId}`;
        method = 'PUT';
    }
    
    // Mostrar spinner en botón
    const btnGuardar = $('#btn-guardar-proveedor');
    const textoOriginal = btnGuardar.text();
    btnGuardar.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...');
    btnGuardar.prop('disabled', true);
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(proveedorData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al guardar proveedor');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification(isEditing ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
            $('#editProveedorModal').modal('hide');
            $('#proveedorModal').modal('show');
            
            // Recargar lista de proveedores
            cargarProveedores();
            cargarTablaProveedores();
        } else {
            showNotification('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al guardar proveedor', 'error');
    })
    .finally(() => {
        // Restaurar botón
        btnGuardar.text(textoOriginal);
        btnGuardar.prop('disabled', false);
    });
}

/**
 * Limpia el formulario de pedido
 */
function limpiarFormularioPedido() {
    $('#pedido-id').val('');
    $('#proveedor-select').val('');
    $('#fecha-entrega').val('');
    $('#prioridad-select').val('media');
    $('#origen-select').val('reposicion');
    $('#direccion-entrega').val('');
    $('#notas-pedido').val('');
    $('#persona-contacto').val('');
    $('#condiciones-pago').val('credito_30');
    $('#metodo-envio').val('proveedor');
    $('#notas-adicionales').val('');
    $('#producto-select').val('');
    $('#cantidad-producto').val(1);
    
    productosPedidoActual = [];
    actualizarTablaPedido();
}

/**
 * Agrega un producto al pedido actual
 */
function agregarProductoAlPedido(e) {
    // Prevenir el comportamiento predeterminado del formulario
    if (e) e.preventDefault();
    
    // Obtener el código del producto seleccionado directamente del select
    const productoId = $('#producto-select').val();
    const cantidad = parseInt($('#cantidad-producto').val() || 1);
    
    // Validar que se haya seleccionado un producto
    if (!productoId) {
        showNotification('Debe seleccionar un producto', 'warning');
        return;
    }
    
    // Validar que la cantidad sea válida
    if (isNaN(cantidad) || cantidad <= 0) {
        showNotification('La cantidad debe ser mayor a 0', 'warning');
        return;
    }
    
    // Buscar el producto seleccionado en el array de productos disponibles
    console.log('Buscando producto con ID:', productoId);
    console.log('Total productos disponibles:', productosDisponibles.length);
    
    // Como los productos en la BD usan 'codigo' como llave primaria, debemos buscar por código
    const productoSeleccionado = productosDisponibles.find(p => {
        // La comparación debe ser segura, puede ser por ID o por código
        return (
            p.codigo === productoId || 
            (p.id && p.id.toString() === productoId.toString())
        );
    });
    
    // Validar que se encontró el producto
    if (!productoSeleccionado) {
        showNotification('Producto no encontrado. Intente seleccionar el producto nuevamente.', 'error');
        console.error('Producto no encontrado. ID/código buscado:', productoId);
        return;
    }
    
    // Usar datos directamente del objeto producto encontrado
    const productoParaPedido = {
        id: productoSeleccionado.id || productoId, // Usa id si existe, o productoId como respaldo
        codigo: productoSeleccionado.codigo,
        nombre: productoSeleccionado.nombre + ' (' + productoSeleccionado.codigo + ')',
        cantidad: cantidad
    };
    
    console.log('Agregando producto al pedido:', productoParaPedido);
    
    // Añadir al array de productos del pedido
    productosPedidoActual.push(productoParaPedido);
    
    // Actualizar tabla
    actualizarTablaPedido();
    
    // Limpiar selección
    $('#producto-select').val('');
    $('#cantidad-producto').val(1);
    $('#stock-actual').text('');
    
    // Actualizar el contador de productos
    actualizarContadorProductos();
    
    // Mostrar confirmación
    showNotification('Producto agregado al pedido', 'success');
}

/**
 * Actualiza la tabla de productos del pedido
 */
function actualizarTablaPedido() {
    const tbody = $('#tabla-productos-pedido tbody');
    tbody.empty();
    
    if (productosPedidoActual.length === 0) {
        tbody.append('<tr><td colspan="3" class="text-center">No hay productos en este pedido</td></tr>');
    } else {
        productosPedidoActual.forEach((producto, index) => {
            tbody.append(`
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.cantidad}</td>
                    <td>
                        <button class="btn btn-sm btn-danger btn-eliminar-producto" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }
    
    // Vincular el evento para eliminar productos
    $('.btn-eliminar-producto').off('click').on('click', function() {
        const index = $(this).data('index');
        eliminarProductoDePedido(index);
    });
}

/**
 * Elimina un producto del pedido actual por su índice
 */
function eliminarProductoDePedido(index) {
    if (index >= 0 && index < productosPedidoActual.length) {
        productosPedidoActual.splice(index, 1);
        actualizarTablaPedido();
        showNotification('Producto eliminado del pedido', 'info');
    }
}

/**
 * Muestra información adicional del proveedor seleccionado
 */
function mostrarInfoProveedor(proveedorId) {
    const proveedor = proveedoresDisponibles.find(p => p.id == proveedorId);
    if (proveedor) {
        let infoText = '';
        if (proveedor.telefono) infoText += `📞 ${proveedor.telefono} `;
        if (proveedor.email) infoText += `📧 ${proveedor.email}`;
        $('#info-proveedor').text(infoText);
    } else {
        $('#info-proveedor').text('');
    }
}

/**
 * Muestra el stock actual del producto seleccionado
 */
function mostrarStockProducto(productoCodigo) {
    // Ahora buscamos el producto por su código en lugar de por su ID
    const producto = productosDisponibles.find(p => p.codigo === productoCodigo);
    
    if (producto) {
        $('#stock-actual').text(`Stock actual: ${producto.stock || producto.cantidad || 0} unidades`);
    } else {
        $('#stock-actual').text('');
    }
}

/**
 * Busca productos basados en texto ingresado y actualiza el select
 */
function buscarProductoRapido(texto) {
    if (!texto || texto.length < 2) return;
    
    // Filtrar productos que coincidan con el texto
    const productosFiltrados = productosDisponibles.filter(p => 
        p.nombre.toLowerCase().includes(texto.toLowerCase()) || 
        p.codigo.toLowerCase().includes(texto.toLowerCase())
    );
    
    // Actualizar el selector con los resultados
    const selectProducto = $('#producto-select');
    selectProducto.empty();
    selectProducto.append('<option value="">Seleccionar producto...</option>');
    
    if (productosFiltrados.length > 0) {
        productosFiltrados.forEach(producto => {
            // Usar el código como value del option, igual que en cargarProductos()
            selectProducto.append(`<option value="${producto.codigo}" data-precio="${producto.precio_venta || producto.precio || 0}">${producto.nombre} (${producto.codigo})</option>`);
        });
        
        // Si hay un solo resultado, seleccionarlo automáticamente
        if (productosFiltrados.length === 1) {
            selectProducto.val(productosFiltrados[0].codigo); // Usar código en lugar de ID
            mostrarStockProducto(productosFiltrados[0].codigo);
        }
    } else {
        selectProducto.append('<option value="" disabled>No se encontraron productos</option>');
    }
}

/**
 * Simula el escaneo de un código de barras
 */
function simularEscaneoCodigoBarras() {
    $('#buscar-producto').val('');
    
    // Mostrar una notificación de escaneo
    showNotification('Simulando escaneo de código de barras...', 'info');
    
    // Simular un tiempo de procesamiento
    setTimeout(() => {
        // Seleccionar un producto aleatorio para la simulación
        if (productosDisponibles.length > 0) {
            const indiceAleatorio = Math.floor(Math.random() * productosDisponibles.length);
            const productoAleatorio = productosDisponibles[indiceAleatorio];
            
            $('#buscar-producto').val(productoAleatorio.codigo);
            $('#producto-select').val(productoAleatorio.codigo); // Usar código en lugar de ID
            $('#cantidad-producto').val(1);
            mostrarStockProducto(productoAleatorio.codigo); // Pasar el código en lugar del ID
            
            showNotification(`Producto escaneado: ${productoAleatorio.nombre}`, 'success');
        } else {
            showNotification('No hay productos disponibles para escanear', 'warning');
        }
    }, 1000);
}

/**
 * Carga el historial de pedidos del proveedor seleccionado
 */
function cargarHistorialPedidosProveedor(proveedorId) {
    const historialContainer = $('#historial-pedidos-proveedor');
    historialContainer.html('<div class="text-center py-3"><div class="spinner-border spinner-border-sm" role="status"></div> Cargando historial...</div>');
    
    fetch(`${URL_API_PEDIDOS}?proveedor_id=${proveedorId}&limit=5`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar historial de pedidos');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data && data.data.pedidos) {
            const pedidos = data.data.pedidos;
            
            if (pedidos.length === 0) {
                historialContainer.html('<div class="text-center py-3 text-muted">No hay pedidos anteriores con este proveedor</div>');
                return;
            }
            
            // Crear una lista de pedidos anteriores
            let html = '<div class="list-group list-group-flush">';
            
            pedidos.forEach(pedido => {
                const fechaPedido = moment(pedido.fecha_pedido).format('DD/MM/YYYY');
                const colorEstado = getColorEstado(pedido.estado);
                
                html += `
                    <div class="list-group-item list-group-item-action py-2 px-3">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${pedido.codigo}</h6>
                            <small>${fechaPedido}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge badge-${colorEstado} badge-pill">${formatEstado(pedido.estado)}</span>
                            <button type="button" class="btn btn-sm btn-outline-info btn-ver-pedido-anterior" 
                                data-id="${pedido.id}">Ver</button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            historialContainer.html(html);
            
            // Configurar eventos para los botones de ver pedido
            $('.btn-ver-pedido-anterior').off('click').on('click', function() {
                const pedidoId = $(this).data('id');
                $('#pedidoModal').modal('hide');
                setTimeout(() => {
                    verDetallePedido(pedidoId);
                }, 500);
            });
        } else {
            historialContainer.html('<div class="text-center py-3 text-danger">Error al cargar historial</div>');
        }
    })
    .catch(error => {
        console.error('Error al cargar historial:', error);
        historialContainer.html('<div class="text-center py-3 text-danger">Error al cargar historial</div>');
    });
}

/**
 * Actualiza el contador de productos en el pedido
 */
function actualizarContadorProductos() {
    $('#contador-productos').text(productosPedidoActual.length);
}

/**
 * Obtiene el color de badge según el estado
 */
function getColorEstado(estado) {
    switch (estado) {
        case 'pendiente': return 'warning';
        case 'en_proceso': return 'info';
        case 'completado': return 'success';
        case 'cancelado': return 'danger';
        default: return 'secondary';
    }
}

/**
 * Guarda un nuevo pedido o actualiza uno existente
 */
function guardarPedido() {
    // Validar datos básicos
    const proveedorId = $('#proveedor-select').val();
    if (!proveedorId) {
        showNotification('Debe seleccionar un proveedor', 'warning');
        return;
    }
    
    // Validar que se haya seleccionado una categoría
    const categoriaId = $('#origen-select').val();
    if (!categoriaId) {
        showNotification('Debe seleccionar una categoría', 'warning');
        return;
    }
    
    if (productosPedidoActual.length === 0) {
        showNotification('Debe agregar al menos un producto al pedido', 'warning');
        return;
    }
    
    console.log('Productos antes de validar:', JSON.stringify(productosPedidoActual));
    
    // Validar productos - asegurarnos de que cada producto tenga un código válido
    let productosValidos = [];
    
    for (let i = 0; i < productosPedidoActual.length; i++) {
        const producto = productosPedidoActual[i];
        
        // Si el producto ya tiene código, lo consideramos válido
        if (producto.codigo) {
            productosValidos.push(producto);
            continue;
        }
        
        // Si no tiene código pero tiene nombre con formato "Nombre (CÓDIGO)"
        if (producto.nombre) {
            const match = producto.nombre.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                const codigoExtraido = match[1];
                producto.codigo = codigoExtraido;
                productosValidos.push(producto);
                continue;
            }
        }
        
        // Si tiene ID, intentamos encontrar el código
        if (producto.id) {
            const productoEnLista = productosDisponibles.find(p => parseInt(p.id) === parseInt(producto.id));
            if (productoEnLista && productoEnLista.codigo) {
                producto.codigo = productoEnLista.codigo;
                productosValidos.push(producto);
                continue;
            }
        }
        
        // Si no pudimos encontrar el código, es inválido
        console.error('Producto sin código identificable:', producto);
        showNotification(`No se pudo identificar el código del producto: ${producto.nombre || 'Sin nombre'}`, 'warning');
    }
    
    // Verificar si tenemos productos válidos después de la validación
    if (productosValidos.length === 0) {
        showNotification('No hay productos válidos para agregar al pedido. Verifique que los productos tengan códigos correctos.', 'error');
        return;
    }
    
    // Informar si se descartaron productos
    if (productosValidos.length < productosPedidoActual.length) {
        const diferencia = productosPedidoActual.length - productosValidos.length;
        showNotification(`Se han descartado ${diferencia} productos sin información de código`, 'warning');
        
        // Actualizar la lista global con solo los productos válidos
        productosPedidoActual = productosValidos;
        actualizarTablaPedido();
    }
    
    // Hacer una verificación final para asegurarnos de que todos los productos tienen código
    const todosProductosValidos = productosValidos.every(p => p.codigo);
    if (!todosProductosValidos) {
        showNotification('Hay productos sin código en el pedido. Por favor, elimine y añada nuevamente los productos con problemas.', 'error');
        return;
    }
    
    // Log de depuración para ver los productos finales
    console.log('Productos validados:', productosValidos);
    
    // Capturar todos los campos del formulario de manera explícita
    const personaContacto = $('#persona-de-contacto').val() || '';
    const condicionesPago = $('#condiciones-pago').val() || '';
    const metodoEnvio = $('#metodo-envio').val() || '';
    const notasAdicionales = $('#notas-adicionales').val() || '';
    
    console.log('Campos adicionales capturados:');
    console.log('- persona_contacto:', personaContacto);
    console.log('- condiciones_pago:', condicionesPago);
    console.log('- metodo_envio:', metodoEnvio);
    console.log('- notas_adicionales:', notasAdicionales);
    
    // Preparar datos del pedido incluyendo todos los campos del formulario
    const pedidoData = {
        proveedor_id: proveedorId,
        fecha_entrega_estimada: $('#fecha-entrega').val() || null,
        prioridad: $('#prioridad-select').val() || 'media',
        origen: $('#origen-select').val() || 'tienda',
        direccion_entrega: $('#direccion-entrega').val() || '',
        notas: $('#notas-pedido').val() || '',
        // Asegurar que estos campos se envíen con los nombres exactos que espera el backend
        persona_contacto: personaContacto,
        condiciones_pago: condicionesPago,
        metodo_envio: metodoEnvio,
        notas_adicionales: notasAdicionales,
        detalles: productosValidos.map(p => ({
            producto_id: p.codigo, // Usar el código como ID del producto para la BD
            cantidad: parseInt(p.cantidad) || 1
        }))
    };
    
    // Mostrar datos completos para depuración
    console.log('Datos completos del pedido a enviar:', JSON.stringify(pedidoData));
    
    // Mostrar spinner en botón de guardar
    const botonGuardar = $('#btn-guardar-pedido');
    const textoOriginal = botonGuardar.html();
    botonGuardar.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...');
    botonGuardar.prop('disabled', true);
    
    let url = URL_API_PEDIDOS;
    let method = 'POST';
    
    // Si estamos en modo edición, cambiar URL y método
    if (modoEdicion && pedidoActual) {
        url = `${URL_API_PEDIDOS}/${pedidoActual.id}`;
        method = 'PUT';
    }
    
    // Mostrar información de depuración
    console.log('Enviando pedido a:', url);
    console.log('Método:', method);
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(pedidoData)
    })
    .then(response => {
        console.log('Respuesta recibida:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Error en la respuesta:', text);
                throw new Error(`Error al guardar el pedido: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Datos recibidos tras guardar:', data);
        if (data.success) {
            $('#pedidoModal').modal('hide');
            
            const mensaje = modoEdicion ? 'Pedido actualizado exitosamente' : 'Pedido creado exitosamente';
            showNotification(mensaje, 'success');
            
            // Si es un nuevo pedido (no edición), enviar notificación WhatsApp automáticamente
            if (!modoEdicion && data.data && data.data.id) {
                console.log('Enviando notificación WhatsApp automática para el nuevo pedido:', data.data.id);
                // Pequeño delay para asegurar que la UI se actualice primero
                setTimeout(() => {
                    enviarNotificacionWhatsApp(data.data.id);
                }, 500);
            }
            
            // Recargar lista de pedidos
            cargarPedidos();
        } else {
            showNotification('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al guardar el pedido: ' + error.message, 'error');
    })
    .finally(() => {
        // Restaurar botón
        botonGuardar.html(textoOriginal);
        botonGuardar.prop('disabled', false);
    });
}

/**
 * Abre el modal para ver los detalles de un pedido
 */
function verDetallePedido(pedidoId) {
    fetch(`${URL_API_PEDIDOS}/${pedidoId}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar detalles del pedido');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const pedido = data.data;
            pedidoActual = pedido;
            
            // Buscar nombre del proveedor
            const proveedor = proveedoresDisponibles.find(p => p.id === pedido.proveedor_id);
            const nombreProveedor = proveedor ? proveedor.nombre : `Proveedor ID: ${pedido.proveedor_id}`;
            
            // Llenar información general
            $('#detalle-codigo').text(pedido.codigo);
            $('#detalle-proveedor').text(nombreProveedor);
            $('#detalle-fecha').text(moment(pedido.fecha_pedido).format('DD/MM/YYYY HH:mm'));
            $('#detalle-fecha-entrega').text(pedido.fecha_entrega_estimada ? moment(pedido.fecha_entrega_estimada).format('DD/MM/YYYY') : 'No especificada');
            
            // Estado y prioridad con clases de badge
            const estadoBadge = $('#detalle-estado');
            estadoBadge.text(formatEstado(pedido.estado));
            
            switch (pedido.estado) {
                case 'pendiente':
                    estadoBadge.removeClass().addClass('badge bg-warning rounded-pill');
                    break;
                case 'en_proceso':
                    estadoBadge.removeClass().addClass('badge bg-info rounded-pill');
                    break;
                case 'completado':
                    estadoBadge.removeClass().addClass('badge bg-success rounded-pill');
                    break;
                case 'cancelado':
                    estadoBadge.removeClass().addClass('badge bg-danger rounded-pill');
                    break;
                default:
                    estadoBadge.removeClass().addClass('badge bg-secondary rounded-pill');
            }
            
            const prioridadBadge = $('#detalle-prioridad');
            prioridadBadge.text(formatPrioridad(pedido.prioridad));
            
            switch (pedido.prioridad) {
                case 'baja':
                    prioridadBadge.removeClass().addClass('badge bg-secondary rounded-pill');
                    break;
                case 'media':
                    prioridadBadge.removeClass().addClass('badge bg-primary rounded-pill');
                    break;
                case 'alta':
                    prioridadBadge.removeClass().addClass('badge bg-warning rounded-pill');
                    break;
                case 'urgente':
                    prioridadBadge.removeClass().addClass('badge bg-danger rounded-pill');
                    break;
                default:
                    prioridadBadge.removeClass().addClass('badge bg-secondary rounded-pill');
            }
            
            // Otra información
            $('#detalle-origen').text(formatOrigen(pedido.origen));
            $('#detalle-direccion').text(pedido.direccion_entrega || 'No especificada');
            $('#detalle-notas').text(pedido.notas || 'Sin notas');
            
            // Productos del pedido
            const tablaProductos = $('#tabla-detalle-productos tbody');
            tablaProductos.empty();
            
            if (pedido.detalles && pedido.detalles.length > 0) {
                pedido.detalles.forEach(detalle => {
                    tablaProductos.append(`
                        <tr>
                            <td>${detalle.codigo_producto || 'N/A'}</td>
                            <td>${detalle.nombre_producto}</td>
                            <td>${detalle.cantidad}</td>
                        </tr>
                    `);
                });
            } else {
                tablaProductos.append('<tr><td colspan="3" class="text-center">No hay productos en este pedido</td></tr>');
            }
            
            // Historial de seguimiento
            const historialContainer = $('#historial-seguimiento');
            historialContainer.empty();
            
            if (pedido.seguimientos && pedido.seguimientos.length > 0) {
                pedido.seguimientos.forEach(seguimiento => {
                    let iconoClase = 'fa-info-circle';
                    let fondoClase = 'bg-info';
                    
                    // Asignar icono según el estado nuevo
                    switch (seguimiento.estado_nuevo) {
                        case 'pendiente':
                            iconoClase = 'fa-clock';
                            fondoClase = 'bg-warning';
                            break;
                        case 'en_proceso':
                            iconoClase = 'fa-spinner';
                            fondoClase = 'bg-info';
                            break;
                        case 'completado':
                            iconoClase = 'fa-check-circle';
                            fondoClase = 'bg-success';
                            break;
                        case 'cancelado':
                            iconoClase = 'fa-times-circle';
                            fondoClase = 'bg-danger';
                            break;
                    }
                    
                    historialContainer.append(`
                        <div class="timeline-item">
                            <div class="timeline-badge ${fondoClase}">
                                <i class="fas ${iconoClase} text-white"></i>
                            </div>
                            <div class="timeline-panel">
                                <div class="timeline-heading">
                                    <h4>${formatEstado(seguimiento.estado_nuevo)}</h4>
                                </div>
                                <div class="timeline-body">
                                    <p>${seguimiento.comentario || 'Sin comentarios'}</p>
                                </div>
                                <div class="timeline-footer">
                                    <small>
                                        <i class="fas fa-user"></i> ${seguimiento.usuario ? `${seguimiento.usuario.nombre} ${seguimiento.usuario.apellido}` : 'Usuario desconocido'} | 
                                        <i class="fas fa-calendar"></i> ${moment(seguimiento.fecha).format('DD/MM/YYYY HH:mm')}
                                    </small>
                                </div>
                            </div>
                        </div>
                    `);
                });
            } else {
                historialContainer.append('<div class="text-center p-3">No hay historial de cambios</div>');
            }
            
            // Configurar selector de estado según el estado actual
            configurarSelectorEstado(pedido.estado);
            
            // Configurar botón de editar según estado
            const btnEditar = $('#btn-editar-pedido');
            if (pedido.estado === 'completado' || pedido.estado === 'cancelado') {
                btnEditar.hide();
            } else {
                btnEditar.show();
                btnEditar.off('click').on('click', function() {
                    $('#detallePedidoModal').modal('hide');
                    editarPedido(pedido.id);
                });
            }
            
            // Abrir modal
            $('#detallePedidoModal').modal('show');
        } else {
            showNotification('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al cargar detalles del pedido', 'error');
    });
}

/**
 * Configura las opciones disponibles en el selector de estado según el estado actual
 */
function configurarSelectorEstado(estadoActual) {
    const selectEstado = $('#estado-select');
    selectEstado.empty();
    
    // Agregar opciones según transiciones permitidas
    switch (estadoActual) {
        case 'pendiente':
            selectEstado.append('<option value="pendiente">Pendiente</option>');
            selectEstado.append('<option value="en_proceso">En Proceso</option>');
            selectEstado.append('<option value="cancelado">Cancelado</option>');
            $('#btn-cambiar-estado').prop('disabled', false);
            break;
        case 'en_proceso':
            selectEstado.append('<option value="en_proceso">En Proceso</option>');
            selectEstado.append('<option value="completado">Completado</option>');
            selectEstado.append('<option value="cancelado">Cancelado</option>');
            $('#btn-cambiar-estado').prop('disabled', false);
            break;
        case 'completado':
            selectEstado.append('<option value="completado">Completado</option>');
            $('#btn-cambiar-estado').prop('disabled', true);
            break;
        case 'cancelado':
            selectEstado.append('<option value="cancelado">Cancelado</option>');
            $('#btn-cambiar-estado').prop('disabled', true);
            break;
        default:
            selectEstado.append('<option value="pendiente">Pendiente</option>');
            selectEstado.append('<option value="en_proceso">En Proceso</option>');
            selectEstado.append('<option value="completado">Completado</option>');
            selectEstado.append('<option value="cancelado">Cancelado</option>');
            $('#btn-cambiar-estado').prop('disabled', false);
    }
    
    selectEstado.val(estadoActual);
}

/**
 * Cambia el estado de un pedido
 */
function cambiarEstadoPedido() {
    if (!pedidoActual) return;
    
    const nuevoEstado = $('#estado-select').val();
    
    // Validar que el estado sea diferente al actual
    if (nuevoEstado === pedidoActual.estado) {
        showNotification('El pedido ya está en ese estado', 'info');
        return;
    }
    
    // Configurar el modal de cambio de estado
    $('#nuevoEstadoTexto').text(formatEstado(nuevoEstado));
    $('#comentario-cambio-estado').val(''); // Limpiar el comentario anterior
    
    // Establecer colores e iconos según el estado
    const estadoModalHeader = $('#estado-modal-header');
    const estadoIconContainer = $('#estado-icon-container');
    const estadoDescripcion = $('#estado-descripcion');
    let icono = '';
    
    // Resetear clases
    estadoModalHeader.removeClass('pendiente en_proceso completado cancelado');
    estadoIconContainer.removeClass('pendiente en_proceso completado cancelado');
    
    // Aplicar clases según el nuevo estado
    estadoModalHeader.addClass(nuevoEstado);
    estadoIconContainer.addClass(nuevoEstado);
    
    // Configurar icono y descripción según estado
    switch (nuevoEstado) {
        case 'pendiente':
            icono = '<i class="fas fa-clock fa-2x"></i>';
            estadoDescripcion.text('El pedido quedará marcado como pendiente de procesar.');
            break;
        case 'en_proceso':
            icono = '<i class="fas fa-spinner fa-2x"></i>';
            estadoDescripcion.text('El pedido quedará marcado como en proceso. El proveedor está trabajando en él.');
            break;
        case 'completado':
            icono = '<i class="fas fa-check-circle fa-2x"></i>';
            estadoDescripcion.text('El pedido se marcará como completado y los productos se añadirán al inventario.');
            break;
        case 'cancelado':
            icono = '<i class="fas fa-times-circle fa-2x"></i>';
            estadoDescripcion.text('El pedido quedará cancelado y no se procesará más.');
            break;
        default:
            icono = '<i class="fas fa-info-circle fa-2x"></i>';
            estadoDescripcion.text('Este cambio quedará registrado en el historial del pedido.');
    }
    
    // Actualizar el icono
    estadoIconContainer.html(icono);
    
    // Configurar el botón de confirmar
    $('#btn-confirmar-cambio-estado').off('click').on('click', function() {
        const comentario = $('#comentario-cambio-estado').val() || `Cambio de estado: ${formatEstado(pedidoActual.estado)} a ${formatEstado(nuevoEstado)}`;
        
        // Ocultar modal
        $('#cambioEstadoModal').modal('hide');
        
        // Mostrar spinner en botón de cambiar estado
        const botonCambiar = $('#btn-cambiar-estado');
        const textoOriginal = botonCambiar.html();
        botonCambiar.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Actualizando...');
        botonCambiar.prop('disabled', true);
        
        fetch(`${URL_API_PEDIDOS}/${pedidoActual.id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                estado: nuevoEstado,
                comentario: comentario
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cambiar el estado del pedido');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Actualizar pedido actual con la respuesta
                pedidoActual = data.data;
                
                // Mostrar mensaje especial para pedidos completados (recepción de inventario)
                if (nuevoEstado === 'completado') {
                    showNotification('Pedido completado. Los productos han sido añadidos al inventario.', 'success');
                } else {
                    showNotification('Estado del pedido actualizado exitosamente', 'success');
                }
                
                // Notificar por sistema de notificaciones
                notificarCambioEstado(pedidoActual, nuevoEstado);
                
                // Recargar la interfaz
                verDetallePedido(pedidoActual.id);
                
                // Recargar lista de pedidos
                cargarPedidos();
            } else {
                showNotification('Error: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error al cambiar el estado del pedido:', error);
            showNotification('Error al cambiar el estado del pedido', 'error');
        })
        .finally(() => {
            // Restaurar botón
            botonCambiar.html(textoOriginal);
            botonCambiar.prop('disabled', false);
        });
    });
    
    // Mostrar el modal
    $('#cambioEstadoModal').modal('show');
}

/**
 * Notifica el cambio de estado usando el sistema de notificaciones
 */
function notificarCambioEstado(pedido, nuevoEstado) {
    // Esta función se integrará con el sistema de notificaciones
    // No hace nada si el sistema de notificaciones no está disponible
    if (window.socket && pedido) {
        console.log('Enviando notificación de cambio de estado al servidor');
        // El servidor procesará esto y enviará la notificación a los usuarios interesados
        window.socket.emit('cambio-estado-pedido', {
            pedidoId: pedido.id,
            codigo: pedido.codigo,
            proveedorId: pedido.proveedor_id,
            estadoAnterior: pedido.estado,
            nuevoEstado: nuevoEstado
        });
    }
}

/**
 * Abre el modal para editar un pedido existente
 */
function editarPedido(pedidoId) {
    fetch(`${URL_API_PEDIDOS}/${pedidoId}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar el pedido para edición');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            modoEdicion = true;
            pedidoActual = data.data;
            
            // Configurar el modal
            $('#pedidoModalLabel').text('Editar Pedido ' + pedidoActual.codigo);
            
            // Llenar el formulario con los datos del pedido
            $('#pedido-id').val(pedidoActual.id);
            $('#proveedor-select').val(pedidoActual.proveedor_id);
            $('#fecha-entrega').val(pedidoActual.fecha_entrega_estimada ? moment(pedidoActual.fecha_entrega_estimada).format('YYYY-MM-DD') : '');
            $('#prioridad-select').val(pedidoActual.prioridad);
            $('#origen-select').val(pedidoActual.origen);
            $('#direccion-entrega').val(pedidoActual.direccion_entrega || '');
            $('#notas-pedido').val(pedidoActual.notas || '');
            $('#persona-contacto').val(pedidoActual.persona_contacto || '');
            $('#condiciones-pago').val(pedidoActual.condiciones_pago || '');
            $('#metodo-envio').val(pedidoActual.metodo_envio || '');
            $('#notas-adicionales').val(pedidoActual.notas_adicionales || '');
            
            // Cargar productos del pedido
            productosPedidoActual = [];
            
            if (pedidoActual.detalles && pedidoActual.detalles.length > 0) {
                pedidoActual.detalles.forEach(detalle => {
                    productosPedidoActual.push({
                        id: detalle.producto_id,
                        nombre: detalle.nombre_producto,
                        precio: detalle.precio_unitario,
                        cantidad: detalle.cantidad,
                        subtotal: detalle.subtotal
                    });
                });
            }
            
            // Actualizar tabla de productos
            actualizarTablaPedido();
            
            // Abrir el modal
            $('#pedidoModal').modal('show');
        } else {
            showNotification('Error: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error al cargar el pedido para edición:', error);
        showNotification('Error al cargar el pedido para edición', 'error');
    });
}

// Funciones de utilidad

/**
 * Formatea un valor monetario
 */
function formatMoney(value) {
    return '$' + parseFloat(value || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * Formatea el texto del estado para mostrar
 */
function formatEstado(estado) {
    switch (estado) {
        case 'pendiente': return 'Pendiente';
        case 'en_proceso': return 'En Proceso';
        case 'completado': return 'Completado';
        case 'cancelado': return 'Cancelado';
        default: return estado;
    }
}

/**
 * Formatea el texto de la prioridad para mostrar
 */
function formatPrioridad(prioridad) {
    switch (prioridad) {
        case 'baja': return 'Baja';
        case 'media': return 'Media';
        case 'alta': return 'Alta';
        case 'urgente': return 'Urgente';
        default: return prioridad;
    }
}

/**
 * Formatea el texto del origen para mostrar
 */
function formatOrigen(origen) {
    switch (origen) {
        case 'tienda': return 'Tienda';
        case 'telefono': return 'Teléfono';
        case 'web': return 'Web';
        case 'app': return 'App';
        case 'otro': return 'Otro';
        default: return origen;
    }
}

/**
 * Inicializa la información del usuario en la interfaz
 */
function initUserInfo() {
    const user = getCurrentUser();
    if (user) {
        $('#username').text(user.nombre);
    }
}

/**
 * Envía una notificación por WhatsApp al proveedor del pedido
 */
function enviarNotificacionWhatsApp(pedidoId) {
    console.log('Iniciando envío de notificación WhatsApp para pedido:', pedidoId);
    
    // Verificar si WhatsApp está conectado
    if (!window.WhatsAppStatus || !window.WhatsAppStatus.isConnected()) {
        showNotification('WhatsApp no está conectado. Por favor, conecte WhatsApp primero', 'warning');
        return;
    }
    
    // Mostrar modal de carga
    $('#loadingModal').modal('show');
    
    // Obtener detalles del pedido
    fetch(`${URL_API_PEDIDOS}/${pedidoId}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar detalles del pedido');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const pedido = data.data;
            console.log('Datos del pedido obtenidos:', pedido.codigo);
            
            // Obtener el proveedor
            const proveedor = proveedoresDisponibles.find(p => p.id === pedido.proveedor_id);
            
            if (!proveedor || !proveedor.telefono) {
                throw new Error('El proveedor no tiene número de teléfono registrado');
            }
            
            // Formatear número de teléfono (eliminar espacios y caracteres no numéricos)
            let telefono = proveedor.telefono.replace(/\D/g, '');
            console.log('Número de teléfono original:', proveedor.telefono);
            console.log('Número de teléfono limpio:', telefono);
            
            // Asegurarse de que el número comienza con el formato correcto (con +)
            if (telefono.startsWith('57')) {
                telefono = '+' + telefono;
            } else if (!telefono.startsWith('+')) {
                telefono = '+57' + telefono;
            }
            
            console.log('Número de teléfono formateado para WhatsApp:', telefono);
            
            // Formatear productos para el mensaje
            let listaProductos = '';
            if (pedido.detalles && pedido.detalles.length > 0) {
                pedido.detalles.forEach((detalle, index) => {
                    listaProductos += `${index + 1}. ${detalle.nombre_producto} (${detalle.cantidad} unidades)\n`;
                });
            } else {
                listaProductos = 'No hay productos detallados en este pedido.\n';
            }
            
            // Preparar los campos adicionales solicitados
            const fechaEntrega = pedido.fecha_entrega_estimada ? 
                `*Fecha Entrega Esperada:* ${moment(pedido.fecha_entrega_estimada).format('DD/MM/YYYY')}\n` : '';
                
            const prioridad = `*Prioridad:* ${formatPrioridad(pedido.prioridad)}\n`;
            
            const direccionEntrega = pedido.direccion_entrega ? 
                `*Dirección de Entrega:* ${pedido.direccion_entrega}\n` : '';
                
            const personaContacto = pedido.persona_contacto ? 
                `*Persona de Contacto:* ${pedido.persona_contacto}\n` : '';
                
            const metodoEnvio = pedido.metodo_envio ? 
                `*Método de Envío:* ${pedido.metodo_envio}\n` : '';
                
            const notasAdicionales = pedido.notas_adicionales ? 
                `*Notas Adicionales:* ${pedido.notas_adicionales}\n` : '';
            
            // Añadir logs para depuración
            console.log('Campos para mensaje WhatsApp:');
            console.log('- persona_contacto:', pedido.persona_contacto);
            console.log('- formatted personaContacto:', personaContacto);
            
            // Crear mensaje con información más completa e incluir opciones para el proveedor
            const mensaje = `🏪 *UNIKA - Nuevo Pedido*\n\n` +
                `Hola ${proveedor.nombre},\n\n` +
                `Le informamos que se ha generado un nuevo pedido:\n\n` +
                `*Código:* ${pedido.codigo}\n` +
                `*Estado:* ${formatEstado(pedido.estado)}\n` +
                prioridad +
                fechaEntrega +
                direccionEntrega +
                personaContacto +
                metodoEnvio +
                (pedido.notas ? `*Notas:* ${pedido.notas}\n` : '') +
                notasAdicionales + 
                `\n*Productos solicitados:*\n${listaProductos}\n` +
                (pedido.condiciones_pago ? `*Condiciones de Pago:* ${pedido.condiciones_pago}\n\n` : '\n') +
                `Por favor responda con una de las siguientes opciones:\n` +
                `1️⃣ Confirmar recepción del pedido\n` +
                `2️⃣ Solicitar más detalles\n` +
                `3️⃣ Reportar un problema con el pedido\n\n` +
                `Este mensaje se generó automáticamente por el sistema de gestión de La UNIKA.`;
            
            console.log('Enviando mensaje WhatsApp, longitud:', mensaje.length);
            
            // Enviar mensaje por WhatsApp
            return fetch(URL_API_WHATSAPP + '/enviar-mensaje', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    telefono: telefono,
                    mensaje: mensaje
                })
            });
        } else {
            throw new Error(data.message || 'Error al obtener detalles del pedido');
        }
    })
    .then(response => {
        console.log('Respuesta del servidor WhatsApp:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Error en respuesta WhatsApp:', text);
                throw new Error(`Error al enviar mensaje por WhatsApp: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        $('#loadingModal').modal('hide');
        console.log('Resultado de envío WhatsApp:', data);
        
        if (data.success) {
            // Mostrar mensaje de éxito
            showNotification('Mensaje enviado por WhatsApp exitosamente', 'success');
            
            // Registrar la notificación en el historial del pedido
            registrarNotificacionWhatsApp(pedidoId);
        } else {
            showNotification('Error al enviar mensaje: ' + (data.message || 'Error desconocido'), 'error');
        }
    })
    .catch(error => {
        $('#loadingModal').modal('hide');
        console.error('Error en el proceso de envío de WhatsApp:', error);
        showNotification('Error: ' + error.message, 'error');
    });
}

/**
 * Registra la notificación de WhatsApp en el historial del pedido
 */
function registrarNotificacionWhatsApp(pedidoId) {
    fetch(`${URL_API_PEDIDOS}/${pedidoId}/seguimiento`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            comentario: 'Notificación enviada por WhatsApp al proveedor',
            tipo: 'whatsapp'
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al registrar notificación');
        }
        return response.json();
    })
    .then(data => {
        if (!data.success) {
            console.error('Error al registrar notificación de WhatsApp:', data.message);
        }
    })
    .catch(error => {
        console.error('Error al registrar notificación de WhatsApp:', error);
    });
}

// Cargar pedidos cuando la página esté lista
$(document).ready(function() {
    cargarPedidos();
});