/**
 * Módulo de Ventas - JavaScript
 * Script para la página principal de ventas
 */

document.addEventListener('DOMContentLoaded', function() {
  // Variables globales
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  let carrito = [];
  let clienteSeleccionado = null;
  let productosCache = {};
  let clientesCache = {}; // Cache para los clientes
  let timeoutBusqueda;
  let timeoutBusquedaCliente; // Timeout para la búsqueda de clientes
  let sugerenciasActivas = false;
  let sugerenciasClientesActivas = false; // Para las sugerencias de clientes
  let indiceSeleccionado = -1;
  let indiceClienteSeleccionado = -1; // Para navegar por las sugerencias de clientes
  let barcodeBuffer = ''; // Buffer para el escáner de códigos de barras
  let lastKeyTime = 0; // Último tiempo en que se registró una tecla
  let barcodeReadingActive = false; // Indica si está activa la lectura de un código de barras

  // Elementos del DOM
  // --- Productos ---
  const busquedaProducto = document.getElementById('busqueda-producto');
  const btnBuscar = document.getElementById('btn-buscar');
  const checkSoloStock = document.getElementById('check-solo-stock');
  const listaProductos = document.getElementById('lista-productos');
  const sugContainerProductos = document.getElementById('sugerencias-container');
  const sugProductos = document.getElementById('sugerencias-productos');
  
  // --- Clientes ---
  const busquedaCliente = document.getElementById('busqueda-cliente');
  const clienteId = document.getElementById('cliente-id');
  const btnLimpiarCliente = document.getElementById('btn-limpiar-cliente');
  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
  const clienteSeleccionadoInfo = document.getElementById('cliente-seleccionado-info');
  const clienteNombreDisplay = document.getElementById('cliente-nombre-display');
  const sugContainerClientes = document.getElementById('sugerencias-container-clientes');
  const sugClientes = document.getElementById('sugerencias-clientes');
  
  // --- Carrito ---
  const carritoItems = document.getElementById('carrito-items');
  const carritoVacio = document.getElementById('carrito-vacio');
  const subtotalElement = document.getElementById('subtotal');
  const ivaElement = document.getElementById('iva');
  const totalElement = document.getElementById('total');
  const btnProcesarVenta = document.getElementById('btn-procesar-venta');
  const btnCancelarVenta = document.getElementById('btn-cancelar-venta');

  const cardSeleccionCantidad = document.getElementById('card-seleccion-cantidad');
  const formAgregarProducto = document.getElementById('form-agregar-producto');
  const productoSeleccionado = document.getElementById('producto-seleccionado');
  const productoCodigo = document.getElementById('producto-codigo');
  const precioUnitario = document.getElementById('precio-unitario');
  const cantidadAgregar = document.getElementById('cantidad-agregar');
  const stockDisponible = document.getElementById('stock-disponible');
  const subtotalProducto = document.getElementById('subtotal-producto');
  const btnCancelarAgregar = document.getElementById('btn-cancelar-agregar');

  // Elementos de la sección de pago
  const seccionPago = document.getElementById('seccion-pago');
  const seccionProductos = document.getElementById('seccion-productos');
  const formPago = document.getElementById('form-pago');
  const efectivoRecibido = document.getElementById('efectivo-recibido');
  const cambioDevolver = document.getElementById('cambio-devolver');
  const observacionesPago = document.getElementById('observaciones-pago');
  const btnFinalizarVenta = document.getElementById('btn-finalizar-venta');
  const btnVolverVenta = document.getElementById('btn-volver-venta');

  // Inicialización
  cargarClientes();
  inicializarEventos();
  inicializarRadiosPago();

  // Funciones principales
  function inicializarEventos() {
    // Búsqueda de productos
    btnBuscar.addEventListener('click', buscarProductos);
    
    // Nueva funcionalidad: Búsqueda predictiva de productos
    busquedaProducto.addEventListener('input', function() {
      const termino = this.value.trim();
      
      // Limpiar el timeout anterior para evitar múltiples peticiones
      clearTimeout(timeoutBusqueda);
      
      // Si el campo está vacío, ocultar las sugerencias
      if (termino.length === 0) {
        ocultarSugerencias();
        return;
      }
      
      // Establecer un pequeño retraso para evitar muchas peticiones
      timeoutBusqueda = setTimeout(() => {
        buscarProductosPredictivo(termino);
      }, 300);
    });
    
    // Nueva funcionalidad: Búsqueda predictiva de clientes
    busquedaCliente.addEventListener('input', function() {
      buscarClientesPredictivo();
    });
    
    // Limpiar selección de cliente
    btnLimpiarCliente.addEventListener('click', function() {
      limpiarSeleccionCliente();
    });
    
    // Manejo del teclado para navegación por sugerencias de productos
    busquedaProducto.addEventListener('keydown', manejarNavegacionSugerencias);
    
    // Manejo del teclado para navegación por sugerencias de clientes
    busquedaCliente.addEventListener('keydown', manejarNavegacionSugerenciasClientes);
    
    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function(e) {
      // Cerrar sugerencias de productos
      if (!sugContainerProductos.contains(e.target) && e.target !== busquedaProducto) {
        ocultarSugerencias();
      }
      
      // Cerrar sugerencias de clientes
      if (!sugContainerClientes.contains(e.target) && e.target !== busquedaCliente) {
        ocultarSugerenciasClientes();
      }
    });

    busquedaProducto.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // Si hay sugerencias activas y una seleccionada
        if (sugerenciasActivas && indiceSeleccionado >= 0) {
          e.preventDefault();
          const sugerencias = document.querySelectorAll('.sugerencia-item');
          if (sugerencias[indiceSeleccionado]) {
            sugerencias[indiceSeleccionado].click();
          }
        } else {
          buscarProductos();
        }
      }
    });

    busquedaCliente.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // Si hay sugerencias activas y una seleccionada
        if (sugerenciasClientesActivas && indiceClienteSeleccionado >= 0) {
          e.preventDefault();
          const sugerencias = document.querySelectorAll('.sugerencia-cliente-item');
          if (sugerencias[indiceClienteSeleccionado]) {
            sugerencias[indiceClienteSeleccionado].click();
          }
        }
      }
    });

    // Gestión de productos y carrito
    checkSoloStock.addEventListener('change', buscarProductos);
    btnCancelarAgregar.addEventListener('click', ocultarSeleccionCantidad);
    formAgregarProducto.addEventListener('submit', agregarAlCarrito);
    precioUnitario.addEventListener('input', calcularSubtotalProducto);
    cantidadAgregar.addEventListener('input', calcularSubtotalProducto);

    // Clientes
    btnNuevoCliente.addEventListener('click', abrirModalNuevoCliente);
    document.getElementById('btn-guardar-cliente').addEventListener('click', guardarNuevoCliente);

    // Proceso de venta
    btnProcesarVenta.addEventListener('click', procesarVenta);
    btnCancelarVenta.addEventListener('click', cancelarVenta);
    btnFinalizarVenta.addEventListener('click', finalizarVenta);
    btnVolverVenta.addEventListener('click', volverAVenta);

    // Sección de pago
    formPago.addEventListener('submit', (e) => e.preventDefault());
    efectivoRecibido.addEventListener('input', calcularCambio);

    // Escáner de códigos de barras - Ahora usa el documento completo para la captura
    document.addEventListener('keydown', manejarEscanerCodigoBarras);

    // Atajos de teclado globales
    document.addEventListener('keydown', function(e) {
      // No procesar atajos si estamos en un campo de entrada
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // F2: Enfocar búsqueda de productos
      if (e.key === 'F2') {
        e.preventDefault();
        busquedaProducto.focus();
      }
      
      // F3: Enfocar búsqueda de clientes
      if (e.key === 'F3') {
        e.preventDefault();
        busquedaCliente.focus();
      }
      
      // F4: Procesar venta
      if (e.key === 'F4' && !btnProcesarVenta.disabled) {
        e.preventDefault();
        procesarVenta();
      }
      
      // F5: Cancelar venta (necesita confirmación)
      if (e.key === 'F5') {
        e.preventDefault();
        cancelarVenta();
      }
      
      // Escape: Cerrar dialogs/modals activos o volver atrás
      if (e.key === 'Escape') {
        const modalAbierto = document.querySelector('.modal.show');
        if (modalAbierto) {
          bootstrap.Modal.getInstance(modalAbierto).hide();
        } else if (!cardSeleccionCantidad.classList.contains('d-none')) {
          ocultarSeleccionCantidad();
        } else if (seccionPago.style.display === 'block') {
          volverAVenta();
        }
      }
    });
  }

  function inicializarRadiosPago() {
    const radiosPago = document.querySelectorAll('input[name="metodo-pago"]');
    const seccionEfectivo = document.getElementById('seccion-efectivo');
    const seccionPagosMixtos = document.getElementById('seccion-pagos-mixtos');
    
    radiosPago.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'efectivo') {
          seccionEfectivo.style.display = 'block';
          seccionPagosMixtos.classList.add('d-none');
        } else if (radio.value === 'mixto') {
          seccionEfectivo.style.display = 'none';
          seccionPagosMixtos.classList.remove('d-none');
          inicializarPagosMixtos();
        } else {
          seccionEfectivo.style.display = 'none';
          seccionPagosMixtos.classList.add('d-none');
        }
      });
    });
  }

  // Función mejorada para manejar el escáner de códigos de barras
  function manejarEscanerCodigoBarras(e) {
    // Ignorar eventos cuando el foco está en un campo de texto o se está usando ctrl/alt/shift
    if ((e.target.tagName === 'INPUT' && e.target.type === 'text' && e.target !== busquedaProducto) || 
        e.target.tagName === 'TEXTAREA' || 
        e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }
    
    const currentTime = new Date().getTime();
    
    // Si ha pasado mucho tiempo desde la última tecla (más de 100ms), consideramos que es un nuevo código
    if (currentTime - lastKeyTime > 100) {
      barcodeBuffer = '';
      barcodeReadingActive = true;
    }
    
    lastKeyTime = currentTime;
    
    // Si es una tecla alfanumérica o símbolo, agregarlo al buffer
    if (e.key.length === 1 || e.key === '-' || e.key === '_' || e.key === '.') {
      barcodeBuffer += e.key;
    }
    
    // Si se presiona Enter y el buffer no está vacío, procesar el código
    if (e.key === 'Enter' && barcodeBuffer) {
      e.preventDefault(); // Prevenir comportamiento por defecto del Enter
      
      // Solo procesar si parece un código de barras (longitud mínima 4 caracteres)
      if (barcodeBuffer.length >= 4) {
        console.log('Código de barras escaneado:', barcodeBuffer);
        buscarProductoPorCodigoBarras(barcodeBuffer);
      }
      
      // Reiniciar el buffer y la bandera
      barcodeBuffer = '';
      barcodeReadingActive = false;
    }
  }

  async function buscarProductoPorCodigoBarras(codigoBarras) {
    try {
      const response = await fetch(`/api/productos/barcode/${encodeURIComponent(codigoBarras)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al buscar producto por código de barras');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const producto = result.data;
        productosCache[producto.codigo] = producto; // Cachear el producto
        
        // Abrir automáticamente el modal de agregar producto con el producto escaneado
        mostrarSeleccionCantidad(producto);
        
        // Notificar al usuario que se ha encontrado el producto
        Swal.fire({
          icon: 'success',
          title: 'Producto encontrado',
          text: `Se ha escaneado: ${producto.nombre}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Producto no encontrado',
          text: `No se encontró ningún producto con el código de barras: ${codigoBarras}`
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al buscar producto por código de barras'
      });
    }
  }

  // Funciones para manejar pagos mixtos
  function inicializarPagosMixtos() {
    const container = document.getElementById('pagos-mixtos-container');
    const totalMixto = document.getElementById('total-mixto');
    const totalVenta = parseFloat(document.getElementById('factura-total').textContent.replace('$', '')) || 0;
    
    // Mostrar el total
    totalMixto.textContent = `$${totalVenta.toFixed(2)}`;
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    // Crear las opciones de pago
    const metodosPago = [
      { id: 'mixto-efectivo', nombre: 'Efectivo', icono: 'money-bill-wave' },
      { id: 'mixto-transferencia', nombre: 'Transferencia', icono: 'university' },
      { id: 'mixto-pago-movil', nombre: 'Pago móvil', icono: 'mobile-alt' },
      { id: 'mixto-tarjeta', nombre: 'Tarjeta', icono: 'credit-card' }
    ];
    
    metodosPago.forEach(metodo => {
      const div = document.createElement('div');
      div.className = 'mb-3';
      div.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-2">
          <label for="${metodo.id}" class="mb-0">
            <i class="fas fa-${metodo.icono} me-2"></i>${metodo.nombre}:
          </label>
          <div class="form-check form-switch">
            <input class="form-check-input metodo-mixto-check" type="checkbox" id="${metodo.id}-check" 
                   data-id="${metodo.id}">
          </div>
        </div>
        <div class="input-group mb-3 d-none" id="${metodo.id}-group">
          <span class="input-group-text">$</span>
          <input type="number" class="form-control metodo-mixto-monto" id="${metodo.id}" 
                 step="0.01" min="0" value="0" placeholder="Monto">
        </div>
      `;
      
      container.appendChild(div);
    });
    
    // Agregar event listeners a los checkboxes
    document.querySelectorAll('.metodo-mixto-check').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const inputGroupId = `${this.dataset.id}-group`;
        const inputGroup = document.getElementById(inputGroupId);
        
        if (this.checked) {
          inputGroup.classList.remove('d-none');
        } else {
          inputGroup.classList.add('d-none');
          document.getElementById(this.dataset.id).value = 0;
        }
        
        calcularTotalesMixtos();
      });
    });
    
    // Agregar event listeners a los inputs de monto
    document.querySelectorAll('.metodo-mixto-monto').forEach(input => {
      input.addEventListener('input', calcularTotalesMixtos);
    });
    
    // Calcular los totales iniciales
    calcularTotalesMixtos();
  }

  function calcularTotalesMixtos() {
    const totalVenta = parseFloat(document.getElementById('factura-total').textContent.replace('$', '')) || 0;
    const totalAsignadoElement = document.getElementById('total-asignado');
    const faltaAsignarElement = document.getElementById('falta-asignar');
    
    let totalAsignado = 0;
    
    // Sumar los montos de todos los métodos de pago activos
    document.querySelectorAll('.metodo-mixto-check:checked').forEach(checkbox => {
      const monto = parseFloat(document.getElementById(checkbox.dataset.id).value) || 0;
      totalAsignado += monto;
    });
    
    // Actualizar los totales
    totalAsignadoElement.textContent = `$${totalAsignado.toFixed(2)}`;
    
    const faltaAsignar = totalVenta - totalAsignado;
    faltaAsignarElement.textContent = `$${Math.abs(faltaAsignar).toFixed(2)}`;
    
    // Cambiar el color según si está completo o sobrepasado
    if (faltaAsignar < 0) {
      faltaAsignarElement.classList.remove('text-danger');
      faltaAsignarElement.classList.add('text-warning');
      faltaAsignarElement.textContent = `$${Math.abs(faltaAsignar).toFixed(2)} (excedido)`;
    } else if (faltaAsignar > 0) {
      faltaAsignarElement.classList.remove('text-warning');
      faltaAsignarElement.classList.add('text-danger');
    } else {
      faltaAsignarElement.classList.remove('text-danger', 'text-warning');
      faltaAsignarElement.classList.add('text-success');
    }
    
    // Habilitar o deshabilitar el botón de finalizar venta
    document.getElementById('btn-finalizar-venta').disabled = faltaAsignar > 0;
  }

  // Función para resaltar coincidencias en los resultados de búsqueda
  function resaltarCoincidencias(texto, busqueda) {
    if (!busqueda || busqueda.trim() === '') return texto;
    
    // Escapar caracteres especiales de regex
    const escapedBusqueda = busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Crear una expresión regular para buscar el término (insensible a mayúsculas/minúsculas)
    const regex = new RegExp(`(${escapedBusqueda})`, 'gi');
    
    // Reemplazar todas las coincidencias con la versión destacada
    return texto.replace(regex, '<span class="destacar">$1</span>');
  }

  // Funciones para búsqueda predictiva de clientes
  function buscarClientesPredictivo() {
    const termino = busquedaCliente.value.trim();
    
    // Limpiamos y ocultamos las sugerencias si el término está vacío
    if (!termino) {
        sugClientes.innerHTML = '';
        sugClientes.classList.add('d-none');
        return;
    }
    
    // Mostramos el ícono de carga
    sugClientes.innerHTML = '<div class="p-2 text-center"><i class="fas fa-spinner fa-spin me-2"></i>Buscando clientes...</div>';
    sugClientes.classList.remove('d-none');
    
    // Hacemos la petición para buscar clientes
    // Realizar la búsqueda - usando el parámetro 'buscar' que espera el controlador
    fetch(`/api/clientes/search?buscar=${encodeURIComponent(termino)}&limit=8`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al buscar clientes');
            return response.json();
        })
        .then(response => {
            // Ocultamos el ícono de carga
            sugClientes.innerHTML = '';
            
            // Extraer los clientes del objeto de respuesta
            const clientes = response.data || [];
            
            if (clientes && clientes.length > 0) {
                // Renderizamos y mostramos las sugerencias
                renderizarSugerenciasClientes(clientes, termino);
                sugClientes.classList.remove('d-none');
                sugerenciasClientesActivas = true; // Activamos el flag de sugerencias
                indiceClienteSeleccionado = -1; // Reiniciamos el índice
            } else {
                // No hay resultados, mostramos un mensaje
                sugClientes.innerHTML = '<div class="no-resultados">No se encontraron clientes</div>';
                sugClientes.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sugClientes.innerHTML = '<div class="no-resultados">Error al buscar clientes</div>';
            sugClientes.classList.remove('d-none');
        });
  }
  
  function renderizarSugerenciasClientes(clientes, termino) {
    // Limpiamos el contenedor de sugerencias
    sugClientes.innerHTML = '';
    
    // Ordenamos los clientes para que las coincidencias exactas por documento aparezcan primero
    const clientesOrdenados = [...clientes].sort((a, b) => {
        const aEsDocumentoExacto = a.documento && a.documento.toLowerCase() === termino.toLowerCase();
        const bEsDocumentoExacto = b.documento && b.documento.toLowerCase() === termino.toLowerCase();
        
        if (aEsDocumentoExacto && !bEsDocumentoExacto) return -1;
        if (!aEsDocumentoExacto && bEsDocumentoExacto) return 1;
        return 0;
    });
    
    // Creamos los elementos de sugerencia
    clientesOrdenados.forEach(cliente => {
        const esDocumentoExacto = cliente.documento && cliente.documento.toLowerCase() === termino.toLowerCase();
        const div = document.createElement('div');
        div.className = `sugerencia-cliente-item${esDocumentoExacto ? ' documento-exacto' : ''}`;
        div.dataset.id = cliente.id;
        
        // Resaltamos las coincidencias en el texto
        let nombreHTML = resaltarCoincidencias(cliente.nombre || '', termino);
        let documentoHTML = resaltarCoincidencias(cliente.documento || '', termino);
        
        // Creamos la estructura HTML con la información del cliente
        div.innerHTML = `
            <div class="sugerencia-info">
                <div class="sugerencia-nombre">${nombreHTML}</div>
                <div class="sugerencia-detalles">
                    ${esDocumentoExacto ? '<span class="badge bg-success me-1">Documento exacto</span>' : ''}
                    <span class="sugerencia-documento">${cliente.tipo_documento || ''} ${documentoHTML}</span>
                    ${cliente.telefono ? `<span class="sugerencia-telefono"> · ${cliente.telefono}</span>` : ''}
                </div>
            </div>
        `;
        
        // Agregamos el evento para seleccionar el cliente
        div.addEventListener('click', () => seleccionarClienteDeSugerencia(cliente.id));
        
        // Agregamos la sugerencia al contenedor
        sugClientes.appendChild(div);
    });
  }
  
  function seleccionarClienteDeSugerencia(id) {
    const cliente = clientesCache[id];
    
    if (!cliente) {
      return;
    }
    
    // Guardar la selección del cliente
    clienteSeleccionado = cliente;
    clienteId.value = cliente.id;
    
    // Mostrar información del cliente seleccionado
    clienteNombreDisplay.textContent = `${cliente.nombre} (${cliente.tipo_documento || ''}${cliente.documento || 'Sin documento'})`;
    clienteSeleccionadoInfo.classList.remove('d-none');
    
    // Actualizar la caja de búsqueda con el nombre del cliente
    busquedaCliente.value = cliente.documento ? 
      `${cliente.tipo_documento || ''}${cliente.documento} - ${cliente.nombre}` :
      cliente.nombre;
    
    // Ocultar sugerencias
    ocultarSugerenciasClientes();
  }
  
  function limpiarSeleccionCliente() {
    clienteSeleccionado = null;
    clienteId.value = '';
    busquedaCliente.value = '';
    clienteSeleccionadoInfo.classList.add('d-none');
    ocultarSugerenciasClientes();
  }
  
  function ocultarSugerenciasClientes() {
    sugClientes.classList.add('d-none');
    sugerenciasClientesActivas = false;
    indiceClienteSeleccionado = -1;
  }
  
  function manejarNavegacionSugerenciasClientes(e) {
    if (!sugerenciasClientesActivas) {
      return;
    }
    
    const sugerencias = document.querySelectorAll('.sugerencia-cliente-item');
    
    // Navegación con flechas arriba/abajo
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); // Evitar que el cursor se mueva en el campo de texto
      
      if (e.key === 'ArrowDown') {
        indiceClienteSeleccionado = (indiceClienteSeleccionado < sugerencias.length - 1) ? indiceClienteSeleccionado + 1 : 0;
      } else {
        indiceClienteSeleccionado = (indiceClienteSeleccionado > 0) ? indiceClienteSeleccionado - 1 : sugerencias.length - 1;
      }
      
      // Resaltar visualmente la sugerencia seleccionada
      sugerencias.forEach((s, i) => {
        s.classList.toggle('active', i === indiceClienteSeleccionado);
      });
      
      // Hacer scroll si es necesario para ver la sugerencia seleccionada
      if (indiceClienteSeleccionado >= 0 && sugerencias[indiceClienteSeleccionado]) {
        sugerencias[indiceClienteSeleccionado].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
    
    // Cerrar sugerencias con Escape
    if (e.key === 'Escape') {
      ocultarSugerenciasClientes();
    }
  }

  // Funciones para productos
  async function buscarProductos() {
    const termino = busquedaProducto.value.trim();
    const soloConStock = checkSoloStock.checked;
    
    try {
      // Ocultar sugerencias
      ocultarSugerencias();
      
      // Mostrar indicador de carga
      listaProductos.innerHTML = '<tr><td colspan="5" class="text-center">Buscando productos...</td></tr>';
      
      let productos = [];
      
      // Usar la nueva ruta específica para ventas que garantiza productos activos
      try {
        const params = new URLSearchParams();
        if (termino) params.append('buscar', termino);
        if (soloConStock) params.append('soloConStock', 'true');
        
        const response = await fetch(`/api/productos/ventas?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            productos = result.data;
          }
        }
      } catch (error) {
        console.error('Error en búsqueda de productos para ventas:', error);
        
        // Fallback a la búsqueda original con filtro de activos
        try {
          const params = new URLSearchParams();
          if (termino) params.append('buscar', termino);
          params.append('activo', 'true'); // Forzar solo productos activos
          
          const response = await fetch(`/api/productos?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              productos = result.data.map(p => ({
                ...p,
                cantidad: p.stock || p.cantidad || 0 // Asegurar compatibilidad
              }));
            }
          }
        } catch (fallbackError) {
          console.error('Error en búsqueda fallback:', fallbackError);
        }
      }
      
      // Si no se encontraron productos y hay un término, intentar búsqueda por código de barras
      if (productos.length === 0 && termino !== '') {
        try {
          const barcodeResponse = await fetch(`/api/productos/barcode/${encodeURIComponent(termino)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (barcodeResponse.ok) {
            const barcodeResult = await barcodeResponse.json();
            if (barcodeResult.success && barcodeResult.data) {
              // Verificar que el producto esté activo
              const producto = barcodeResult.data;
              if (producto.activo) {
                producto.cantidad = producto.stock || producto.cantidad || 0;
                productos.push(producto);
              }
            }
          }
        } catch (barcodeError) {
          console.error('Error al buscar por código de barras:', barcodeError);
        }
      }
      
      // Si después de todos los intentos no hay productos, mostrar mensaje
      if (productos.length === 0) {
        listaProductos.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron productos activos</td></tr>';
        return;
      }
      
      // Filtrar por stock si es necesario (doble verificación)
      let productosFiltrados = soloConStock ? productos.filter(p => (p.cantidad || p.stock || 0) > 0) : productos;
      
      // Limitar a los primeros 20 resultados para mejor rendimiento
      productosFiltrados = productosFiltrados.slice(0, 20);

      // Cachear productos para uso futuro
      productosFiltrados.forEach(p => {
        productosCache[p.codigo] = p;
      });
      
      renderizarProductos(productosFiltrados);
    } catch (error) {
      console.error('Error:', error);
      listaProductos.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar productos</td></tr>';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los productos'
      });
    }
  }

  async function buscarProductosPredictivo(termino) {
    try {
      // No mostrar sugerencias para términos muy cortos
      if (termino.length < 2) {
        ocultarSugerencias();
        return;
      }
      
      // Mostrar indicador de carga
      sugProductos.innerHTML = '<div class="p-2 text-center"><i class="fas fa-spinner fa-spin me-2"></i>Buscando productos...</div>';
      sugProductos.classList.remove('d-none');
      sugerenciasActivas = true;
      
      // Buscar productos por nombre, código o descripción
      const response = await fetch(`/api/productos?buscar=${encodeURIComponent(termino)}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }
      
      const result = await response.json();
      
      // Si no hay resultados
      if (!result.success || !result.data || result.data.length === 0) {
        sugProductos.innerHTML = '<div class="p-3 text-center text-muted">No se encontraron productos</div>';
        return;
      }
      
      // También buscar por código de barras
      try {
        const barcodeResponse = await fetch(`/api/productos/barcode/${encodeURIComponent(termino)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (barcodeResponse.ok) {
          const barcodeResult = await barcodeResponse.json();
          if (barcodeResult.success && barcodeResult.data) {
            // Verificar si ya existe en los resultados
            const yaExiste = result.data.some(p => p.codigo === barcodeResult.data.codigo);
            if (!yaExiste) {
              // Agregar al inicio de la lista
              result.data.unshift(barcodeResult.data);
              // Limitar a 5 resultados
              if (result.data.length > 5) {
                result.data.pop();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error al buscar por código de barras:', error);
      }
      
      // Cachear productos
      result.data.forEach(p => {
        productosCache[p.codigo] = p;
      });
      
      // Renderizar las sugerencias
      renderizarSugerenciasProductos(result.data, termino);
      
    } catch (error) {
      console.error('Error en búsqueda predictiva:', error);
      sugProductos.innerHTML = '<div class="p-3 text-center text-danger">Error al buscar productos</div>';
    }
  }
  
  function renderizarSugerenciasProductos(productos, termino) {
    let html = '';
    
    productos.forEach(producto => {
      const nombreResaltado = resaltarCoincidencias(producto.nombre, termino);
      const codigoResaltado = resaltarCoincidencias(producto.codigo, termino);
      
      html += `
        <div class="sugerencia-item" data-codigo="${producto.codigo}">
          <div>
            <div class="sugerencia-nombre">${nombreResaltado}</div>
            <div class="sugerencia-codigo">${codigoResaltado}</div>
          </div>
          <div>
            <div class="sugerencia-stock">${producto.cantidad} unid.</div>
            <div class="sugerencia-precio">$${parseFloat(producto.precio).toFixed(2)}</div>
          </div>
        </div>
      `;
    });
    
    sugProductos.innerHTML = html;
    
    // Restablecer índice seleccionado
    indiceSeleccionado = -1;
    
    // Agregar listeners de clic a las sugerencias
    document.querySelectorAll('.sugerencia-item').forEach(item => {
      item.addEventListener('click', () => {
        const codigo = item.getAttribute('data-codigo');
        const producto = productosCache[codigo];
        
        if (producto) {
          mostrarSeleccionCantidad(producto);
          ocultarSugerencias();
        }
      });
    });
  }
  
  function ocultarSugerencias() {
    sugProductos.classList.add('d-none');
    sugerenciasActivas = false;
    indiceSeleccionado = -1;
  }
  
  function manejarNavegacionSugerencias(e) {
    if (!sugerenciasActivas) {
      return;
    }
    
    const sugerencias = document.querySelectorAll('.sugerencia-item');
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      
      if (e.key === 'ArrowDown') {
        indiceSeleccionado = (indiceSeleccionado < sugerencias.length - 1) ? indiceSeleccionado + 1 : 0;
      } else {
        indiceSeleccionado = (indiceSeleccionado > 0) ? indiceSeleccionado - 1 : sugerencias.length - 1;
      }
      
      // Resaltar visualmente la sugerencia seleccionada
      sugerencias.forEach((s, i) => {
        s.classList.toggle('active', i === indiceSeleccionado);
      });
      
      if (indiceSeleccionado >= 0 && sugerencias[indiceSeleccionado]) {
        sugerencias[indiceSeleccionado].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
    
    if (e.key === 'Escape') {
      ocultarSugerencias();
    }
  }

  function renderizarProductos(productos) {
    if (productos.length === 0) {
      listaProductos.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron productos</td></tr>';
      return;
    }
    
    let html = '';
    
    productos.forEach(producto => {
      // Asegurar que tenemos un valor de stock válido
      const stock = producto.cantidad || producto.stock || 0;
      const stockMinimo = producto.stock_minimo || 5;
      const precio = parseFloat(producto.precio || 0);
      
      const stockClass = stock <= stockMinimo ? 'text-danger' : (stock <= stockMinimo * 2 ? 'text-warning' : '');
      
      html += `<tr class="producto-item">
        <td>${producto.codigo}</td>
        <td>${producto.nombre}</td>
        <td class="text-end">$${precio.toFixed(2)}</td>
        <td class="text-end ${stockClass}">${stock}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary btn-agregar" data-codigo="${producto.codigo}" ${stock <= 0 ? 'disabled' : ''}>
            <i class="fas fa-plus"></i>
          </button>
        </td>
      </tr>`;
      
      // Asegurar que el producto en cache tenga los campos correctos
      productosCache[producto.codigo] = {
        ...producto,
        cantidad: stock,
        stock: stock,
        precio: precio
      };
    });
    
    listaProductos.innerHTML = html;
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-agregar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const codigo = e.currentTarget.getAttribute('data-codigo');
        mostrarSeleccionCantidad(productosCache[codigo]);
      });
    });
    
    // Agregar evento de clic a las filas
    document.querySelectorAll('.producto-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-agregar') && !e.target.classList.contains('fa-plus')) {
          const codigo = row.querySelector('.btn-agregar').getAttribute('data-codigo');
          const producto = productosCache[codigo];
          if (producto && (producto.cantidad || producto.stock || 0) > 0) {
            mostrarSeleccionCantidad(producto);
          }
        }
      });
    });
  }

  function mostrarSeleccionCantidad(producto) {
    const stock = producto.cantidad || producto.stock || 0;
    const precio = parseFloat(producto.precio || 0);
    
    if (stock <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin stock',
        text: 'Este producto no tiene stock disponible'
      });
      return;
    }
    
    productoSeleccionado.value = `${producto.codigo} - ${producto.nombre}`;
    productoCodigo.value = producto.codigo;
    precioUnitario.value = precio.toFixed(2);
    cantidadAgregar.value = 1;
    stockDisponible.value = stock;
    
    // Establecer cantidad máxima
    cantidadAgregar.max = stock;
    
    // Calcular subtotal inicial
    calcularSubtotalProducto();
    
    cardSeleccionCantidad.classList.remove('d-none');
    cantidadAgregar.focus();
  }

  function ocultarSeleccionCantidad() {
    cardSeleccionCantidad.classList.add('d-none');
    formAgregarProducto.reset();
  }

  function calcularSubtotalProducto() {
    const precio = parseFloat(precioUnitario.value) || 0;
    const cantidad = parseInt(cantidadAgregar.value) || 0;
    const max = parseInt(stockDisponible.value) || 0;
    const descuento = parseInt(document.getElementById('descuento-producto').value) || 0;
    
    // Validar que no exceda el stock disponible
    if (cantidad > max) {
      cantidadAgregar.value = max;
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'La cantidad no puede exceder el stock disponible'
      });
    }
    
    // Calcular subtotal con descuento
    const subtotalSinDescuento = precio * Math.min(cantidad, max);
    const valorDescuento = (subtotalSinDescuento * descuento) / 100;
    const subtotalConDescuento = subtotalSinDescuento - valorDescuento;
    
    subtotalProducto.value = subtotalConDescuento.toFixed(2);
  }

  function agregarAlCarrito(e) {
    e.preventDefault();
    
    const codigo = productoCodigo.value;
    const producto = productosCache[codigo];
    const cantidad = parseInt(cantidadAgregar.value) || 0;
    const precio = parseFloat(precioUnitario.value) || 0;
    const descuentoPct = parseInt(document.getElementById('descuento-producto').value) || 0;
    
    if (!producto || cantidad <= 0 || precio <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor complete todos los campos correctamente'
      });
      return;
    }
    
    // Verificar si el producto ya está en el carrito
    const index = carrito.findIndex(item => item.codigo === codigo);
    
    if (index !== -1) {
      // Sumar la cantidad si ya existe
      const nuevaCantidad = carrito[index].cantidad + cantidad;
      
      if (nuevaCantidad > producto.cantidad) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'No hay suficiente stock para agregar esa cantidad'
        });
        return;
      }
      
      carrito[index].cantidad = nuevaCantidad;
      carrito[index].precio = precio;
      carrito[index].descuentoPct = descuentoPct;
      
      // Calcular subtotal con descuento
      const subtotalSinDescuento = precio * nuevaCantidad;
      const valorDescuento = (subtotalSinDescuento * descuentoPct) / 100;
      carrito[index].descuento = valorDescuento;
      carrito[index].subtotal = subtotalSinDescuento - valorDescuento;
    } else {
      // Calcular subtotal con descuento para nuevo item
      const subtotalSinDescuento = precio * cantidad;
      const valorDescuento = (subtotalSinDescuento * descuentoPct) / 100;
      
      // Agregar nuevo item al carrito
      carrito.push({
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: cantidad,
        precio: precio,
        descuentoPct: descuentoPct,
        descuento: valorDescuento,
        subtotal: subtotalSinDescuento - valorDescuento
      });
    }
    
    // Actualizar UI
    actualizarCarrito();
    ocultarSeleccionCantidad();
    
    // Mostrar notificación
    Swal.fire({
      icon: 'success',
      title: 'Producto agregado',
      text: `${producto.nombre} agregado al carrito`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    });
  }

  function actualizarCarrito() {
    if (carrito.length === 0) {
      carritoVacio.style.display = 'block';
      carritoItems.innerHTML = '';
      actualizarTotales();
      btnProcesarVenta.disabled = true;
      return;
    }
    
    carritoVacio.style.display = 'none';
    btnProcesarVenta.disabled = false;
    
    let html = '';
    carrito.forEach((item, index) => {
      html += `
        <div class="carrito-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">${item.nombre}</h6>
              <small class="text-muted">${item.codigo}</small>
            </div>
            <button class="btn btn-sm btn-outline-danger btn-quitar" data-index="${index}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span>${item.cantidad}x $${item.precio.toFixed(2)}</span>
            <strong>$${item.subtotal.toFixed(2)}</strong>
          </div>
        </div>
      `;
    });
    
    carritoItems.innerHTML = html;
    
    // Agregar eventos para quitar productos
    document.querySelectorAll('.btn-quitar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        quitarDelCarrito(index);
      });
    });
    
    // Actualizar totales
    actualizarTotales();
  }

  function quitarDelCarrito(index) {
    if (index >= 0 && index < carrito.length) {
      const item = carrito[index];
      
      Swal.fire({
        title: '¿Eliminar producto?',
        text: `¿Desea quitar ${item.nombre} del carrito?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          carrito.splice(index, 1);
          actualizarCarrito();
        }
      });
    }
  }

  function actualizarTotales() {
    let subtotal = 0;
    let totalDescuento = 0;
    
    carrito.forEach(item => {
      subtotal += item.subtotal;
      // Sumar descuentos individuales
      if (item.descuento) {
        totalDescuento += item.descuento;
      }
    });
    
    const total = subtotal;
    
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('descuento-total').textContent = `$${totalDescuento.toFixed(2)}`;
    totalElement.textContent = `$${total.toFixed(2)}`;
  }

  async function cargarClientes() {
    try {
      const response = await fetch('/api/clientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      
      const result = await response.json();
      
      if (result && Array.isArray(result)) {
        // Cachear todos los clientes
        result.forEach(cliente => {
          if (cliente.activo !== false) {
            clientesCache[cliente.id] = cliente;
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  }

  function abrirModalNuevoCliente(terminoBusqueda = '') {
    // Limpiar el formulario
    document.getElementById('form-nuevo-cliente').reset();
    
    // Si se proporcionó un término de búsqueda, intentar prellenar los campos
    if (terminoBusqueda) {
      // Si el término parece ser un número, asumir que es un documento
      if (/^\d+$/.test(terminoBusqueda)) {
        document.getElementById('cliente-documento').value = terminoBusqueda;
      } else {
        document.getElementById('cliente-nombre').value = terminoBusqueda;
      }
    }
    
    // Mostrar el modal
    const modalNuevoCliente = new bootstrap.Modal(document.getElementById('modalNuevoCliente'));
    modalNuevoCliente.show();
  }

  async function guardarNuevoCliente() {
    const nombre = document.getElementById('cliente-nombre').value.trim();
    const tipoDocumento = document.getElementById('cliente-tipo-documento').value;
    const documento = document.getElementById('cliente-documento').value.trim();
    const direccion = document.getElementById('cliente-direccion').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const email = document.getElementById('cliente-email').value.trim();
    
    if (!nombre) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El nombre del cliente es obligatorio'
      });
      return;
    }
    
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          tipo_documento: tipoDocumento,
          documento,
          direccion,
          telefono,
          email
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear el cliente');
      }
      
      const nuevoCliente = await response.json();
      
      // Cerrar el modal
      bootstrap.Modal.getInstance(document.getElementById('modalNuevoCliente')).hide();
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Cliente registrado',
        text: 'El cliente ha sido registrado exitosamente'
      });
      
      // Agregar el cliente al cache
      clientesCache[nuevoCliente.id] = nuevoCliente;
      
      // Seleccionar el nuevo cliente
      clienteSeleccionado = nuevoCliente;
      clienteId.value = nuevoCliente.id;
      busquedaCliente.value = nuevoCliente.documento ? 
        `${nuevoCliente.tipo_documento || ''}${nuevoCliente.documento} - ${nuevoCliente.nombre}` : 
        nuevoCliente.nombre;
      
      // Mostrar información del cliente seleccionado
      clienteNombreDisplay.textContent = `${nuevoCliente.nombre} (${nuevoCliente.tipo_documento || ''}${nuevoCliente.documento || 'Sin documento'})`;
      clienteSeleccionadoInfo.classList.remove('d-none');
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al registrar el cliente'
      });
    }
  }

  function procesarVenta() {
    if (carrito.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'Debe agregar productos al carrito para procesar la venta'
      });
      return;
    }
    
    // Calcular totales para el resumen
    let subtotal = 0;
    let totalDescuento = 0;
    
    carrito.forEach(item => {
      subtotal += item.subtotal;
      // Sumar descuentos individuales
      if (item.descuento) {
        totalDescuento += item.descuento;
      }
    });
    
    const total = subtotal;
    
    // Mostrar fecha actual
    const fecha = new Date();
    document.getElementById('factura-fecha').textContent = fecha.toLocaleDateString();
    
    // Mostrar datos del cliente (ahora puede ser opcional)
    if (clienteSeleccionado) {
      document.getElementById('factura-cliente-nombre').textContent = clienteSeleccionado.nombre;
      const docCliente = clienteSeleccionado.documento ? 
        `${clienteSeleccionado.tipo_documento || ''} ${clienteSeleccionado.documento}` : 
        'Sin documento';
      document.getElementById('factura-cliente-documento').textContent = docCliente;
    } else {
      document.getElementById('factura-cliente-nombre').textContent = "Cliente general";
      document.getElementById('factura-cliente-documento').textContent = '';
    }
    
    // Mostrar items en la factura
    let itemsHtml = '';
    carrito.forEach(item => {
      // Mostrar el descuento en cada línea si existe
      const descuentoInfo = item.descuentoPct > 0 ? 
        ` <span class="badge bg-success">-${item.descuentoPct}%</span>` : '';
        
      itemsHtml += `<tr>
        <td>${item.nombre}${descuentoInfo}</td>
        <td class="text-end">${item.cantidad}</td>
        <td class="text-end">$${item.precio.toFixed(2)}</td>
        <td class="text-end">$${item.subtotal.toFixed(2)}</td>
      </tr>`;
    });
    document.getElementById('factura-items').innerHTML = itemsHtml;
    
    // Mostrar totales
    document.getElementById('factura-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('factura-descuento').textContent = `$${totalDescuento.toFixed(2)}`;
    document.getElementById('factura-total').textContent = `$${total.toFixed(2)}`;
    
    // Cambiar a la vista de pago
    seccionProductos.style.display = 'none';
    seccionPago.style.display = 'block';
    
    // Inicializar campo de efectivo con el total redondeado
    efectivoRecibido.value = Math.ceil(total);
    calcularCambio();
  }

  function calcularCambio() {
    const totalVenta = parseFloat(document.getElementById('factura-total').textContent.replace('$', '')) || 0;
    const recibido = parseFloat(efectivoRecibido.value) || 0;
    const cambio = recibido - totalVenta;
    
    cambioDevolver.textContent = cambio >= 0 ? `$${cambio.toFixed(2)}` : '$0.00';
    
    if (cambio < 0) {
      cambioDevolver.classList.add('text-danger');
    } else {
      cambioDevolver.classList.remove('text-danger');
    }
  }

  function volverAVenta() {
    seccionProductos.style.display = 'block';
    seccionPago.style.display = 'none';
  }

  function cancelarVenta() {
    Swal.fire({
      title: '¿Cancelar venta?',
      text: 'Se eliminarán todos los productos del carrito',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar venta',
      cancelButtonText: 'No, continuar'
    }).then((result) => {
      if (result.isConfirmed) {
        carrito = [];
        actualizarCarrito();
        limpiarSeleccionCliente();
      }
    });
  }

  async function finalizarVenta() {
    const metodoPago = document.querySelector('input[name="metodo-pago"]:checked').value;
    const observaciones = observacionesPago.value.trim();
    
    // Validar método de pago efectivo
    if (metodoPago === 'efectivo') {
      const totalVenta = parseFloat(document.getElementById('factura-total').textContent.replace('$', '')) || 0;
      const recibido = parseFloat(efectivoRecibido.value) || 0;
      
      if (recibido < totalVenta) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El monto recibido no puede ser menor que el total de la venta'
        });
        return;
      }
    }
    
    // Preparar datos para enviar
    const items = carrito.map(item => {
      return {
        producto_codigo: item.codigo,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        impuesto: 0, // Sin IVA (0%)
        descuento: 0
      };
    });
    
    const venta = {
      cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
      items,
      metodo_pago: metodoPago,
      observaciones
    };
    
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando venta',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch('/api/ventas/nueva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(venta)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al procesar la venta');
      }
      
      const resultado = await response.json();
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Venta realizada',
        text: `Factura ${resultado.factura.numero} generada correctamente`,
        confirmButtonText: 'Ver factura'
      }).then((result) => {
        if (result.isConfirmed) {
          // Redirigir a la página de detalle de factura
          window.location.href = `/ventas/historial?factura=${resultado.factura.id}`;
        } else {
          // Reiniciar el formulario para una nueva venta
          resetearVenta();
        }
      });
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al procesar la venta'
      });
    }
  }

  function resetearVenta() {
    // Limpiar carrito
    carrito = [];
    actualizarCarrito();
    
    // Limpiar cliente
    limpiarSeleccionCliente();
    
    // Volver a la vista de productos
    seccionProductos.style.display = 'block';
    seccionPago.style.display = 'none';
    
    // Limpiar formulario de pago
    formPago.reset();
    observacionesPago.value = '';
    
    // Buscar productos
    busquedaProducto.value = '';
    buscarProductos();
  }
});