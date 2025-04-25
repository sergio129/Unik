/**
 * Gestión de Clientes - JavaScript
 * Script para la página de gestión de clientes
 */

document.addEventListener('DOMContentLoaded', function() {
  // Variables globales
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  let tablaClientes;
  let clienteActual = null;
  let filtroActual = "activos"; // Por defecto, mostrar solo clientes activos

  // Elementos del DOM
  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
  const btnBuscarCliente = document.getElementById('btn-buscar-cliente');
  const busquedaCliente = document.getElementById('busqueda-cliente');
  const formCliente = document.getElementById('form-cliente');
  const btnGuardarCliente = document.getElementById('btn-guardar-cliente');
  const filtroEstado = document.getElementById('filtro-estado');
  
  // Inicialización
  inicializarTabla();
  cargarClientes();
  inicializarEventos();
  
  // Funciones principales
  function inicializarEventos() {
    btnNuevoCliente.addEventListener('click', abrirModalNuevoCliente);
    btnBuscarCliente.addEventListener('click', buscarClientes);
    busquedaCliente.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        buscarClientes();
      }
    });
    btnGuardarCliente.addEventListener('click', guardarCliente);
    
    // Evento para cambiar el filtro de estado
    filtroEstado.addEventListener('change', function() {
      filtroActual = this.value;
      cargarClientes();
    });
  }
  
  function inicializarTabla() {
    tablaClientes = $('#tabla-clientes').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
      },
      columns: [
        { data: 'id' },
        { data: 'nombre' },
        { 
          data: null,
          render: function(data) {
            return data.documento ? 
              (data.tipo_documento || '') + ' ' + data.documento : 
              '-';
          }
        },
        { data: 'telefono', defaultContent: '-' },
        { data: 'email', defaultContent: '-' },
        { 
          data: 'activo',
          render: function(data) {
            return data ? 
              '<span class="badge bg-success">Activo</span>' : 
              '<span class="badge bg-danger">Inactivo</span>';
          }
        },
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: function(data) {
            const btnEditar = `<button class="btn btn-sm btn-info me-1 btn-editar" data-id="${data.id}"><i class="fas fa-edit"></i></button>`;
            const btnEstado = data.activo ?
              `<button class="btn btn-sm btn-danger btn-desactivar" data-id="${data.id}"><i class="fas fa-ban"></i></button>` :
              `<button class="btn btn-sm btn-success btn-activar" data-id="${data.id}"><i class="fas fa-check"></i></button>`;
            
            return btnEditar + btnEstado;
          }
        }
      ],
      order: [[1, 'asc']], // Ordenar por nombre
      responsive: true,
      pageLength: 10,
      dom: 'Bfrtip',
      buttons: [
        {
          extend: 'excel',
          text: '<i class="fas fa-file-excel me-1"></i> Excel',
          className: 'btn btn-success'
        },
        {
          extend: 'pdf',
          text: '<i class="fas fa-file-pdf me-1"></i> PDF',
          className: 'btn btn-danger'
        },
        {
          extend: 'print',
          text: '<i class="fas fa-print me-1"></i> Imprimir',
          className: 'btn btn-primary'
        }
      ]
    });
    
    // Evento para editar cliente
    $('#tabla-clientes tbody').on('click', '.btn-editar', function() {
      const id = $(this).data('id');
      editarCliente(id);
    });
    
    // Evento para desactivar cliente
    $('#tabla-clientes tbody').on('click', '.btn-desactivar', function() {
      const id = $(this).data('id');
      cambiarEstadoCliente(id, false);
    });
    
    // Evento para activar cliente
    $('#tabla-clientes tbody').on('click', '.btn-activar', function() {
      const id = $(this).data('id');
      cambiarEstadoCliente(id, true);
    });
  }
  
  // Funciones para clientes
  async function cargarClientes() {
    try {
      // Determinar si incluir clientes inactivos según el filtro seleccionado
      let urlParams = '';
      
      if (filtroActual === 'todos') {
        urlParams = '?includeInactivos=true';
      } else if (filtroActual === 'inactivos') {
        urlParams = '?soloInactivos=true';
      }
      
      const response = await fetch(`/api/clientes${urlParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      
      let clientes = await response.json();
      
      // Validar el estado de los clientes según el filtro seleccionado
      if (filtroActual === 'inactivos') {
        console.log('Filtrando inactivos. Clientes recibidos:', clientes.length);
        
        // Forzar el estado a inactivo para clientes en el filtro "Solo Inactivos"
        // Esto garantiza que se muestren correctamente como inactivos aunque vengan con otro valor
        clientes = clientes.map(cliente => {
          return {
            ...cliente,
            activo: false // Forzar estado inactivo cuando se usa el filtro "Solo Inactivos"
          };
        });
        
        console.log('Clientes después de forzar estado inactivo:', clientes);
      }
      
      // Actualizar tabla
      tablaClientes.clear().rows.add(clientes).draw();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los clientes'
      });
    }
  }
  
  async function buscarClientes() {
    const termino = busquedaCliente.value.trim();
    
    if (!termino) {
      cargarClientes();
      return;
    }
    
    try {
      // Mostrar indicador de carga
      tablaClientes.clear().draw();
      $('#tabla-clientes tbody').html('<tr><td colspan="7" class="text-center">Buscando clientes...</td></tr>');
      
      // Construir la URL según el filtro seleccionado
      let url = `/api/clientes/search?buscar=${encodeURIComponent(termino)}&limit=8`;
      
      // Añadir parámetro según el filtro actual
      if (filtroActual === 'todos') {
        url += '&includeInactivos=true';
      } else if (filtroActual === 'inactivos') {
        url += '&soloInactivos=true';
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al buscar clientes');
      }
      
      const resultado = await response.json();
      let clientes = resultado.data || [];
      
      // Forzar estado inactivo cuando se está usando el filtro de inactivos
      if (filtroActual === 'inactivos') {
        console.log('Búsqueda con filtro inactivos. Clientes recibidos:', clientes.length);
        
        clientes = clientes.map(cliente => {
          return {
            ...cliente,
            activo: false // Forzar estado inactivo en la vista
          };
        });
        
        console.log('Clientes después de forzar estado inactivo en búsqueda:', clientes);
      }
      
      // Actualizar tabla
      tablaClientes.clear().rows.add(clientes).draw();
      
      // Mostrar mensaje si no hay resultados
      if (clientes.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontraron clientes con ese criterio de búsqueda'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al buscar clientes'
      });
    }
  }
  
  function abrirModalNuevoCliente() {
    // Limpiar formulario y datos previos
    formCliente.reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('cliente-activo').checked = true;
    clienteActual = null;
    
    // Cambiar título del modal
    document.getElementById('modalClienteTitulo').textContent = 'Nuevo Cliente';
    
    // Mostrar modal
    const modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));
    modalCliente.show();
  }
  
  async function editarCliente(id) {
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener datos del cliente');
      }
      
      clienteActual = await response.json();
      
      // Llenar formulario
      document.getElementById('cliente-id').value = clienteActual.id;
      document.getElementById('cliente-nombre').value = clienteActual.nombre || '';
      document.getElementById('cliente-tipo-documento').value = clienteActual.tipo_documento || 'CC';
      document.getElementById('cliente-documento').value = clienteActual.documento || '';
      document.getElementById('cliente-direccion').value = clienteActual.direccion || '';
      document.getElementById('cliente-telefono').value = clienteActual.telefono || '';
      document.getElementById('cliente-email').value = clienteActual.email || '';
      document.getElementById('cliente-activo').checked = clienteActual.activo;
      
      // Cambiar título del modal
      document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
      
      // Mostrar modal
      const modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));
      modalCliente.show();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos del cliente'
      });
    }
  }
  
  async function guardarCliente() {
    // Obtener datos del formulario
    const id = document.getElementById('cliente-id').value;
    const nombre = document.getElementById('cliente-nombre').value.trim();
    const tipoDocumento = document.getElementById('cliente-tipo-documento').value;
    const documento = document.getElementById('cliente-documento').value.trim();
    const direccion = document.getElementById('cliente-direccion').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const email = document.getElementById('cliente-email').value.trim();
    const activo = document.getElementById('cliente-activo').checked;
    
    // Limpiar mensajes de error previos
    clearValidationErrors();
    
    // Validar datos
    let hasError = false;
    
    if (!nombre) {
      showValidationError('cliente-nombre', 'El nombre del cliente es obligatorio');
      hasError = true;
    }
    
    if (!documento) {
      showValidationError('cliente-documento', 'El número de documento es obligatorio');
      hasError = true;
    }
    
    if (email && !validarEmail(email)) {
      showValidationError('cliente-email', 'El formato del correo electrónico no es válido');
      hasError = true;
    }
    
    if (hasError) {
      return; // Detener el proceso si hay errores
    }
    
    // Preparar datos para enviar
    const datosCliente = {
      nombre,
      tipo_documento: tipoDocumento,
      documento,
      direccion,
      telefono,
      email,
      activo
    };
    
    try {
      let url, method;
      
      if (id) {
        // Actualizar cliente existente
        url = `/api/clientes/${id}`;
        method = 'PUT';
      } else {
        // Crear nuevo cliente
        url = '/api/clientes';
        method = 'POST';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosCliente)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al guardar el cliente');
      }
      
      const resultado = await response.json();
      
      // Cerrar modal
      bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
      
      // Actualizar tabla
      cargarClientes();
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Cliente guardado',
        text: 'Los datos del cliente han sido guardados exitosamente',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error('Error:', error);
      showValidationError('general', error.message || 'Error al guardar el cliente');
    }
  }
  
  async function cambiarEstadoCliente(id, nuevoEstado) {
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    try {
      // Confirmar acción
      const confirmar = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} cliente?`,
        text: `¿Está seguro de que desea ${accion} este cliente?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      });
      
      if (!confirmar.isConfirmed) {
        return;
      }
      
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Procesando...',
        text: `${accion.charAt(0).toUpperCase() + accion.slice(1)}ando cliente`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Primero, obtener los datos actuales del cliente para asegurar que tenemos toda la información necesaria
      const clienteResponse = await fetch(`/api/clientes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!clienteResponse.ok) {
        throw new Error(`Error al obtener datos del cliente para ${accion}`);
      }
      
      // Obtener datos actuales del cliente
      const clienteExistente = await clienteResponse.json();
      
      // Preparar datos para enviar (manteniendo datos requeridos y actualizando solo el estado)
      const datosActualizar = {
        nombre: clienteExistente.nombre, // Mantener el nombre existente
        activo: nuevoEstado // Actualizar solo el estado
      };
      
      // Guardar cambios
      const updateResponse = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosActualizar)
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || `Error al ${accion} el cliente`);
      }
      
      // Obtener la respuesta actualizada
      const clienteActualizado = await updateResponse.json();
      console.log('Cliente actualizado:', clienteActualizado);
      
      // Actualizar directamente la fila en la tabla
      const rowIndex = tablaClientes.rows().indexes().filter((idx) => {
        return tablaClientes.row(idx).data().id === id;
      });
      
      if (rowIndex.length > 0) {
        // Obtener datos actuales de la fila
        const currentData = tablaClientes.row(rowIndex[0]).data();
        
        // Actualizar solo el campo activo
        currentData.activo = nuevoEstado;
        
        // Actualizar la fila en la tabla
        tablaClientes.row(rowIndex[0]).data(currentData).draw(false);
        console.log('Fila actualizada en la tabla:', currentData);
      } else {
        console.log('No se encontró la fila en la tabla, recargando todos los clientes');
        cargarClientes();
      }
      
      // Cerrar indicador de carga y mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Cliente actualizado',
        text: `El cliente ha sido ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || `Error al ${accion} el cliente`
      });
    }
  }
  
  // Funciones auxiliares
  function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function showValidationError(fieldId, message) {
    if (fieldId === 'general') {
      // Crear un mensaje de error general en la parte superior del formulario
      const formElement = document.getElementById('form-cliente');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger validation-error mb-3';
      errorDiv.textContent = message;
      formElement.prepend(errorDiv);
      return;
    }
    
    const inputElement = document.getElementById(fieldId);
    inputElement.classList.add('is-invalid');
    
    // Crear mensaje de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    // Insertar mensaje después del campo
    inputElement.parentNode.appendChild(errorDiv);
    
    // Hacer scroll al primer campo con error
    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearValidationErrors() {
    // Eliminar todos los mensajes de error previos
    document.querySelectorAll('.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
    
    document.querySelectorAll('.invalid-feedback').forEach(el => {
      el.remove();
    });
    
    document.querySelectorAll('.validation-error').forEach(el => {
      el.remove();
    });
  }
});