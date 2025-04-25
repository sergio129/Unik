/**
 * Módulo de Movimientos de Inventario
 * Permite registrar y consultar entradas, salidas y ajustes de inventario.
 */

// Variables globales
let movimientos = [];
let productos = [];
let currentPage = 1;
const itemsPerPage = 10; // Número de movimientos por página
let totalMovimientos = 0;
let filtrosActivos = {
  tipo: '',
  producto_id: '',
  fecha_inicio: '',
  fecha_fin: ''
};
let timeoutBusqueda; // Para búsqueda con delay
let barcodeBuffer = ''; // Buffer para el escáner de códigos de barras
let lastKeyTime = 0; // Tiempo de la última tecla presionada
let sugerenciasActivas = false; // Control de sugerencias
let indiceSeleccionado = -1; // Índice de elemento seleccionado en sugerencias
let productoSeleccionado = null; // Variable para almacenar el producto actualmente seleccionado

// Elementos DOM
const totalEntradasElement = document.getElementById('total-entradas');
const totalSalidasElement = document.getElementById('total-salidas');
const totalAjustesElement = document.getElementById('total-ajustes');
const totalMovimientosElement = document.getElementById('total-movimientos');
const btnNewMovimiento = document.getElementById('btn-new-movimiento');
const btnExport = document.getElementById('btn-export');
const btnFilter = document.getElementById('btn-filter');
const btnResetFilters = document.getElementById('btn-reset-filters');
const filterTipo = document.getElementById('filter-tipo');
const filterProducto = document.getElementById('filter-producto');
const filterFechaDesde = document.getElementById('filter-fecha-desde');
const filterFechaHasta = document.getElementById('filter-fecha-hasta');
const movimientosList = document.getElementById('movimientos-list');
const paginationFrom = document.getElementById('pagination-from');
const paginationTo = document.getElementById('pagination-to');
const paginationTotal = document.getElementById('pagination-total');
const paginationCurrent = document.getElementById('pagination-current');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');

// Elementos del modal
const movimientoModal = document.getElementById('movimiento-modal');
const modalOverlay = document.querySelector('.modal-overlay');
const closeModalBtns = document.querySelectorAll('.close-modal');
const btnCancel = document.getElementById('btn-cancel');
const movimientoForm = document.getElementById('movimiento-form');
const tipoMovimiento = document.getElementById('tipo_movimiento');
const productoId = document.getElementById('producto_id');
const cantidad = document.getElementById('cantidad');
const stockActual = document.getElementById('stock-actual');
const stockResultante = document.getElementById('stock-resultante');
const motivo = document.getElementById('motivo');
const documentoReferencia = document.getElementById('documento_referencia');
const observaciones = document.getElementById('observaciones');

// Elementos del modal de detalles
const detalleModal = document.getElementById('detalle-modal');
const btnCloseDetalle = document.getElementById('btn-close-detalle');
const detalleTipo = document.getElementById('detalle-tipo');
const detalleFecha = document.getElementById('detalle-fecha');
const detalleId = document.getElementById('detalle-id');
const detalleProducto = document.getElementById('detalle-producto');
const detalleCantidad = document.getElementById('detalle-cantidad');
const detalleMotivo = document.getElementById('detalle-motivo');
const detalleDocumento = document.getElementById('detalle-documento');
const detalleUsuario = document.getElementById('detalle-usuario');
const detalleObservaciones = document.getElementById('detalle-observaciones');
const detalleStockAnterior = document.getElementById('detalle-stock-anterior');
const detalleStockResultante = document.getElementById('detalle-stock-resultante');

// Elementos para búsqueda y selección de productos
const busquedaProducto = document.getElementById('busqueda_producto');
const sugerenciasProductos = document.getElementById('sugerencias-productos');
const productoSearchContainer = document.getElementById('producto-search-container');
const productoNombre = document.getElementById('producto-nombre');
const productoCodigo = document.getElementById('producto-codigo');
const productoIdInput = document.getElementById('producto_id');
const btnCambiarProducto = document.getElementById('btn-cambiar-producto');

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token || !user) {
    window.location.href = '/login';
    return;
  }
  
  // Mostrar información del usuario
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.textContent = user.username || user.nombre_completo || 'Usuario';
  }
  
  // Configurar botón de cerrar sesión
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }
  
  // Inicializar eventos
  inicializarEventos();
  
  // Cargar datos iniciales
  cargarProductos();
  cargarMovimientos();
  cargarResumen();
});

// Función para inicializar eventos
function inicializarEventos() {
  // Botones principales
  btnNewMovimiento.addEventListener('click', mostrarModalMovimiento);
  btnExport.addEventListener('click', exportarReporte);
  btnFilter.addEventListener('click', aplicarFiltros);
  btnResetFilters.addEventListener('click', resetearFiltros);
  
  // Paginación
  btnPrevPage.addEventListener('click', () => cambiarPagina(currentPage - 1));
  btnNextPage.addEventListener('click', () => cambiarPagina(currentPage + 1));
  
  // Modal de movimiento
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', cerrarModal);
  });
  
  btnCancel.addEventListener('click', cerrarModal);
  modalOverlay.addEventListener('click', cerrarModal);
  
  // Formulario de movimiento
  movimientoForm.addEventListener('submit', guardarMovimiento);
  
  // Actualizar stock resultante al cambiar tipo, producto o cantidad
  tipoMovimiento.addEventListener('change', actualizarStockResultante);
  productoId.addEventListener('change', () => {
    actualizarStockActual();
    actualizarStockResultante();
  });
  cantidad.addEventListener('input', actualizarStockResultante);
  
  // Modal de detalles
  btnCloseDetalle.addEventListener('click', cerrarModalDetalle);

  // Búsqueda de productos
  busquedaProducto.addEventListener('input', buscarProductos);
  busquedaProducto.addEventListener('keydown', manejarTeclasSugerencias);
  document.addEventListener('keypress', manejarEscanerCodigoBarras);
}

// Función para cargar todos los productos
async function cargarProductos() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/productos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar productos');
    }
    
    const data = await response.json();
    productos = data.data || [];
    
    // Llenar selectores de productos
    llenarSelectProductos(filterProducto, true);
    llenarSelectProductos(productoId, false);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('No se pudieron cargar los productos');
  }
}

// Función para llenar los selectores de productos
function llenarSelectProductos(selectElement, incluirTodos) {
  // Limpiar opciones existentes
  selectElement.innerHTML = '';
  
  // Opción para "Todos los productos" o "Selecciona un producto"
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = incluirTodos ? 'Todos los productos' : 'Selecciona un producto';
  selectElement.appendChild(defaultOption);
  
  // Ordenar productos por nombre
  const productosOrdenados = [...productos].sort((a, b) => 
    a.nombre.localeCompare(b.nombre)
  );
  
  // Añadir opciones de productos
  productosOrdenados.forEach(producto => {
    const option = document.createElement('option');
    option.value = producto.codigo;
    option.textContent = `${producto.codigo} - ${producto.nombre}`;
    
    // Si tiene poco stock, mostrar indicador
    if (producto.cantidad <= producto.stock_minimo) {
      option.classList.add('stock-bajo');
      option.textContent += ` (${producto.cantidad} uds.)`;
    }
    
    selectElement.appendChild(option);
  });
}

// Función para cargar movimientos con filtros
async function cargarMovimientos() {
  try {
    const token = localStorage.getItem('token');
    
    // Construir URL con filtros
    let url = '/api/movimientos?';
    
    if (filtrosActivos.tipo) {
      url += `&tipo_movimiento=${encodeURIComponent(filtrosActivos.tipo)}`;
    }
    
    if (filtrosActivos.producto_id) {
      url += `&producto_id=${encodeURIComponent(filtrosActivos.producto_id)}`;
    }
    
    if (filtrosActivos.fecha_inicio) {
      url += `&fecha_inicio=${encodeURIComponent(filtrosActivos.fecha_inicio)}`;
    }
    
    if (filtrosActivos.fecha_fin) {
      url += `&fecha_fin=${encodeURIComponent(filtrosActivos.fecha_fin)}`;
    }
    
    // Mostrar indicador de carga
    movimientosList.innerHTML = '<tr><td colspan="8" class="text-center">Cargando movimientos...</td></tr>';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar movimientos');
    }
    
    const data = await response.json();
    movimientos = data.data || [];
    totalMovimientos = movimientos.length;
    
    // Actualizar paginación
    actualizarPaginacion();
    
    // Mostrar movimientos de la página actual
    mostrarMovimientosPaginados();
    
  } catch (error) {
    console.error('Error:', error);
    movimientosList.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar movimientos</td></tr>';
    mostrarError('No se pudieron cargar los movimientos');
  }
}

// Función para cargar el resumen de movimientos
async function cargarResumen() {
  try {
    const token = localStorage.getItem('token');
    
    // Construir URL con filtros de fecha si existen
    let url = '/api/movimientos/resumen?';
    
    if (filtrosActivos.fecha_inicio) {
      url += `&fecha_inicio=${encodeURIComponent(filtrosActivos.fecha_inicio)}`;
    }
    
    if (filtrosActivos.fecha_fin) {
      url += `&fecha_fin=${encodeURIComponent(filtrosActivos.fecha_fin)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar resumen');
    }
    
    const data = await response.json();
    
    // Actualizar contadores
    if (data.data && data.data.resumen_por_tipo) {
      let totalEntradas = 0;
      let totalSalidas = 0;
      let totalAjustes = 0;
      
      data.data.resumen_por_tipo.forEach(item => {
        if (item.tipo_movimiento === 'entrada') {
          totalEntradas = parseInt(item.total_movimientos) || 0;
        } else if (item.tipo_movimiento === 'salida') {
          totalSalidas = parseInt(item.total_movimientos) || 0;
        } else if (item.tipo_movimiento === 'ajuste') {
          totalAjustes = parseInt(item.total_movimientos) || 0;
        }
      });
      
      totalEntradasElement.textContent = totalEntradas;
      totalSalidasElement.textContent = totalSalidas;
      totalAjustesElement.textContent = totalAjustes;
      totalMovimientosElement.textContent = totalEntradas + totalSalidas + totalAjustes;
    }
    
  } catch (error) {
    console.error('Error:', error);
    // No mostrar error al usuario para no interrumpir la experiencia principal
  }
}

// Función para mostrar movimientos paginados
function mostrarMovimientosPaginados() {
  // Calcular índices de inicio y fin para la página actual
  const startIndex = (currentPage - 1) * itemsPerPage;
  let endIndex = startIndex + itemsPerPage;
  if (endIndex > movimientos.length) {
    endIndex = movimientos.length;
  }
  
  // Si no hay movimientos
  if (movimientos.length === 0) {
    movimientosList.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron movimientos</td></tr>';
    return;
  }
  
  // Preparar HTML para los movimientos
  let html = '';
  
  // Mostrar los movimientos de la página actual
  for (let i = startIndex; i < endIndex; i++) {
    const movimiento = movimientos[i];
    
    // Obtener clase y texto según el tipo de movimiento
    let tipoClass = '';
    let tipoIcon = '';
    
    if (movimiento.tipo_movimiento === 'entrada') {
      tipoClass = 'badge-success';
      tipoIcon = 'arrow-circle-down';
    } else if (movimiento.tipo_movimiento === 'salida') {
      tipoClass = 'badge-danger';
      tipoIcon = 'arrow-circle-up';
    } else if (movimiento.tipo_movimiento === 'ajuste') {
      tipoClass = 'badge-warning';
      tipoIcon = 'balance-scale';
    }
    
    // Formatear fecha
    const fecha = new Date(movimiento.fecha_creacion);
    const fechaFormateada = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString().substr(0, 5);
    
    // Generar HTML para la fila
    html += `
      <tr>
        <td>${movimiento.id}</td>
        <td>${fechaFormateada}</td>
        <td>
          <span class="badge ${tipoClass}">
            <i class="fas fa-${tipoIcon} me-1"></i> 
            ${capitalizar(movimiento.tipo_movimiento)}
          </span>
        </td>
        <td>${movimiento.producto ? movimiento.producto.nombre : 'Producto desconocido'}</td>
        <td class="text-end">${Math.abs(movimiento.cantidad)}</td>
        <td>${movimiento.motivo || '-'}</td>
        <td>${movimiento.usuario ? (movimiento.usuario.nombre_completo || movimiento.usuario.username) : 'Usuario desconocido'}</td>
        <td class="text-center">
          <button class="btn-icon btn-ver-detalle" data-id="${movimiento.id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }
  
  // Actualizar la tabla
  movimientosList.innerHTML = html;
  
  // Agregar event listeners a los botones de detalle
  document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      verDetalleMovimiento(id);
    });
  });
}

// Función para actualizar la paginación
function actualizarPaginacion() {
  const totalPages = Math.ceil(totalMovimientos / itemsPerPage) || 1;
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(startItem + itemsPerPage - 1, totalMovimientos);
  
  // Actualizar información de paginación
  paginationFrom.textContent = totalMovimientos > 0 ? startItem : 0;
  paginationTo.textContent = endItem;
  paginationTotal.textContent = totalMovimientos;
  paginationCurrent.textContent = `Página ${currentPage} de ${totalPages}`;
  
  // Habilitar/deshabilitar botones de paginación
  btnPrevPage.disabled = currentPage <= 1;
  btnNextPage.disabled = currentPage >= totalPages;
}

// Función para cambiar de página
function cambiarPagina(newPage) {
  const totalPages = Math.ceil(totalMovimientos / itemsPerPage) || 1;
  
  // Validar que la página sea válida
  if (newPage < 1 || newPage > totalPages) {
    return;
  }
  
  currentPage = newPage;
  actualizarPaginacion();
  mostrarMovimientosPaginados();
  
  // Hacer scroll al inicio de la tabla
  document.querySelector('.table-container').scrollTop = 0;
}

// Función para aplicar filtros
function aplicarFiltros() {
  // Recopilar filtros
  filtrosActivos = {
    tipo: filterTipo.value,
    producto_id: filterProducto.value,
    fecha_inicio: filterFechaDesde.value,
    fecha_fin: filterFechaHasta.value
  };
  
  // Resetear a la primera página
  currentPage = 1;
  
  // Recargar datos con los filtros
  cargarMovimientos();
  cargarResumen();
}

// Función para resetear filtros
function resetearFiltros() {
  // Limpiar selectores y campos de fecha
  filterTipo.value = '';
  filterProducto.value = '';
  filterFechaDesde.value = '';
  filterFechaHasta.value = '';
  
  // Limpiar filtros activos
  filtrosActivos = {
    tipo: '',
    producto_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  };
  
  // Resetear a la primera página
  currentPage = 1;
  
  // Recargar datos sin filtros
  cargarMovimientos();
  cargarResumen();
}

// Función para mostrar el modal de nuevo movimiento
function mostrarModalMovimiento() {
  // Resetear formulario
  movimientoForm.reset();
  
  // Establecer valores por defecto
  tipoMovimiento.value = 'entrada';
  cantidad.value = 1;
  
  // Actualizar stock actual y resultante
  actualizarStockActual();
  actualizarStockResultante();
  
  // Mostrar modal
  movimientoModal.style.display = 'block';
  modalOverlay.style.display = 'block';
  
  // Enfocar el selector de tipo
  tipoMovimiento.focus();
}

// Función para cerrar el modal
function cerrarModal() {
  movimientoModal.style.display = 'none';
  modalOverlay.style.display = 'none';
}

// Función para cerrar el modal de detalles
function cerrarModalDetalle() {
  detalleModal.style.display = 'none';
  modalOverlay.style.display = 'none';
}

// Función para actualizar el stock actual al seleccionar un producto
function actualizarStockActual() {
  const selectedProductId = productoId.value;
  
  if (!selectedProductId) {
    stockActual.textContent = '0';
    return;
  }
  
  const producto = productos.find(p => p.codigo === selectedProductId);
  
  if (producto) {
    stockActual.textContent = producto.cantidad;
  } else {
    stockActual.textContent = '0';
  }
}

// Función para actualizar el stock resultante
function actualizarStockResultante() {
  const selectedProductId = productoId.value;
  
  if (!selectedProductId) {
    stockResultante.textContent = '0';
    return;
  }
  
  const producto = productos.find(p => p.codigo === selectedProductId);
  
  if (!producto) {
    stockResultante.textContent = '0';
    return;
  }
  
  const stockActualValue = parseInt(producto.cantidad) || 0;
  const cantidadValue = parseInt(cantidad.value) || 0;
  const tipo = tipoMovimiento.value;
  
  let stockResultanteValue = stockActualValue;
  
  if (tipo === 'entrada') {
    stockResultanteValue = stockActualValue + cantidadValue;
  } else if (tipo === 'salida') {
    stockResultanteValue = stockActualValue - cantidadValue;
  } else if (tipo === 'ajuste') {
    stockResultanteValue = cantidadValue; // En ajustes, la cantidad es el stock final
  }
  
  // Validar que el stock no sea negativo
  if (stockResultanteValue < 0) {
    cantidad.classList.add('error');
    stockResultante.classList.add('text-danger');
  } else {
    cantidad.classList.remove('error');
    stockResultante.classList.remove('text-danger');
  }
  
  stockResultante.textContent = stockResultanteValue;
}

// Función para guardar un nuevo movimiento
async function guardarMovimiento(event) {
  event.preventDefault();
  
  // Validar campos obligatorios
  if (!productoId.value) {
    mostrarError('Debe seleccionar un producto');
    return;
  }
  
  const cantidadValue = parseInt(cantidad.value) || 0;
  if (cantidadValue <= 0) {
    mostrarError('La cantidad debe ser mayor a cero');
    return;
  }
  
  // Validar que el stock resultante no sea negativo para salidas
  if (tipoMovimiento.value === 'salida') {
    const producto = productos.find(p => p.codigo === productoId.value);
    if (producto && cantidadValue > producto.cantidad) {
      mostrarError('No hay suficiente stock para realizar esta salida');
      return;
    }
  }
  
  // Validar que el motivo no esté vacío
  if (!motivo.value.trim()) {
    mostrarError('Debe indicar un motivo para el movimiento');
    return;
  }
  
  // Preparar datos para enviar
  const movimientoData = {
    producto_id: productoId.value,
    tipo_movimiento: tipoMovimiento.value,
    cantidad: cantidadValue,
    motivo: motivo.value.trim(),
    documento_referencia: documentoReferencia.value.trim(),
    observaciones: observaciones.value.trim()
  };
  
  try {
    const token = localStorage.getItem('token');
    
    // Mostrar indicador de carga en el botón
    const submitBtn = movimientoForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    
    const response = await fetch('/api/movimientos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(movimientoData)
    });
    
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al guardar el movimiento');
    }
    
    const data = await response.json();
    
    // Cerrar modal
    cerrarModal();
    
    // Mostrar mensaje de éxito
    mostrarExito('Movimiento registrado correctamente');
    
    // Actualizar la información del producto en la caché local
    const producto = productos.find(p => p.codigo === productoId.value);
    if (producto) {
      if (tipoMovimiento.value === 'entrada') {
        producto.cantidad += cantidadValue;
      } else if (tipoMovimiento.value === 'salida') {
        producto.cantidad -= cantidadValue;
      } else if (tipoMovimiento.value === 'ajuste') {
        producto.cantidad = cantidadValue;
      }
    }
    
    // Recargar datos
    cargarMovimientos();
    cargarResumen();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message || 'Error al registrar el movimiento');
  }
}

// Función para ver detalles de un movimiento
async function verDetalleMovimiento(id) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/movimientos/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar detalles del movimiento');
    }
    
    const data = await response.json();
    const movimiento = data.data;
    
    if (!movimiento) {
      throw new Error('Movimiento no encontrado');
    }
    
    // Llenar el modal con los datos del movimiento
    detalleId.textContent = movimiento.id;
    
    // Formatear fecha
    const fecha = new Date(movimiento.fecha_creacion);
    detalleFecha.textContent = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString();
    
    // Configurar clase y texto según tipo de movimiento
    detalleTipo.textContent = capitalizar(movimiento.tipo_movimiento);
    detalleTipo.className = 'detalle-badge';
    
    if (movimiento.tipo_movimiento === 'entrada') {
      detalleTipo.classList.add('badge-success');
    } else if (movimiento.tipo_movimiento === 'salida') {
      detalleTipo.classList.add('badge-danger');
    } else if (movimiento.tipo_movimiento === 'ajuste') {
      detalleTipo.classList.add('badge-warning');
    }
    
    detalleProducto.textContent = movimiento.producto ? `${movimiento.producto.codigo} - ${movimiento.producto.nombre}` : 'Producto desconocido';
    detalleCantidad.textContent = Math.abs(movimiento.cantidad);
    detalleMotivo.textContent = movimiento.motivo || '-';
    detalleDocumento.textContent = movimiento.documento_referencia || '-';
    detalleUsuario.textContent = movimiento.usuario ? (movimiento.usuario.nombre_completo || movimiento.usuario.username) : 'Usuario desconocido';
    detalleObservaciones.textContent = movimiento.observaciones || '-';
    detalleStockAnterior.textContent = movimiento.stock_anterior;
    detalleStockResultante.textContent = movimiento.stock_nuevo;
    
    // Mostrar modal
    detalleModal.style.display = 'block';
    modalOverlay.style.display = 'block';
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('No se pudieron cargar los detalles del movimiento');
  }
}

// Función para exportar reporte
function exportarReporte() {
  // Construir URL con filtros actuales
  let url = '/api/movimientos?export=true';
  
  if (filtrosActivos.tipo) {
    url += `&tipo_movimiento=${encodeURIComponent(filtrosActivos.tipo)}`;
  }
  
  if (filtrosActivos.producto_id) {
    url += `&producto_id=${encodeURIComponent(filtrosActivos.producto_id)}`;
  }
  
  if (filtrosActivos.fecha_inicio) {
    url += `&fecha_inicio=${encodeURIComponent(filtrosActivos.fecha_inicio)}`;
  }
  
  if (filtrosActivos.fecha_fin) {
    url += `&fecha_fin=${encodeURIComponent(filtrosActivos.fecha_fin)}`;
  }
  
  // Convertir datos a CSV para exportar
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'ID,Fecha,Tipo,Producto,Cantidad,Stock Anterior,Stock Nuevo,Motivo,Documento,Usuario\n';
  
  movimientos.forEach(movimiento => {
    const fecha = new Date(movimiento.fecha_creacion);
    const fechaFormateada = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString().substr(0, 5);
    
    const fila = [
      movimiento.id,
      fechaFormateada,
      movimiento.tipo_movimiento,
      movimiento.producto ? `"${movimiento.producto.nombre}"` : 'Producto desconocido',
      Math.abs(movimiento.cantidad),
      movimiento.stock_anterior,
      movimiento.stock_nuevo,
      `"${movimiento.motivo || '-'}"`,
      `"${movimiento.documento_referencia || '-'}"`,
      movimiento.usuario ? `"${movimiento.usuario.nombre_completo || movimiento.usuario.username}"` : 'Usuario desconocido'
    ];
    
    csvContent += fila.join(',') + '\n';
  });
  
  // Crear elemento temporal para descargar
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  
  // Generar nombre para el archivo con fecha actual
  const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
  link.setAttribute('download', `movimientos_inventario_${fechaHoy}.csv`);
  
  // Simular clic para descargar
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarExito('Reporte exportado correctamente');
}

// Función para buscar productos
function buscarProductos() {
  const query = busquedaProducto.value.trim().toLowerCase();
  
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda);
  }
  
  timeoutBusqueda = setTimeout(() => {
    if (!query) {
      sugerenciasProductos.innerHTML = '';
      sugerenciasActivas = false;
      return;
    }
    
    const resultados = productos.filter(producto => 
      producto.nombre.toLowerCase().includes(query) || 
      producto.codigo.toLowerCase().includes(query)
    );
    
    mostrarSugerencias(resultados);
  }, 300);
}

// Función para mostrar sugerencias de productos
function mostrarSugerencias(resultados) {
  sugerenciasProductos.innerHTML = '';
  sugerenciasActivas = true;
  indiceSeleccionado = -1;
  
  if (resultados.length === 0) {
    sugerenciasProductos.innerHTML = '<li class="sugerencia-item">No se encontraron resultados</li>';
    return;
  }
  
  resultados.forEach(producto => {
    const item = document.createElement('li');
    item.className = 'sugerencia-item';
    item.textContent = `${producto.codigo} - ${producto.nombre}`;
    item.dataset.codigo = producto.codigo;
    item.addEventListener('click', () => seleccionarProducto(producto.codigo));
    sugerenciasProductos.appendChild(item);
  });
}

// Función para manejar teclas en el campo de búsqueda
function manejarTeclasSugerencias(event) {
  if (!sugerenciasActivas) return;
  
  const items = sugerenciasProductos.querySelectorAll('.sugerencia-item');
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    indiceSeleccionado = (indiceSeleccionado + 1) % items.length;
    resaltarItemSeleccionado(items);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    indiceSeleccionado = (indiceSeleccionado - 1 + items.length) % items.length;
    resaltarItemSeleccionado(items);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (indiceSeleccionado >= 0 && items[indiceSeleccionado]) {
      seleccionarProducto(items[indiceSeleccionado].dataset.codigo);
    }
  }
}

// Función para resaltar el item seleccionado
function resaltarItemSeleccionado(items) {
  items.forEach((item, index) => {
    item.classList.toggle('seleccionado', index === indiceSeleccionado);
  });
}

// Función para seleccionar un producto
function seleccionarProducto(codigo) {
  const producto = productos.find(p => p.codigo === codigo);
  if (producto) {
    // Actualizar el campo de texto visible
    productoNombre.textContent = producto.nombre;
    productoCodigo.textContent = producto.codigo;
    
    // Asignar el código al campo oculto
    productoIdInput.value = producto.codigo;
    productoSeleccionado = producto;
    
    // Limpiar el campo de búsqueda y cerrar las sugerencias
    busquedaProducto.value = '';
    sugerenciasProductos.innerHTML = '';
    sugerenciasActivas = false;
    
    // Actualizar información de stock
    actualizarStockActual();
    actualizarStockResultante();
  }
}

// Función para manejar el escáner de código de barras
function manejarEscanerCodigoBarras(event) {
  const currentTime = new Date().getTime();
  
  if (currentTime - lastKeyTime > 100) {
    barcodeBuffer = '';
  }
  
  barcodeBuffer += event.key;
  lastKeyTime = currentTime;
  
  if (event.key === 'Enter' && barcodeBuffer) {
    const producto = productos.find(p => p.codigo === barcodeBuffer.trim());
    if (producto) {
      seleccionarProducto(producto.codigo);
    }
    barcodeBuffer = '';
  }
}

// Funciones utilitarias
function mostrarError(mensaje) {
  // Implementar notificaciones toast para errores
  Toastify({
    text: mensaje,
    duration: 4000,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    backgroundColor: "#d9534f",
    stopOnFocus: true,
    className: "error-toast",
    onClick: function(){} // Callback after click
  }).showToast();
}

function mostrarExito(mensaje) {
  // Implementar notificaciones toast para mensajes de éxito
  Toastify({
    text: mensaje,
    duration: 3000,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    backgroundColor: "#5cb85c",
    stopOnFocus: true,
    className: "success-toast",
    onClick: function(){} // Callback after click
  }).showToast();
}

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}