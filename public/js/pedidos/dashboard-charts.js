/**
 * Dashboard Gráfico para Pedidos
 * Este archivo gestiona los gráficos y visualizaciones del dashboard de pedidos
 */

// Variables globales
let pedidosTendenciaChart;
let pedidosEstadoChart;
let pedidosProveedorChart;
let dashboardData = {
    tendencia: [],
    estados: {},
    proveedores: {}
};
let dashboardExpanded = true;

// Inicialización cuando el documento está listo
$(document).ready(function() {
    console.log('Inicializando dashboard de pedidos...');
    
    // Configurar evento para botón de minimizar/maximizar
    $('#toggle-dashboard').on('click', function() {
        toggleDashboard();
    });
    
    // Inicializar gráficos vacíos
    initializeCharts();
    
    // Cargar datos para el dashboard
    loadDashboardData();
});

/**
 * Inicializa los gráficos con configuraciones base
 */
function initializeCharts() {
    // Gráfico de Tendencia de Pedidos (últimos 30 días)
    const tendenciaCtx = document.getElementById('pedidos-tendencia-chart').getContext('2d');
    
    pedidosTendenciaChart = new Chart(tendenciaCtx, {
        type: 'line',
        data: {
            labels: Array(30).fill().map((_, i) => moment().subtract(29 - i, 'days').format('DD/MM')),
            datasets: [{
                label: 'Nuevos Pedidos',
                data: Array(30).fill(0),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return 'Fecha: ' + context[0].label;
                        }
                    }
                }
            }
        }
    });
    
    // Gráfico de Estado de Pedidos
    const estadoCtx = document.getElementById('pedidos-estado-chart').getContext('2d');
    
    pedidosEstadoChart = new Chart(estadoCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'En Proceso', 'Completados', 'Cancelados'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#ffc107', // Amarillo para pendientes
                    '#17a2b8', // Azul para en proceso
                    '#28a745', // Verde para completados
                    '#dc3545'  // Rojo para cancelados
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${value} pedidos (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Gráfico de Principales Proveedores
    const proveedorCtx = document.getElementById('pedidos-proveedor-chart').getContext('2d');
    
    pedidosProveedorChart = new Chart(proveedorCtx, {
        type: 'bar',
        data: {
            labels: ['Cargando...'],
            datasets: [{
                label: 'Pedidos',
                data: [0],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Carga los datos del dashboard desde la API
 */
function loadDashboardData() {
    // Mostrar indicador de carga en cada gráfico
    showLoadingOnCharts();
    
    // 1. Cargar datos para tendencia de pedidos (últimos 30 días)
    loadPedidosTendencia();
    
    // 2. Cargar datos para distribución de estados
    loadPedidosEstado();
    
    // 3. Cargar datos para principales proveedores
    loadPedidosProveedores();
    
    // 4. Cargar KPIs adicionales
    loadPedidosKPIs();
}

/**
 * Muestra indicador de carga en los gráficos
 */
function showLoadingOnCharts() {
    const loadingDataset = {
        label: 'Cargando datos...',
        data: [],
        backgroundColor: 'rgba(200, 200, 200, 0.3)',
        borderColor: 'rgba(200, 200, 200, 1)'
    };

    // Aplicar a todos los gráficos
    [pedidosTendenciaChart, pedidosEstadoChart, pedidosProveedorChart].forEach(chart => {
        if (chart && chart.data) {
            chart.data.datasets = [loadingDataset];
            chart.update();
        }
    });
}

/**
 * Carga los datos de tendencia de pedidos
 */
function loadPedidosTendencia() {
    const today = moment();
    const thirtyDaysAgo = moment().subtract(30, 'days');
    
    fetch(`/api/pedidos/estadisticas/tendencia?fecha_inicio=${thirtyDaysAgo.format('YYYY-MM-DD')}&fecha_fin=${today.format('YYYY-MM-DD')}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar datos de tendencia');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateTendenciaChart(data.data);
        } else {
            console.error('Error en datos de tendencia:', data.message);
            showChartError(pedidosTendenciaChart, 'No se pudieron cargar los datos');
        }
    })
    .catch(error => {
        console.error('Error al cargar tendencia:', error);
        showChartError(pedidosTendenciaChart, 'Error en la conexión');
    });
}

/**
 * Carga los datos de distribución por estado
 */
function loadPedidosEstado() {
    fetch('/api/pedidos/estadisticas/por-estado', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar datos por estado');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateEstadoChart(data.data);
        } else {
            console.error('Error en datos por estado:', data.message);
            showChartError(pedidosEstadoChart, 'No se pudieron cargar los datos');
        }
    })
    .catch(error => {
        console.error('Error al cargar estados:', error);
        showChartError(pedidosEstadoChart, 'Error en la conexión');
    });
}

/**
 * Carga los datos de principales proveedores
 */
function loadPedidosProveedores() {
    fetch('/api/pedidos/estadisticas/por-proveedor?limit=5', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar datos por proveedor');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateProveedorChart(data.data);
        } else {
            console.error('Error en datos por proveedor:', data.message);
            showChartError(pedidosProveedorChart, 'No se pudieron cargar los datos');
        }
    })
    .catch(error => {
        console.error('Error al cargar proveedores:', error);
        showChartError(pedidosProveedorChart, 'Error en la conexión');
    });
}

/**
 * Carga los KPIs adicionales
 */
function loadPedidosKPIs() {
    fetch('/api/pedidos/estadisticas/kpis', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar KPIs');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateKPIs(data.data);
        } else {
            console.error('Error en datos de KPIs:', data.message);
            // Mostrar mensaje de error en los KPIs
            ['tiempo-promedio', 'tasa-cumplimiento', 'proximas-entregas', 'pedidos-retrasados'].forEach(kpi => {
                $(`#kpi-${kpi}`).html('<span class="text-danger">Error</span>');
            });
        }
    })
    .catch(error => {
        console.error('Error al cargar KPIs:', error);
        // Mostrar mensaje de error en los KPIs
        ['tiempo-promedio', 'tasa-cumplimiento', 'proximas-entregas', 'pedidos-retrasados'].forEach(kpi => {
            $(`#kpi-${kpi}`).html('<span class="text-danger">Error</span>');
        });
    });
}

/**
 * Actualiza el gráfico de tendencia con datos reales
 */
function updateTendenciaChart(data) {
    // Verificar estructura de datos
    if (!data || !data.tendencia || !Array.isArray(data.tendencia)) {
        console.error('Datos de tendencia inválidos:', data);
        showChartError(pedidosTendenciaChart, 'Formato de datos incorrecto');
        return;
    }
    
    // Generar array de últimos 30 días
    const days = Array(30).fill().map((_, i) => {
        const date = moment().subtract(29 - i, 'days');
        return {
            date: date.format('YYYY-MM-DD'),
            label: date.format('DD/MM'),
            count: 0
        };
    });
    
    // Llenar con datos reales
    data.tendencia.forEach(item => {
        const index = days.findIndex(day => day.date === item.fecha);
        if (index >= 0) {
            days[index].count = item.total;
        }
    });
    
    // Actualizar gráfico
    pedidosTendenciaChart.data.labels = days.map(day => day.label);
    pedidosTendenciaChart.data.datasets = [{
        label: 'Nuevos Pedidos',
        data: days.map(day => day.count),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3
    }];
    
    pedidosTendenciaChart.update();
}

/**
 * Actualiza el gráfico de distribución por estado
 */
function updateEstadoChart(data) {
    // Verificar estructura de datos
    if (!data || !data.porEstado || !Array.isArray(data.porEstado)) {
        console.error('Datos de estados inválidos:', data);
        showChartError(pedidosEstadoChart, 'Formato de datos incorrecto');
        return;
    }
    
    // Mapear estados a valores
    const estadosCount = {
        'pendiente': 0,
        'en_proceso': 0,
        'completado': 0,
        'cancelado': 0
    };
    
    data.porEstado.forEach(item => {
        if (estadosCount.hasOwnProperty(item.estado)) {
            estadosCount[item.estado] = item.total;
        }
    });
    
    // Actualizar gráfico
    pedidosEstadoChart.data.datasets[0].data = [
        estadosCount.pendiente,
        estadosCount.en_proceso,
        estadosCount.completado,
        estadosCount.cancelado
    ];
    
    pedidosEstadoChart.update();
}

/**
 * Actualiza el gráfico de proveedores principales
 */
function updateProveedorChart(data) {
    // Verificar estructura de datos
    if (!data || !data.porProveedor || !Array.isArray(data.porProveedor)) {
        console.error('Datos de proveedores inválidos:', data);
        showChartError(pedidosProveedorChart, 'Formato de datos incorrecto');
        return;
    }
    
    // Si no hay datos, mostrar mensaje
    if (data.porProveedor.length === 0) {
        pedidosProveedorChart.data.labels = ['No hay datos'];
        pedidosProveedorChart.data.datasets[0].data = [0];
        pedidosProveedorChart.update();
        return;
    }
    
    // Ordenar por cantidad de pedidos (descendente)
    const sortedProveedores = [...data.porProveedor].sort((a, b) => b.total - a.total);
    
    // Tomar los top 5
    const topProveedores = sortedProveedores.slice(0, 5);
    
    // Generar colores dinámicamente
    const backgroundColor = topProveedores.map((_, i) => {
        const hue = 200 + (i * 30) % 180; // Variación de tonos azules
        return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    // Actualizar gráfico
    pedidosProveedorChart.data.labels = topProveedores.map(item => truncateText(item.nombre_proveedor || `Proveedor ${item.proveedor_id}`, 15));
    pedidosProveedorChart.data.datasets[0].data = topProveedores.map(item => item.total);
    pedidosProveedorChart.data.datasets[0].backgroundColor = backgroundColor;
    
    pedidosProveedorChart.update();
}

/**
 * Actualiza los KPIs con datos reales
 */
function updateKPIs(data) {
    // Verificar estructura de datos
    if (!data) {
        console.error('Datos de KPIs inválidos:', data);
        return;
    }
    
    // Tiempo promedio de pedido
    if (data.tiempoPromedio !== undefined) {
        $('#kpi-tiempo-promedio').text(`${data.tiempoPromedio} días`);
    } else {
        $('#kpi-tiempo-promedio').text('N/A');
    }
    
    // Tasa de cumplimiento
    if (data.tasaCumplimiento !== undefined) {
        $('#kpi-tasa-cumplimiento').text(`${data.tasaCumplimiento}%`);
    } else {
        $('#kpi-tasa-cumplimiento').text('N/A');
    }
    
    // Próximas entregas
    if (data.proximasEntregas !== undefined) {
        $('#kpi-proximas-entregas').text(data.proximasEntregas);
    } else {
        $('#kpi-proximas-entregas').text('N/A');
    }
    
    // Pedidos retrasados
    if (data.pedidosRetrasados !== undefined) {
        $('#kpi-pedidos-retrasados').text(data.pedidosRetrasados);
    } else {
        $('#kpi-pedidos-retrasados').text('N/A');
    }
}

/**
 * Muestra un mensaje de error en un gráfico
 */
function showChartError(chart, message) {
    if (!chart) return;
    
    // Limpiar datos
    chart.data.datasets = [{
        label: 'Error',
        data: [],
        backgroundColor: 'rgba(255, 0, 0, 0.1)'
    }];
    
    // Añadir plugin para mostrar mensaje de error
    chart.options.plugins.title = {
        display: true,
        text: `Error: ${message}`,
        color: '#dc3545',
        font: {
            size: 14,
            weight: 'bold'
        }
    };
    
    chart.update();
}

/**
 * Minimiza o maximiza el contenido del dashboard
 */
function toggleDashboard() {
    const content = $('#dashboard-content');
    const button = $('#toggle-dashboard i');
    
    if (dashboardExpanded) {
        // Minimizar
        content.slideUp(300);
        button.removeClass('fa-compress-alt').addClass('fa-expand-alt');
        $('#toggle-dashboard').attr('title', 'Expandir dashboard');
    } else {
        // Maximizar
        content.slideDown(300);
        button.removeClass('fa-expand-alt').addClass('fa-compress-alt');
        $('#toggle-dashboard').attr('title', 'Minimizar dashboard');
    }
    
    dashboardExpanded = !dashboardExpanded;
}

/**
 * Trunca texto largo a una longitud específica
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

/**
 * Obtiene el token de autenticación del localStorage
 */
function getToken() {
    return localStorage.getItem('token');
}