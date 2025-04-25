/**
 * Dashboard de Pedidos - Gráficos y KPIs
 * Este archivo contiene la lógica para visualizar gráficos de pedidos y KPIs importantes
 */

// Variables para los gráficos
let tendenciaChart;
let estadoChart;
let proveedorChart;
let dashboardMinimized = false;

// Colores para los gráficos
const COLORES = {
    pendiente: 'rgba(255, 193, 7, 0.8)',
    en_proceso: 'rgba(23, 162, 184, 0.8)',
    completado: 'rgba(40, 167, 69, 0.8)',
    cancelado: 'rgba(220, 53, 69, 0.8)',
    proveedor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(255, 99, 132, 0.8)'
    ]
};

// Inicialización cuando el documento está listo
$(document).ready(function() {
    console.log('Inicializando dashboard de pedidos...');
    
    // Crear gráficos iniciales con datos de carga
    inicializarGraficos();
    
    // Cargar datos para los gráficos
    cargarDatosDashboard();
    
    // Configurar eventos
    $('#toggle-dashboard').on('click', toggleDashboard);
});

/**
 * Inicializa los gráficos con datos de carga
 */
function inicializarGraficos() {
    // Gráfico de tendencia (línea)
    const ctxTendencia = document.getElementById('pedidos-tendencia-chart').getContext('2d');
    tendenciaChart = new Chart(ctxTendencia, {
        type: 'line',
        data: {
            labels: ['Cargando...'],
            datasets: [{
                label: 'Pedidos',
                data: [0],
                borderColor: COLORES.en_proceso,
                backgroundColor: 'rgba(23, 162, 184, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Gráfico de estado (doughnut)
    const ctxEstado = document.getElementById('pedidos-estado-chart').getContext('2d');
    estadoChart = new Chart(ctxEstado, {
        type: 'doughnut',
        data: {
            labels: ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    COLORES.pendiente,
                    COLORES.en_proceso,
                    COLORES.completado,
                    COLORES.cancelado
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12
                    }
                }
            }
        }
    });
    
    // Gráfico de proveedores (bar)
    const ctxProveedor = document.getElementById('pedidos-proveedor-chart').getContext('2d');
    proveedorChart = new Chart(ctxProveedor, {
        type: 'bar',
        data: {
            labels: ['Cargando...'],
            datasets: [{
                label: 'Pedidos',
                data: [0],
                backgroundColor: COLORES.proveedor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Carga los datos para los gráficos y KPIs
 */
function cargarDatosDashboard() {
    // Mostrar indicadores de carga
    $('.chart-container').addClass('loading');
    
    // Cargar tendencia de pedidos (30 días)
    fetch('/api/pedidos/estadisticas/tendencia', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data.tendencia) {
            actualizarGraficoTendencia(data.data.tendencia);
        }
    })
    .catch(error => {
        console.error('Error al cargar tendencia de pedidos:', error);
    });
    
    // Cargar distribución por estado
    fetch('/api/pedidos/estadisticas/por-estado', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data.porEstado) {
            actualizarGraficoEstado(data.data.porEstado);
        }
    })
    .catch(error => {
        console.error('Error al cargar distribución por estado:', error);
    });
    
    // Cargar distribución por proveedor (top 5)
    fetch('/api/pedidos/estadisticas/por-proveedor?limit=5', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data.porProveedor) {
            actualizarGraficoProveedor(data.data.porProveedor);
        }
    })
    .catch(error => {
        console.error('Error al cargar distribución por proveedor:', error);
    });
    
    // Cargar KPIs adicionales
    fetch('/api/pedidos/estadisticas/kpis', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            actualizarKPIs(data.data);
        }
    })
    .catch(error => {
        console.error('Error al cargar KPIs:', error);
    });
}

/**
 * Actualiza el gráfico de tendencia con los datos recibidos
 */
function actualizarGraficoTendencia(datos) {
    // Ordenar datos por fecha
    datos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    // Extraer etiquetas (fechas) y valores (totales)
    const labels = datos.map(item => moment(item.fecha).format('DD/MM'));
    const values = datos.map(item => item.total);
    
    // Actualizar el gráfico
    tendenciaChart.data.labels = labels;
    tendenciaChart.data.datasets[0].data = values;
    tendenciaChart.update();
    
    // Quitar indicador de carga
    $('#pedidos-tendencia-chart').closest('.chart-container').removeClass('loading');
}

/**
 * Actualiza el gráfico de distribución por estado
 */
function actualizarGraficoEstado(datos) {
    // Asegurarse de que tenemos todos los estados
    const estadosCompletos = {
        pendiente: 0,
        en_proceso: 0,
        completado: 0,
        cancelado: 0
    };
    
    // Actualizar valores de estados existentes
    datos.forEach(item => {
        if (estadosCompletos.hasOwnProperty(item.estado)) {
            estadosCompletos[item.estado] = item.total;
        }
    });
    
    // Extraer valores en el orden correcto
    const values = [
        estadosCompletos.pendiente,
        estadosCompletos.en_proceso,
        estadosCompletos.completado,
        estadosCompletos.cancelado
    ];
    
    // Actualizar el gráfico
    estadoChart.data.datasets[0].data = values;
    estadoChart.update();
    
    // Quitar indicador de carga
    $('#pedidos-estado-chart').closest('.chart-container').removeClass('loading');
}

/**
 * Actualiza el gráfico de distribución por proveedor
 */
function actualizarGraficoProveedor(datos) {
    // Limitar a los top 5 si hay más
    const limiteDatos = datos.length > 5 ? datos.slice(0, 5) : datos;
    
    // Extraer etiquetas (nombres) y valores (totales)
    const labels = limiteDatos.map(item => item.nombre_proveedor);
    const values = limiteDatos.map(item => item.total);
    
    // Actualizar el gráfico
    proveedorChart.data.labels = labels;
    proveedorChart.data.datasets[0].data = values;
    proveedorChart.update();
    
    // Quitar indicador de carga
    $('#pedidos-proveedor-chart').closest('.chart-container').removeClass('loading');
}

/**
 * Actualiza los KPIs adicionales
 */
function actualizarKPIs(datos) {
    // Actualizar los valores en la interfaz
    $('#kpi-tiempo-promedio').text(datos.tiempoPromedio + ' días');
    $('#kpi-tasa-cumplimiento').text(datos.tasaCumplimiento + '%');
    $('#kpi-proximas-entregas').text(datos.proximasEntregas);
    $('#kpi-pedidos-retrasados').text(datos.pedidosRetrasados);
}

/**
 * Alterna entre mostrar y ocultar el dashboard
 */
function toggleDashboard() {
    const dashboardContent = $('#dashboard-content');
    const toggleButton = $('#toggle-dashboard i');
    
    dashboardMinimized = !dashboardMinimized;
    
    if (dashboardMinimized) {
        dashboardContent.slideUp();
        toggleButton.removeClass('fa-compress-alt').addClass('fa-expand-alt');
        $('#toggle-dashboard').attr('title', 'Expandir dashboard');
    } else {
        dashboardContent.slideDown();
        toggleButton.removeClass('fa-expand-alt').addClass('fa-compress-alt');
        $('#toggle-dashboard').attr('title', 'Minimizar dashboard');
        
        // Actualizar los gráficos al expandir (pueden necesitar redimensionarse)
        setTimeout(() => {
            if (tendenciaChart) tendenciaChart.resize();
            if (estadoChart) estadoChart.resize();
            if (proveedorChart) proveedorChart.resize();
        }, 300);
    }
}

/**
 * Obtiene el token de autenticación del localStorage
 */
function getToken() {
    return localStorage.getItem('token');
}