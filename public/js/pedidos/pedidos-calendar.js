/**
 * Módulo de vista de calendario para pedidos
 * Este archivo implementa una vista de calendario para visualizar los pedidos por fecha de entrega
 */

// Variables globales
let calendar;
let filtrosEstados = {
    pendiente: true,
    en_proceso: true,
    completado: false,
    cancelado: false
};
let pedidosData = []; // Almacena los datos de pedidos para el calendario

// Inicialización cuando el documento está listo
$(document).ready(function() {
    console.log('Inicializando vista de calendario de pedidos...');
    
    // Inicializar calendario
    initCalendar();
    
    // Configurar botones para cambiar entre vista de tabla y calendario
    $('#btn-vista-tabla').on('click', function() {
        $(this).addClass('active');
        $('#btn-vista-calendario').removeClass('active');
        $('#vista-tabla').show();
        $('#vista-calendario').hide();
    });
    
    $('#btn-vista-calendario').on('click', function() {
        $(this).addClass('active');
        $('#btn-vista-tabla').removeClass('active');
        $('#vista-tabla').hide();
        $('#vista-calendario').show();
        
        // Redimensionar calendario cuando se muestra (soluciona problema de tamaño)
        if (calendar) {
            calendar.render();
        }
    });
    
    // Configurar filtros de estado para el calendario
    $('.calendar-filters input[type="checkbox"]').on('change', function() {
        const estado = $(this).val();
        filtrosEstados[estado] = $(this).prop('checked');
        actualizarEventosCalendario();
    });
    
    // Configurar botones de navegación del calendario
    $('#calendar-prev').on('click', function() {
        calendar.prev();
    });
    
    $('#calendar-today').on('click', function() {
        calendar.today();
    });
    
    $('#calendar-next').on('click', function() {
        calendar.next();
    });
    
    // Escuchar evento personalizado para actualizar calendario cuando cambien los datos de pedidos
    document.addEventListener('pedidosActualizados', function(e) {
        if (e.detail) {
            console.log('Actualizando datos de calendario con nuevos pedidos', e.detail.length);
            pedidosData = e.detail;
            actualizarEventosCalendario();
        }
    });
    
    // Exponer la funcionalidad a través de window para que pedidos.js pueda interactuar
    window.pedidosCalendario = {
        actualizarDatos: function(datos) {
            pedidosData = datos;
            actualizarEventosCalendario();
        }
    };
});

/**
 * Inicializa el calendario FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('pedidos-calendar');
    
    if (!calendarEl) {
        console.error('No se encontró el elemento del calendario');
        return;
    }
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'dayGridMonth',
        headerToolbar: false, // Usamos nuestra propia toolbar
        themeSystem: 'bootstrap5',
        height: 'auto',
        dayMaxEventRows: true,
        views: {
            dayGrid: {
                dayMaxEventRows: 4 // Limitar número de eventos visibles por día
            }
        },
        eventClick: function(info) {
            // Al hacer clic en un evento (pedido), mostramos sus detalles
            const pedidoId = info.event.id;
            if (pedidoId && typeof verDetallePedido === 'function') {
                verDetallePedido(pedidoId);
            }
        },
        dateClick: function(info) {
            // Al hacer clic en una fecha, filtrar por esa fecha en la vista de tabla
            const fecha = moment(info.date).format('YYYY-MM-DD');
            $('#filter-fecha-inicio').val(fecha);
            $('#filter-fecha-fin').val(fecha);
            
            // Mostrar notificación informativa
            showNotification(`Mostrando pedidos para ${moment(info.date).format('DD/MM/YYYY')}`, 'info');
            
            // Cambiar a vista de tabla y aplicar filtro
            $('#btn-vista-tabla').trigger('click');
            filtrarPedidos();
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
        },
        eventDidMount: function(info) {
            // Añadir tooltip a los eventos para mostrar más información
            const pedido = pedidosData.find(p => p.id == info.event.id);
            if (pedido) {
                const proveedor = proveedoresDisponibles.find(p => p.id === pedido.proveedor_id);
                const nombreProveedor = proveedor ? proveedor.nombre : `Proveedor ID: ${pedido.proveedor_id}`;
                
                const tooltip = `
                    <div class="fc-event-tooltip">
                        <b>${pedido.codigo}</b><br>
                        Proveedor: ${nombreProveedor}<br>
                        Estado: ${formatEstado(pedido.estado)}<br>
                        Prioridad: ${formatPrioridad(pedido.prioridad)}
                    </div>
                `;
                
                $(info.el).tooltip({
                    title: tooltip,
                    html: true,
                    placement: 'top',
                    container: 'body'
                });
            }
        }
    });
    
    calendar.render();
}

/**
 * Actualiza los eventos del calendario según los datos de pedidos y los filtros aplicados
 */
function actualizarEventosCalendario() {
    if (!calendar) {
        console.error('El calendario no está inicializado');
        return;
    }
    
    // Limpiar eventos existentes
    calendar.removeAllEvents();
    
    // Si no hay datos, no seguir
    if (!pedidosData || !Array.isArray(pedidosData) || pedidosData.length === 0) {
        return;
    }
    
    // Filtrar y transformar los pedidos en eventos para el calendario
    const eventos = pedidosData
        .filter(pedido => {
            // Filtrar según estado
            return filtrosEstados[pedido.estado] === true && pedido.fecha_entrega_estimada;
        })
        .map(pedido => {
            // Configurar color según el estado
            let backgroundColor = '#6c757d'; // Gris por defecto
            let borderColor = '#5a6268';
            let textColor = '#fff';
            
            switch (pedido.estado) {
                case 'pendiente':
                    backgroundColor = '#ffc107'; // Amarillo
                    borderColor = '#e0a800';
                    textColor = '#212529';
                    break;
                case 'en_proceso':
                    backgroundColor = '#17a2b8'; // Celeste
                    borderColor = '#138496';
                    break;
                case 'completado':
                    backgroundColor = '#28a745'; // Verde
                    borderColor = '#218838';
                    break;
                case 'cancelado':
                    backgroundColor = '#dc3545'; // Rojo
                    borderColor = '#c82333';
                    break;
            }
            
            // Configurar clasificación visual según prioridad
            let classNames = [];
            switch (pedido.prioridad) {
                case 'urgente':
                    classNames.push('evento-prioridad-urgente');
                    break;
                case 'alta':
                    classNames.push('evento-prioridad-alta');
                    break;
            }
            
            // Buscar nombre del proveedor
            const proveedor = proveedoresDisponibles.find(p => p.id === pedido.proveedor_id);
            const nombreProveedor = proveedor ? proveedor.nombre : `Proveedor ID: ${pedido.proveedor_id}`;
            
            // Crear el evento
            return {
                id: pedido.id,
                title: `${pedido.codigo} - ${nombreProveedor.substring(0, 15)}${nombreProveedor.length > 15 ? '...' : ''}`,
                start: pedido.fecha_entrega_estimada,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                textColor: textColor,
                classNames: classNames,
                allDay: true,
                extendedProps: {
                    estado: pedido.estado,
                    prioridad: pedido.prioridad
                }
            };
        });
    
    // Añadir eventos al calendario
    calendar.addEventSource(eventos);
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