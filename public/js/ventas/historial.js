/**
 * Historial de Ventas - JavaScript
 * Script para la página de historial de ventas/facturas
 */

document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  
  let tablaFacturas;
  let facturaSeleccionada = null;
  
  // Referencias a elementos de la interfaz para los botones
  const btnAnularFactura = document.getElementById('btn-anular-factura');
  const btnDevolucionProductos = document.getElementById('btn-devolucion-productos');
  const btnGenerarFacturaElectronica = document.getElementById('btn-generar-factura-electronica');

  // Referencias a elementos de devolución
  const modalDevolucionProductos = new bootstrap.Modal(document.getElementById('modalDevolucionProductos'));
  const tablaProductosDevolucion = document.getElementById('tabla-productos-devolucion');
  const devolucionFacturaId = document.getElementById('devolucion-factura-id');
  const devolucionMotivo = document.getElementById('devolucion-motivo');
  const btnConfirmarDevolucion = document.getElementById('btn-confirmar-devolucion');

  // Referencias a elementos de factura electrónica
  const modalFacturaElectronica = new bootstrap.Modal(document.getElementById('modalFacturaElectronica'));
  const facturaElectronicaId = document.getElementById('factura-electronica-id');
  const btnConfirmarFacturaElectronica = document.getElementById('btn-confirmar-factura-electronica');
  
  // Inicializar DataTable de facturas
  inicializarTablaFacturas();
  
  // Inicializar eventos
  inicializarEventos();
  
  // Cargar facturas iniciales
  cargarFacturas();
  
  // Cargar lista de clientes para filtro
  cargarClientes();
  
  function inicializarTablaFacturas() {
    tablaFacturas = $('#tabla-facturas').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
      },
      lengthMenu: [10, 25, 50, 100],
      pageLength: 10,
      columns: [
        { data: 'numero' },
        { 
          data: 'fecha',
          render: function(data) {
            return new Date(data).toLocaleDateString();
          } 
        },
        { 
          data: 'cliente',
          render: function(data) {
            return data ? data.nombre : 'Cliente general';
          } 
        },
        { 
          data: 'total',
          render: function(data) {
            return `$${parseFloat(data).toFixed(2)}`;
          } 
        },
        { 
          data: 'estado',
          render: function(data) {
            const badgeClass = {
              'pendiente': 'badge-pendiente',
              'pagada': 'badge-pagada',
              'anulada': 'badge-anulada'
            }[data] || '';
            
            return `<span class="badge ${badgeClass}">${data.toUpperCase()}</span>`;
          } 
        },
        { data: 'metodo_pago' },
        { 
          data: null,
          sortable: false,
          render: function(data) {
            if (data.estado === 'anulada') {
              return `
                <button class="btn btn-sm btn-outline-info btn-ver" data-id="${data.id}">
                  <i class="fas fa-eye"></i>
                </button>
              `;
            }
            
            return `
              <button class="btn btn-sm btn-outline-info btn-ver" data-id="${data.id}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-primary btn-pdf" data-id="${data.id}">
                <i class="fas fa-file-pdf"></i>
              </button>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                  <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item btn-anular" data-id="${data.id}"><i class="fas fa-ban me-2"></i>Anular</a></li>
                  <li><a class="dropdown-item btn-devolucion" data-id="${data.id}"><i class="fas fa-undo me-2"></i>Devolución</a></li>
                  <li><a class="dropdown-item btn-factura-e" data-id="${data.id}"><i class="fas fa-file-invoice me-2"></i>Facturación Electrónica</a></li>
                </ul>
              </div>
            `;
          }
        }
      ],
      order: [[1, 'desc']] // Ordenar por fecha, más reciente primero
    });
    
    // Manejar evento click en botones
    $('#tabla-facturas tbody').on('click', '.btn-ver', function() {
      const id = $(this).data('id');
      verDetalleFactura(id);
    });
    
    $('#tabla-facturas tbody').on('click', '.btn-pdf', function() {
      const id = $(this).data('id');
      descargarFacturaPDF(id);
    });

    // Manejar click en botones de acciones adicionales
    $('#tabla-facturas tbody').on('click', '.btn-anular', function() {
      const id = $(this).data('id');
      mostrarModalAnulacion(id);
    });

    $('#tabla-facturas tbody').on('click', '.btn-devolucion', function() {
      const id = $(this).data('id');
      mostrarModalDevolucion(id);
    });

    $('#tabla-facturas tbody').on('click', '.btn-factura-e', function() {
      const id = $(this).data('id');
      mostrarModalFacturaElectronica(id);
    });

    // Manejar click en fila para seleccionar factura
    $('#tabla-facturas tbody').on('click', 'tr', function() {
      const data = tablaFacturas.row(this).data();
      if (data) {
        seleccionarFactura(data);
      }
    });
  }
  
  function inicializarEventos() {
    // Eventos para filtros
    document.getElementById('form-filtros').addEventListener('submit', function(e) {
      e.preventDefault();
      aplicarFiltros();
    });
    
    document.getElementById('btn-limpiar-filtros').addEventListener('click', function() {
      document.getElementById('form-filtros').reset();
      aplicarFiltros();
    });
    
    // Evento para exportar a Excel
    document.getElementById('btn-exportar-excel').addEventListener('click', function() {
      exportarExcel();
    });
    
    // Eventos para botones de acciones en detalle factura
    document.getElementById('btn-descargar-factura').addEventListener('click', function() {
      if (facturaSeleccionada) {
        descargarFacturaPDF(facturaSeleccionada.id);
      }
    });
    
    // Modal para anular factura desde la vista detalle
    const btnAnularFacturaModal = document.getElementById('btn-anular-factura');
    if (btnAnularFacturaModal) {
      btnAnularFacturaModal.addEventListener('click', function() {
        if (facturaSeleccionada && facturaSeleccionada.estado !== 'anulada') {
          mostrarModalAnulacion(facturaSeleccionada.id);
        }
      });
    }
    
    // Confirmar anulación de factura
    document.getElementById('btn-confirmar-anular').addEventListener('click', function() {
      anularFactura();
    });

    // Eventos para botones del menú de opciones
    btnDevolucionProductos.addEventListener('click', function() {
      if (facturaSeleccionada && facturaSeleccionada.estado !== 'anulada') {
        mostrarModalDevolucion(facturaSeleccionada.id);
      }
    });

    btnGenerarFacturaElectronica.addEventListener('click', function() {
      if (facturaSeleccionada && facturaSeleccionada.estado !== 'anulada') {
        mostrarModalFacturaElectronica(facturaSeleccionada.id);
      }
    });

    // Confirmar devolución de productos
    btnConfirmarDevolucion.addEventListener('click', function() {
      procesarDevolucion();
    });

    // Confirmar generación de factura electrónica
    btnConfirmarFacturaElectronica.addEventListener('click', function() {
      generarFacturaElectronica();
    });

    // Evento para habilitar/deshabilitar botón de confirmar devolución
    tablaProductosDevolucion.addEventListener('change', function(e) {
      if (e.target.classList.contains('check-devolver') || e.target.classList.contains('cantidad-devolver')) {
        actualizarEstadoBotonDevolucion();
      }
    });

    // Evento para actualizar cantidades máximas en devoluciones
    tablaProductosDevolucion.addEventListener('input', function(e) {
      if (e.target.classList.contains('cantidad-devolver')) {
        const max = parseInt(e.target.getAttribute('max')) || 0;
        const valor = parseInt(e.target.value) || 0;
        
        if (valor > max) {
          e.target.value = max;
          showToast('La cantidad a devolver no puede ser mayor que la cantidad original', 'warning');
        }
        
        if (valor < 1) {
          e.target.value = 1;
        }
      }
    });
  }
  
  async function cargarFacturas(filtros = {}) {
    try {
      // Construir URL con filtros
      let url = '/api/ventas';
      const params = new URLSearchParams();
      
      // Usar los nombres exactos que espera la API
      if (filtros.numero) params.append('numero', filtros.numero);
      if (filtros.fechaDesde) params.append('fecha_desde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fecha_hasta', filtros.fechaHasta);
      if (filtros.clienteId) params.append('cliente_id', filtros.clienteId);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const queryParams = params.toString();
      if (queryParams) {
        url = `${url}?${queryParams}`;
      }
      
      console.log('URL para cargar facturas:', url); // Depuración
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar facturas');
      }
      
      const facturas = await response.json();
      console.log(`Se encontraron ${facturas.length} facturas con los filtros aplicados`); // Depuración
      
      // Limpiar tabla y agregar datos
      tablaFacturas.clear().rows.add(facturas).draw();
      
      // Verificar si hay que preseleccionar una factura (ej: cuando se viene desde otra página)
      const urlParams = new URLSearchParams(window.location.search);
      const facturaId = urlParams.get('factura');
      
      if (facturaId) {
        const factura = facturas.find(f => f.id == facturaId);
        if (factura) {
          verDetalleFactura(facturaId);
        }
      }
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las facturas'
      });
    }
  }
  
  async function cargarClientes() {
    try {
      const response = await fetch('/api/clientes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      
      const clientes = await response.json();
      
      // Llenar el select de clientes
      const selectCliente = document.getElementById('filtro-cliente');
      
      clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        selectCliente.appendChild(option);
      });
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  }
  
  function aplicarFiltros() {
    const fechaDesde = document.getElementById('filtro-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-fecha-hasta').value;
    const clienteId = document.getElementById('filtro-cliente').value;
    const estado = document.getElementById('filtro-estado').value;
    const numero = document.getElementById('filtro-numero').value;
    
    const filtros = {};
    
    // Solo añadir parámetros con valores
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;
    if (clienteId) filtros.clienteId = clienteId;
    if (estado) filtros.estado = estado;
    if (numero) filtros.numero = numero;
    
    console.log('Filtros aplicados:', filtros); // Para depuración
    cargarFacturas(filtros);
  }
  
  async function verDetalleFactura(id) {
    try {
      const response = await fetch(`/api/ventas/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar detalles de la factura');
      }
      
      const factura = await response.json();
      console.log('Factura cargada:', factura); // Debug
      
      // Guardar la factura seleccionada
      facturaSeleccionada = factura;
      
      // Actualizar información en el modal
      document.getElementById('factura-numero').textContent = factura.numero;
      document.getElementById('factura-fecha').textContent = new Date(factura.fecha).toLocaleDateString();
      
      const estadoClass = {
        'pendiente': 'badge bg-warning',
        'pagada': 'badge bg-success',
        'anulada': 'badge bg-danger'
      }[factura.estado] || '';
      
      document.getElementById('factura-estado').innerHTML = `<span class="${estadoClass}">${factura.estado.toUpperCase()}</span>`;
      
      // Información del cliente
      if (factura.cliente) {
        document.getElementById('factura-cliente-nombre').textContent = factura.cliente.nombre;
        document.getElementById('factura-cliente-documento').textContent = factura.cliente.tipo_documento ? 
          `${factura.cliente.tipo_documento} ${factura.cliente.documento}` : 
          factura.cliente.documento || '';
        document.getElementById('factura-cliente-direccion').textContent = factura.cliente.direccion || '';
      } else {
        document.getElementById('factura-cliente-nombre').textContent = 'Cliente general';
        document.getElementById('factura-cliente-documento').textContent = '';
        document.getElementById('factura-cliente-direccion').textContent = '';
      }
      
      // Verificar si hay detalles en la factura
      if (!factura.detalles || factura.detalles.length === 0) {
        document.getElementById('factura-items').innerHTML = '<tr><td colspan="4" class="text-center">No hay productos en esta factura</td></tr>';
      } else {
        // Mostrar los productos
        let itemsHtml = '';
        let subtotal = 0;
        
        factura.detalles.forEach(detalle => {
          const nombreProducto = detalle.producto ? detalle.producto.nombre : 'Producto desconocido';
          
          itemsHtml += `
            <tr>
              <td>${nombreProducto}</td>
              <td class="text-end">${detalle.cantidad}</td>
              <td class="text-end">$${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
              <td class="text-end">$${parseFloat(detalle.subtotal).toFixed(2)}</td>
            </tr>
          `;
          
          subtotal += parseFloat(detalle.subtotal);
        });
        
        document.getElementById('factura-items').innerHTML = itemsHtml;
      }
      
      // Mostrar totales
      document.getElementById('factura-subtotal').textContent = `$${parseFloat(factura.subtotal || 0).toFixed(2)}`;
      document.getElementById('factura-total').textContent = `$${parseFloat(factura.total || 0).toFixed(2)}`;
      
      // Mostrar información adicional
      document.getElementById('factura-metodo-pago').textContent = factura.metodo_pago ? factura.metodo_pago.toUpperCase() : 'NO ESPECIFICADO';
      
      // Verificar si existe el elemento vendedor antes de actualizarlo
      const vendedorElement = document.getElementById('factura-vendedor');
      if (vendedorElement) {
        vendedorElement.textContent = factura.usuario?.nombre_completo || 'No especificado';
      }
      
      // Observaciones
      const observacionesContainer = document.getElementById('factura-observaciones-container');
      if (observacionesContainer) {
        if (factura.observaciones) {
          observacionesContainer.style.display = 'block';
          document.getElementById('factura-observaciones').textContent = factura.observaciones;
        } else {
          observacionesContainer.style.display = 'none';
        }
      }
      
      // Actualizar estado del botón de anular
      const btnAnular = document.getElementById('btn-anular-factura');
      if (btnAnular) {
        if (factura.estado === 'anulada') {
          btnAnular.style.display = 'none';
        } else {
          btnAnular.style.display = 'block';
        }
      }
      
      // Mostrar el modal
      new bootstrap.Modal(document.getElementById('modalDetalleFactura')).show();
    } catch (error) {
      console.error('Error al cargar detalle de factura:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el detalle de la factura'
      });
    }
  }
  
  async function descargarFacturaPDF(id) {
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando',
        text: 'Preparando documento para descarga...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Obtener la factura para conocer el número
      const facturaResponse = await fetch(`/api/ventas/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!facturaResponse.ok) {
        throw new Error('Error al obtener la información de la factura');
      }
      
      const factura = await facturaResponse.json();
      const numero = factura.numero;
      
      // Descargar el PDF con el token de autenticación
      const response = await fetch(`/api/ventas/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }
      
      // Convertir la respuesta a blob
      const blob = await response.blob();
      
      // Crear URL para el blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear un enlace temporal y hacer clic en él para descargar
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Cerrar el indicador de carga
      Swal.close();
    } catch (error) {
      console.error('Error al descargar factura:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo descargar la factura'
      });
    }
  }
  
  function mostrarModalAnulacion(facturaId) {
    document.getElementById('anular-factura-id').value = facturaId;
    document.getElementById('anular-motivo').value = '';
    new bootstrap.Modal(document.getElementById('modalAnularFactura')).show();
  }
  
  async function anularFactura() {
    const id = document.getElementById('anular-factura-id').value;
    const motivo = document.getElementById('anular-motivo').value.trim();
    
    if (!motivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe especificar el motivo de anulación'
      });
      return;
    }
    
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando',
        text: 'Anulando factura...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch(`/api/ventas/${id}/anular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motivo })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al anular la factura');
      }
      
      // Cerrar el modal
      bootstrap.Modal.getInstance(document.getElementById('modalAnularFactura')).hide();
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Factura anulada',
        text: 'La factura ha sido anulada correctamente'
      }).then(() => {
        // Recargar facturas
        cargarFacturas();
        
        // Cerrar también el modal de detalle si está abierto
        const modalDetalle = document.getElementById('modalDetalleFactura');
        if (modalDetalle) {
          bootstrap.Modal.getInstance(modalDetalle).hide();
        }
      });
    } catch (error) {
      console.error('Error al anular factura:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al anular la factura'
      });
    }
  }

  function seleccionarFactura(factura) {
    facturaSeleccionada = factura;
    
    // Mostrar u ocultar el botón de opciones según estado de la factura
    if (factura.estado !== 'anulada') {
      btnDevolucionProductos.style.display = 'inline-block';
      btnGenerarFacturaElectronica.style.display = 'inline-block';
    } else {
      btnDevolucionProductos.style.display = 'none';
      btnGenerarFacturaElectronica.style.display = 'none';
    }
  }

  async function mostrarModalDevolucion(facturaId) {
    try {
      const response = await fetch(`/api/ventas/${facturaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar detalles de la factura');
      }
      
      const factura = await response.json();
      
      // Establecer el ID de factura en el campo oculto
      devolucionFacturaId.value = facturaId;
      
      // Limpiar la tabla de productos
      tablaProductosDevolucion.querySelector('tbody').innerHTML = '';
      
      // Llenar la tabla con los productos de la factura
      factura.detalles.forEach((detalle, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="text-center">
            <input type="checkbox" class="form-check-input check-devolver" 
                  data-index="${index}" data-producto="${detalle.producto_codigo}">
          </td>
          <td>${detalle.producto.nombre}</td>
          <td class="text-center">${detalle.cantidad}</td>
          <td class="text-center">
            <input type="number" class="form-control form-control-sm cantidad-devolver" 
                  min="1" max="${detalle.cantidad}" value="1" disabled
                  data-producto="${detalle.producto_codigo}">
          </td>
        `;
        
        tablaProductosDevolucion.querySelector('tbody').appendChild(tr);
      });
      
      // Agregar evento para habilitar/deshabilitar inputs de cantidad
      document.querySelectorAll('.check-devolver').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const index = this.getAttribute('data-index');
          const input = document.querySelectorAll('.cantidad-devolver')[index];
          
          input.disabled = !this.checked;
          
          actualizarEstadoBotonDevolucion();
        });
      });
      
      // Limpiar el campo de motivo
      devolucionMotivo.value = '';
      
      // Deshabilitar botón de confirmación (se habilitará cuando seleccionen algún producto)
      btnConfirmarDevolucion.disabled = true;
      
      // Mostrar el modal
      modalDevolucionProductos.show();
    } catch (error) {
      console.error('Error al cargar productos para devolución:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los productos para devolución'
      });
    }
  }

  function actualizarEstadoBotonDevolucion() {
    const hayProductosSeleccionados = [...document.querySelectorAll('.check-devolver')].some(checkbox => checkbox.checked);
    
    btnConfirmarDevolucion.disabled = !hayProductosSeleccionados;
  }

  async function procesarDevolucion() {
    const facturaId = devolucionFacturaId.value;
    const motivo = devolucionMotivo.value.trim();
    
    if (!motivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe especificar el motivo de la devolución'
      });
      return;
    }
    
    // Recopilar productos seleccionados para devolución
    const productos = [];
    document.querySelectorAll('.check-devolver:checked').forEach(checkbox => {
      const productoId = checkbox.getAttribute('data-producto');
      const input = document.querySelector(`.cantidad-devolver[data-producto="${productoId}"]`);
      const cantidad = parseInt(input.value);
      
      productos.push({
        producto_codigo: productoId,
        cantidad
      });
    });
    
    if (productos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe seleccionar al menos un producto para devolver'
      });
      return;
    }
    
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando',
        text: 'Procesando devolución...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch(`/api/ventas/${facturaId}/devolucion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          productos,
          motivo
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al procesar la devolución');
      }
      
      const resultado = await response.json();
      
      // Cerrar el modal
      modalDevolucionProductos.hide();
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Devolución procesada',
        text: 'Los productos han sido devueltos correctamente',
        confirmButtonText: 'Ver comprobante'
      }).then((result) => {
        if (result.isConfirmed && resultado.factura_id) {
          // Recargar facturas y mostrar la nota de crédito generada
          cargarFacturas();
          verDetalleFactura(resultado.factura_id);
        } else {
          cargarFacturas();
        }
      });
    } catch (error) {
      console.error('Error al procesar devolución:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al procesar la devolución'
      });
    }
  }

  function mostrarModalFacturaElectronica(facturaId) {
    facturaElectronicaId.value = facturaId;
    modalFacturaElectronica.show();
  }

  async function generarFacturaElectronica() {
    const facturaId = facturaElectronicaId.value;
    const responsableFiscal = document.getElementById('responsable-fiscal').value;
    const regimenFiscal = document.getElementById('regimen-fiscal').value;
    const enviarCorreo = document.getElementById('enviar-correo').checked;
    
    if (!responsableFiscal || !regimenFiscal) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe seleccionar la responsabilidad y régimen fiscal'
      });
      return;
    }
    
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando',
        text: 'Generando factura electrónica...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Simular tiempo de procesamiento (para demostración)
      setTimeout(() => {
        // Cerrar el modal
        modalFacturaElectronica.hide();
        
        // Mostrar mensaje de éxito
        Swal.fire({
          icon: 'success',
          title: 'Factura electrónica generada',
          html: `
            <p>La factura ha sido enviada a la DIAN para su validación.</p>
            <p>CUFE: <strong>2A3B17E4F8C9D0B5A6C7D8E9F0A1B2C3</strong></p>
            ${enviarCorreo ? '<p>Se ha enviado una copia al correo del cliente.</p>' : ''}
          `
        });
      }, 2000);
      
      // En una implementación real, aquí iría la llamada a la API
      /*
      const response = await fetch(`/api/ventas/${facturaId}/factura-electronica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          responsableFiscal,
          regimenFiscal,
          enviarCorreo
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar la factura electrónica');
      }
      
      const resultado = await response.json();
      */
      
    } catch (error) {
      console.error('Error al generar factura electrónica:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al generar la factura electrónica'
      });
    }
  }

  // Sistema de notificaciones Toast mejorado
  function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
      success: 'check-circle',
      error: 'times-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    
    toast.innerHTML = `
      <i class="fas fa-${iconMap[type]}"></i>
      <div class="toast-message">${message}</div>
      <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 6000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  async function exportarExcel() {
    try {
      // Obtener las fechas de filtro
      const fechaDesdeStr = document.getElementById('filtro-fecha-desde').value;
      const fechaHastaStr = document.getElementById('filtro-fecha-hasta').value;
      const clienteId = document.getElementById('filtro-cliente').value;
      const estado = document.getElementById('filtro-estado').value;
      const numero = document.getElementById('filtro-numero').value;
      
      // Validar que no se estén solicitando fechas futuras
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Final del día de hoy
      const fechaHoyString = hoy.toISOString().split('T')[0];
      
      if (fechaDesdeStr && fechaDesdeStr > fechaHoyString) {
        Swal.fire({
          icon: 'warning',
          title: 'Fecha inválida',
          text: 'No puede seleccionar una fecha futura como fecha inicial'
        });
        return;
      }
      
      if (fechaHastaStr && fechaHastaStr > fechaHoyString) {
        Swal.fire({
          icon: 'warning',
          title: 'Fecha inválida',
          text: 'No puede seleccionar una fecha futura como fecha final'
        });
        return;
      }

      // Convertir fechas para uso local en comparaciones
      const fechaDesde = fechaDesdeStr ? new Date(fechaDesdeStr) : null;
      const fechaHasta = fechaHastaStr ? new Date(fechaHastaStr) : null;
      
      // Ajustar las horas para incluir el día completo
      if (fechaDesde) {
        fechaDesde.setHours(0, 0, 0, 0); // Inicio del día
      }
      
      if (fechaHasta) {
        fechaHasta.setHours(23, 59, 59, 999); // Final del día
      }

      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando',
        text: 'Generando archivo Excel...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Obtener todas las facturas o facturas filtradas
      let facturas;
      
      // Si hay filtro de fecha, primero obtenemos los datos sin filtrar y luego filtramos en el cliente
      if (fechaDesde || fechaHasta) {
        // Construir URL sin filtros de fecha para obtener datos y filtrarlos manualmente
        let url = '/api/ventas';
        const params = new URLSearchParams();
        
        if (clienteId) params.append('cliente_id', clienteId);
        if (estado) params.append('estado', estado);
        if (numero) params.append('numero', numero);
        
        const queryParams = params.toString();
        if (queryParams) {
          url = `${url}?${queryParams}`;
        }
        
        console.log('Obteniendo todas las facturas para filtrar manualmente por fecha:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al obtener los datos para exportar');
        }
        
        const todasFacturas = await response.json();
        console.log(`Recibidas ${todasFacturas.length} facturas del servidor antes de filtrar por fecha`);
        
        // Filtrar manualmente por fecha
        facturas = todasFacturas.filter(factura => {
          const fechaFactura = new Date(factura.fecha);
          fechaFactura.setHours(0, 0, 0, 0); // Normalizar a inicio del día
          
          // Verificar si la fecha de la factura está dentro del rango
          const cumpleFechaDesde = !fechaDesde || fechaFactura >= fechaDesde;
          const cumpleFechaHasta = !fechaHasta || fechaFactura <= fechaHasta;
          
          const cumpleFiltro = cumpleFechaDesde && cumpleFechaHasta;
          
          if (!cumpleFiltro && (fechaDesde || fechaHasta)) {
            console.log(`Factura ${factura.numero} con fecha ${factura.fecha} EXCLUIDA`);
            if (fechaDesde) {
              console.log(`  - Filtro desde: ${fechaDesdeStr}, fecha factura >= fecha desde: ${fechaFactura >= fechaDesde}`);
            }
            if (fechaHasta) {
              console.log(`  - Filtro hasta: ${fechaHastaStr}, fecha factura <= fecha hasta: ${fechaFactura <= fechaHasta}`);
            }
          }
          
          return cumpleFiltro;
        });
        
        console.log(`Después de filtrar por fecha, quedan ${facturas.length} facturas`);
      } else {
        // Si no hay filtro de fecha, usamos la API normalmente
        let url = '/api/ventas';
        const params = new URLSearchParams();
        
        if (clienteId) params.append('cliente_id', clienteId);
        if (estado) params.append('estado', estado);
        if (numero) params.append('numero', numero);
        
        const queryParams = params.toString();
        if (queryParams) {
          url = `${url}?${queryParams}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al obtener los datos para exportar');
        }
        
        facturas = await response.json();
      }
      
      // Si no hay facturas después del filtrado
      if (facturas.length === 0) {
        Swal.close();
        Swal.fire({
          icon: 'info',
          title: 'Sin datos',
          text: 'No hay facturas para los filtros seleccionados'
        });
        return;
      }
      
      // Verificación adicional: mostrar fechas de las facturas primeras y últimas
      if (facturas.length > 0) {
        const primerFactura = facturas[0];
        const ultimaFactura = facturas[facturas.length - 1];
        console.log(`Primera factura: ${primerFactura.numero}, fecha: ${new Date(primerFactura.fecha).toLocaleString()}`);
        console.log(`Última factura: ${ultimaFactura.numero}, fecha: ${new Date(ultimaFactura.fecha).toLocaleString()}`);
      }
      
      // Preparar los datos para Excel
      const datosExcel = facturas.map(factura => {
        // Para asegurar que las fechas se muestren correctamente en el Excel
        const fechaFactura = new Date(factura.fecha);
        // Formatear fecha manualmente para evitar problemas con zonas horarias
        const dia = fechaFactura.getDate().toString().padStart(2, '0');
        const mes = (fechaFactura.getMonth() + 1).toString().padStart(2, '0');
        const anio = fechaFactura.getFullYear();
        const fechaFormateada = `${dia}/${mes}/${anio}`;
        
        return {
          'Número': factura.numero,
          'Fecha': fechaFormateada,
          'Cliente': factura.cliente ? factura.cliente.nombre : 'Cliente general',
          'Documento': factura.cliente ? factura.cliente.documento : '',
          'Total': parseFloat(factura.total).toFixed(2),
          'Estado': factura.estado.toUpperCase(),
          'Método de Pago': factura.metodo_pago || 'No especificado',
          'Vendedor': factura.usuario ? factura.usuario.nombre_completo : 'No especificado'
        };
      });
      
      // Obtener las fechas de filtro para el nombre del archivo
      let nombreArchivo = 'facturas';
      
      if (fechaDesdeStr && fechaHastaStr) {
        nombreArchivo = `ventas_${fechaDesdeStr}_a_${fechaHastaStr}`;
      } else if (fechaDesdeStr) {
        nombreArchivo = `ventas_desde_${fechaDesdeStr}`;
      } else if (fechaHastaStr) {
        nombreArchivo = `ventas_hasta_${fechaHastaStr}`;
      }
      
      // Crear el libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      
      // Añadir estilos básicos (anchos de columna)
      const wscols = [
        { width: 15 }, // Número
        { width: 15 }, // Fecha
        { width: 30 }, // Cliente
        { width: 20 }, // Documento
        { width: 15 }, // Total
        { width: 15 }, // Estado
        { width: 20 }, // Método de Pago
        { width: 25 }  // Vendedor
      ];
      ws['!cols'] = wscols;
      
      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      
      // Generar el archivo y descargarlo
      XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
      
      // Cerrar el indicador de carga
      Swal.close();
      
      // Mostrar mensaje de éxito con el número exacto de facturas filtradas
      showToast(`Archivo Excel generado con ${facturas.length} facturas`, 'success');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el archivo Excel: ' + error.message
      });
    }
  }
});