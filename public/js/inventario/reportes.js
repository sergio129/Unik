/**
 * reportes.js - Sistema de reportes y análisis para el módulo de inventario
 * La UNIKA - Sistema de gestión de inventario
 * 
 * Este archivo maneja la lógica para:
 * - Tendencias de stock
 * - Reportes de productos más/menos vendidos
 * - Análisis de rotación de inventario
 * - Proyecciones de stock basadas en historial
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar DateRangePicker para filtros de fecha
    initDateRangePicker();
    
    // Cargar categorías para el filtro
    loadCategories();

    // Configurar navegación por pestañas
    setupTabNavigation();
    
    // Inicializar filtros
    setupFilters();
    
    // Configurar funcionalidad de exportación
    setupExportButtons();
    
    // Cargar datos iniciales
    loadReportData();
});

// Variables globales para almacenar datos y configuraciones
const reportData = {
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    category: 'all',
    stockTrends: {},
    topProducts: [],
    bottomProducts: [],
    rotationData: {},
    projectionData: {}
};

// Inicializar DateRangePicker
function initDateRangePicker() {
    $('#date-range').daterangepicker({
        startDate: moment().subtract(30, 'days'),
        endDate: moment(),
        ranges: {
           'Hoy': [moment(), moment()],
           'Ayer': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           'Últimos 7 Días': [moment().subtract(6, 'days'), moment()],
           'Últimos 30 Días': [moment().subtract(29, 'days'), moment()],
           'Este Mes': [moment().startOf('month'), moment().endOf('month')],
           'Mes Pasado': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        locale: {
            format: "DD/MM/YYYY",
            separator: " - ",
            applyLabel: "Aplicar",
            cancelLabel: "Cancelar",
            fromLabel: "Desde",
            toLabel: "Hasta",
            customRangeLabel: "Personalizado",
            weekLabel: "S",
            daysOfWeek: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
            monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            firstDay: 1
        }
    });
}

// Cargar categorías para el filtro
function loadCategories() {
    const token = localStorage.getItem('token');
    
    fetch('/api/categorias', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const categorySelect = document.getElementById('category-filter');
            
            // Mantener la opción "Todas"
            categorySelect.innerHTML = '<option value="all">Todas</option>';
            
            // Agregar las categorías al select
            data.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.nombre;
                categorySelect.appendChild(option);
            });
        }
    })
    .catch(error => {
        console.error('Error cargando categorías:', error);
    });
}

// Configurar navegación por pestañas
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Desactivar todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Activar el botón actual
            this.classList.add('active');
            
            // Activar el contenido correspondiente
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Recalcular datos específicos de la pestaña
            if (tabId === 'tab-stock-trends') {
                renderStockTrendChart();
            } else if (tabId === 'tab-top-products') {
                renderTopProductsCharts();
            } else if (tabId === 'tab-rotation') {
                renderRotationCharts();
            } else if (tabId === 'tab-projection') {
                renderProjectionCharts();
            }
        });
    });
}

// Configurar filtros
function setupFilters() {
    // Aplicar filtros
    document.getElementById('apply-filters').addEventListener('click', function() {
        const dateRange = $('#date-range').data('daterangepicker');
        reportData.startDate = dateRange.startDate.format('YYYY-MM-DD');
        reportData.endDate = dateRange.endDate.format('YYYY-MM-DD');
        reportData.category = document.getElementById('category-filter').value;
        
        loadReportData();
    });
    
    // Restablecer filtros
    document.getElementById('reset-filters').addEventListener('click', function() {
        $('#date-range').data('daterangepicker').setStartDate(moment().subtract(30, 'days'));
        $('#date-range').data('daterangepicker').setEndDate(moment());
        document.getElementById('category-filter').value = 'all';
        
        reportData.startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        reportData.endDate = moment().format('YYYY-MM-DD');
        reportData.category = 'all';
        
        loadReportData();
    });
}

// Configurar botones de exportación
function setupExportButtons() {
    // Exportar a PDF
    document.getElementById('export-pdf').addEventListener('click', function() {
        exportReport('pdf');
    });
    
    // Exportar a Excel
    document.getElementById('export-excel').addEventListener('click', function() {
        exportReport('excel');
    });
}

// Función para exportar el reporte actual
function exportReport(format) {
    const token = localStorage.getItem('token');
    
    // Determinar el tipo de reporte según la pestaña activa
    const activeTab = document.querySelector('.tab-button.active');
    if (!activeTab) return;
    
    const reportType = activeTab.getAttribute('data-tab').replace('tab-', '');
    
    // Mostrar indicador de carga
    showLoadingNotification('Generando exportación...');
    
    // Llamar a la API para generar la exportación
    fetch(`/api/reportes/export?format=${format}&reportType=${reportType}&startDate=${reportData.startDate}&endDate=${reportData.endDate}&categoria_id=${reportData.category}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data.download_url) {
            // Crear un enlace para la descarga
            const downloadLink = document.createElement('a');
            downloadLink.href = data.data.download_url;
            downloadLink.download = `reporte_${reportType}_${format}.${format}`;
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            
            // Iniciar descarga
            downloadLink.click();
            
            // Limpiar
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                showSuccessNotification(`El reporte ha sido exportado como ${format.toUpperCase()}`);
            }, 100);
        } else {
            showErrorNotification('Error al generar la exportación');
            console.error('Error en la exportación:', data.message);
        }
    })
    .catch(error => {
        showErrorNotification('Error al generar la exportación');
        console.error('Error de red al exportar:', error);
    });
}

// Función de utilidad para mostrar toasts (necesaria para los mensajes de respaldo)
function showToast(message, type = 'info', duration = 3000) {
    const types = {
        success: 'toast-success',
        error: 'toast-error',
        warning: 'toast-warning',
        info: 'toast-info'
    };
    
    const icon = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    Toastify({
        text: `${icon[type] || ''} ${message}`,
        duration: duration,
        close: true,
        className: types[type] || 'toast-info',
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        escapeMarkup: false // Permite interpretar HTML
    }).showToast();
}

// Mostrar notificaciones
function showLoadingNotification(message) {
    Toastify({
        text: `<i class="fas fa-spinner fa-spin"></i> ${message}`,
        duration: 3000,
        close: true,
        className: "toast-info",
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        escapeMarkup: false // Permite interpretar HTML
    }).showToast();
}

function showSuccessNotification(message) {
    Toastify({
        text: `<i class="fas fa-check-circle"></i> ${message}`,
        duration: 4000,
        close: true,
        className: "toast-success",
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        escapeMarkup: false // Permite interpretar HTML
    }).showToast();
}

function showErrorNotification(message) {
    Toastify({
        text: `<i class="fas fa-exclamation-circle"></i> ${message}`,
        duration: 5000,
        close: true,
        className: "toast-error",
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        escapeMarkup: false // Permite interpretar HTML
    }).showToast();
}

// Cargar datos para los reportes
function loadReportData() {
    const token = localStorage.getItem('token');
    
    // Mostrar indicadores de carga
    document.querySelectorAll('.kpi-value, #top-selling-products, #bottom-selling-products, #high-rotation-products, #low-rotation-products, #stockout-risk, #purchase-forecast').forEach(el => {
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    });

    // 1. Cargar tendencias de stock
    loadStockTrends(token);

    // 2. Cargar datos de productos más/menos vendidos
    loadTopProducts(token);

    // 3. Cargar datos de rotación de inventario
    loadRotationData(token);

    // 4. Cargar datos para proyecciones
    loadProjectionData(token);
}

// Cargar tendencias de stock
function loadStockTrends(token) {
    const categoryFilter = reportData.category !== 'all' ? `&categoria_id=${reportData.category}` : '';
    
    // Mostrar indicador de carga
    showLoadingNotification('Cargando datos de stock...');
    
    // Llamada real a la API
    fetch(`/api/reportes/stock-trends?startDate=${reportData.startDate}&endDate=${reportData.endDate}${categoryFilter}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data) {
            console.log('Datos de stock cargados exitosamente:', data.data);
            reportData.stockTrends = data.data;
            renderStockTrendChart();
            updateStockKPIs();
        } else {
            console.error('Respuesta de API incorrecta:', data);
            throw new Error('Formato de respuesta inválido');
        }
    })
    .catch(error => {
        console.error('Error al cargar tendencias de stock:', error);
        showToast('Usando datos de ejemplo para mostrar tendencias de stock', 'warning');
        
        // Fallback a los datos simulados en caso de error
        simulateStockTrends();
    });
}

// Función modificada para simular datos y asegurar que se muestren
function simulateStockTrends() {
    console.log('Generando datos simulados para tendencias de stock');
    
    // Datos simulados para mostrar en la interfaz
    reportData.stockTrends = {
        labels: ['16/03/25', '23/03/25', '30/03/25', '06/04/25', '13/04/25'],
        datasets: [
            {
                label: 'Producto A',
                data: [35, 32, 28, 25, 20],
                borderColor: '#4285F4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                tension: 0.4
            },
            {
                label: 'Producto B',
                data: [15, 20, 25, 30, 35],
                borderColor: '#34A853',
                backgroundColor: 'rgba(52, 168, 83, 0.1)',
                tension: 0.4
            },
            {
                label: 'Producto C',
                data: [10, 12, 8, 15, 18],
                borderColor: '#FBBC05',
                backgroundColor: 'rgba(251, 188, 5, 0.1)',
                tension: 0.4
            }
        ],
        kpis: {
            avgStock: 23,
            variation: '+4.5%',
            totalStock: 450,
            criticalStock: 2
        }
    };
    
    // Renderizar con datos simulados
    renderStockTrendChart();
    updateStockKPIs();
}

// Renderizar el gráfico de tendencias de stock
function renderStockTrendChart() {
    if (!reportData.stockTrends.labels) return;
    
    const ctx = document.getElementById('stock-trend-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.stockTrendChart instanceof Chart) {
        window.stockTrendChart.destroy();
    }
    
    // Crear nuevo gráfico
    window.stockTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reportData.stockTrends.labels,
            datasets: reportData.stockTrends.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    position: 'nearest'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                title: {
                    display: true,
                    text: 'Evolución del Stock por Producto'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Unidades en Stock'
                    },
                    min: 0
                },
                x: {
                    title: {
                        display: true,
                        text: 'Semana'
                    }
                }
            }
        }
    });
}

// Actualizar KPIs de stock
function updateStockKPIs() {
    const kpis = reportData.stockTrends.kpis;
    
    document.getElementById('kpi-avg-stock').textContent = kpis.avgStock;
    
    const variationEl = document.getElementById('kpi-stock-variation');
    variationEl.textContent = kpis.variation;
    if (kpis.variation.includes('+')) {
        variationEl.style.color = '#28a745'; // verde para aumento
    } else if (kpis.variation.includes('-')) {
        variationEl.style.color = '#dc3545'; // rojo para disminución
    } else {
        variationEl.style.color = '#6c757d'; // gris para sin cambios
    }
    
    document.getElementById('kpi-total-stock').textContent = kpis.totalStock;
    
    const criticalEl = document.getElementById('kpi-critical-stock');
    criticalEl.textContent = kpis.criticalStock;
    if (kpis.criticalStock > 5) {
        criticalEl.style.color = '#dc3545'; // rojo si hay muchos productos críticos
    } else if (kpis.criticalStock > 0) {
        criticalEl.style.color = '#ffc107'; // amarillo si hay algunos
    } else {
        criticalEl.style.color = '#28a745'; // verde si no hay ninguno
    }
}

// Cargar datos de productos más/menos vendidos
function loadTopProducts(token) {
    const categoryFilter = reportData.category !== 'all' ? `&categoria_id=${reportData.category}` : '';
    
    // Mostrar indicador de carga
    showLoadingNotification('Cargando datos de productos...');
    
    // Llamada real a la API
    fetch(`/api/reportes/top-products?startDate=${reportData.startDate}&endDate=${reportData.endDate}${categoryFilter}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data) {
            console.log('Datos de productos más/menos vendidos cargados exitosamente:', data.data);
            reportData.topProducts = data.data.topProducts || [];
            reportData.bottomProducts = data.data.bottomProducts || [];
            renderTopProductsCharts();
            renderTopProductsLists();
        } else {
            console.error('Respuesta de API incorrecta:', data);
            throw new Error('Formato de respuesta inválido');
        }
    })
    .catch(error => {
        console.error('Error al cargar productos más/menos vendidos:', error);
        showToast('Usando datos de ejemplo para mostrar productos vendidos', 'warning');
        
        // Fallback a los datos simulados en caso de error
        simulateTopProducts();
    });
}

// Función modificada para simular datos de productos más/menos vendidos
function simulateTopProducts() {
    console.log('Generando datos simulados para productos más/menos vendidos');
    
    // Datos simulados para productos más vendidos
    reportData.topProducts = [
        { name: 'Producto A', cantidad: 120 },
        { name: 'Producto B', cantidad: 95 },
        { name: 'Producto C', cantidad: 87 },
        { name: 'Producto D', cantidad: 76 },
        { name: 'Producto E', cantidad: 68 }
    ];
    
    // Datos simulados para productos menos vendidos
    reportData.bottomProducts = [
        { name: 'Producto X', cantidad: 2 },
        { name: 'Producto Y', cantidad: 4 },
        { name: 'Producto Z', cantidad: 5 },
        { name: 'Producto W', cantidad: 8 },
        { name: 'Producto V', cantidad: 10 }
    ];
    
    // Renderizar con datos simulados
    renderTopProductsCharts();
    renderTopProductsLists();
}

// Renderizar gráficos de productos más/menos vendidos
function renderTopProductsCharts() {
    if (!reportData.topProducts.length) return;
    
    // Gráfico de productos más vendidos
    const topCtx = document.getElementById('top-products-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.topProductsChart instanceof Chart) {
        window.topProductsChart.destroy();
    }
    
    // Configurar datos para el gráfico
    const topLabels = reportData.topProducts.slice(0, 5).map(product => product.name);
    const topValues = reportData.topProducts.slice(0, 5).map(product => product.cantidad);
    
    // Crear gráfico
    window.topProductsChart = new Chart(topCtx, {
        type: 'bar',
        data: {
            labels: topLabels,
            datasets: [{
                label: 'Unidades vendidas',
                data: topValues,
                backgroundColor: [
                    '#4285F4', '#34A853', '#FBBC05', '#EA4335', '#673AB7'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 5 Productos Más Vendidos'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Producto'
                    }
                }
            }
        }
    });
    
    // Gráfico de productos menos vendidos
    const bottomCtx = document.getElementById('bottom-products-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.bottomProductsChart instanceof Chart) {
        window.bottomProductsChart.destroy();
    }
    
    // Configurar datos para el gráfico
    const bottomLabels = reportData.bottomProducts.slice(0, 5).map(product => product.name);
    const bottomValues = reportData.bottomProducts.slice(0, 5).map(product => product.cantidad);
    
    // Crear gráfico
    window.bottomProductsChart = new Chart(bottomCtx, {
        type: 'bar',
        data: {
            labels: bottomLabels,
            datasets: [{
                label: 'Unidades vendidas',
                data: bottomValues,
                backgroundColor: [
                    '#8E44AD', '#16A085', '#F39C12', '#7F8C8D', '#D35400'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Productos Menos Vendidos'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Producto'
                    }
                }
            }
        }
    });
}

// Renderizar listas de productos más/menos vendidos
function renderTopProductsLists() {
    // Lista de productos más vendidos
    const topList = document.getElementById('top-selling-products');
    topList.innerHTML = '';
    
    reportData.topProducts.forEach((product, index) => {
        const item = document.createElement('div');
        item.className = `product-rank-item ${index < 3 ? 'top-3 rank-' + (index + 1) : ''}`;
        
        item.innerHTML = `
            <div class="product-rank-position">${index + 1}</div>
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value">${product.cantidad} unidades</div>
        `;
        
        topList.appendChild(item);
    });
    
    // Lista de productos menos vendidos
    const bottomList = document.getElementById('bottom-selling-products');
    bottomList.innerHTML = '';
    
    reportData.bottomProducts.forEach((product, index) => {
        const item = document.createElement('div');
        item.className = 'product-rank-item';
        
        item.innerHTML = `
            <div class="product-rank-position">${index + 1}</div>
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value">${product.cantidad} unidades</div>
        `;
        
        bottomList.appendChild(item);
    });
}

// Cargar datos de rotación de inventario
function loadRotationData(token) {
    const categoryFilter = reportData.category !== 'all' ? `&categoria_id=${reportData.category}` : '';
    
    // Mostrar indicador de carga
    showLoadingNotification('Cargando datos de rotación...');
    
    // Llamada real a la API
    fetch(`/api/reportes/rotation?startDate=${reportData.startDate}&endDate=${reportData.endDate}${categoryFilter}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data) {
            console.log('Datos de rotación cargados exitosamente:', data.data);
            reportData.rotationData = data.data;
            renderRotationCharts();
            renderRotationLists();
        } else {
            console.error('Respuesta de API incorrecta:', data);
            throw new Error('Formato de respuesta inválido');
        }
    })
    .catch(error => {
        console.error('Error al cargar datos de rotación:', error);
        showToast('Usando datos de ejemplo para mostrar rotación de inventario', 'warning');
        
        // Fallback a los datos simulados en caso de error
        simulateRotation();
    });
}

// Función modificada para simular datos de rotación
function simulateRotation() {
    console.log('Generando datos simulados para rotación de inventario');
    
    // Datos simulados para rotación de inventario
    reportData.rotationData = {
        rotation: [
            { product: 'Producto A', value: 12.5 },
            { product: 'Producto B', value: 10.2 },
            { product: 'Producto C', value: 15.8 },
            { product: 'Producto D', value: 9.3 },
            { product: 'Producto E', value: 8.7 }
        ],
        highRotation: [
            { name: 'Producto C', value: 15.8, stock: 25, daysToStockout: 5 },
            { name: 'Producto A', value: 12.5, stock: 30, daysToStockout: 8 },
            { name: 'Producto B', value: 10.2, stock: 22, daysToStockout: 7 }
        ],
        lowRotation: [
            { name: 'Producto X', value: 1.2, stock: 45, daysInInventory: 38 },
            { name: 'Producto Y', value: 2.5, stock: 32, daysInInventory: 25 },
            { name: 'Producto Z', value: 3.8, stock: 40, daysInInventory: 18 }
        ],
        categoryRotation: [
            { category: 'Categoría 1', value: 10.6 },
            { category: 'Categoría 2', value: 8.9 },
            { category: 'Categoría 3', value: 15.0 },
            { category: 'Categoría 4', value: 9.3 },
            { category: 'Categoría 5', value: 7.5 }
        ]
    };
    
    // Renderizar con datos simulados
    renderRotationCharts();
    renderRotationLists();
}

// Renderizar gráficos de rotación de inventario
function renderRotationCharts() {
    if (!reportData.rotationData.rotation) return;
    
    // Gráfico principal de rotación
    const rotCtx = document.getElementById('rotation-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.rotationChart instanceof Chart) {
        window.rotationChart.destroy();
    }
    
    // Preparar datos para el gráfico
    const rotationLabels = reportData.rotationData.rotation.map(item => item.product);
    const rotationValues = reportData.rotationData.rotation.map(item => item.value);
    
    // Crear array de colores según el índice de rotación
    const rotationColors = rotationValues.map(value => {
        if (value >= 10) return '#28a745'; // Alta rotación (verde)
        if (value >= 5) return '#ffc107';  // Media rotación (amarillo)
        return '#dc3545';                  // Baja rotación (rojo)
    });
    
    // Crear gráfico
    window.rotationChart = new Chart(rotCtx, {
        type: 'bar',
        data: {
            labels: rotationLabels,
            datasets: [{
                label: 'Índice de Rotación',
                data: rotationValues,
                backgroundColor: rotationColors,
                borderWidth: 0
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
                    callbacks: {
                        label: function(context) {
                            return `Índice: ${context.raw.toFixed(1)} veces/mes`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Índice de Rotación de Inventario por Producto'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Rotación (veces/mes)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Producto'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
    
    // Gráfico de rotación por categoría
    const catRotCtx = document.getElementById('category-rotation-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.categoryRotationChart instanceof Chart) {
        window.categoryRotationChart.destroy();
    }
    
    // Crear gráfico
    window.categoryRotationChart = new Chart(catRotCtx, {
        type: 'doughnut',
        data: {
            labels: reportData.rotationData.categoryRotation.map(item => item.category),
            datasets: [{
                label: 'Rotación',
                data: reportData.rotationData.categoryRotation.map(item => item.value),
                backgroundColor: [
                    '#4285F4', '#34A853', '#FBBC05', '#EA4335', '#673AB7'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                title: {
                    display: true,
                    text: 'Rotación por Categoría'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(1)} veces/mes`;
                        }
                    }
                },
            }
        }
    });
}

// Renderizar listas de productos con alta/baja rotación
function renderRotationLists() {
    // Lista de productos de alta rotación
    const highRotList = document.getElementById('high-rotation-products');
    highRotList.innerHTML = '';
    
    reportData.rotationData.highRotation.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-rank-item';
        
        item.innerHTML = `
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value rotation-high">${product.value.toFixed(1)}x</div>
        `;
        
        const stockInfo = document.createElement('div');
        stockInfo.className = 'mt-2 small';
        stockInfo.innerHTML = `
            <div>Stock actual: ${product.stock} unidades</div>
            <div class="text-danger">
                <i class="fas fa-exclamation-triangle"></i>
                Riesgo de desabastecimiento en ${product.daysToStockout} días
            </div>
        `;
        
        item.appendChild(stockInfo);
        highRotList.appendChild(item);
    });
    
    // Lista de productos de baja rotación
    const lowRotList = document.getElementById('low-rotation-products');
    lowRotList.innerHTML = '';
    
    reportData.rotationData.lowRotation.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-rank-item';
        
        item.innerHTML = `
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value rotation-low">${product.value.toFixed(1)}x</div>
        `;
        
        const stockInfo = document.createElement('div');
        stockInfo.className = 'mt-2 small';
        stockInfo.innerHTML = `
            <div>Stock actual: ${product.stock} unidades</div>
            <div class="text-warning">
                <i class="fas fa-hourglass-half"></i>
                ${product.daysInInventory} días en inventario sin movimiento
            </div>
        `;
        
        item.appendChild(stockInfo);
        lowRotList.appendChild(item);
    });
}

// Cargar datos para proyecciones de stock
function loadProjectionData(token) {
    const categoryFilter = reportData.category !== 'all' ? `&categoria_id=${reportData.category}` : '';
    
    // Mostrar indicador de carga
    showLoadingNotification('Cargando proyecciones de stock...');
    
    // Llamada real a la API
    fetch(`/api/reportes/projections?startDate=${reportData.startDate}&endDate=${reportData.endDate}${categoryFilter}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data) {
            console.log('Datos de proyecciones cargados exitosamente:', data.data);
            reportData.projectionData = data.data;
            renderProjectionCharts();
            renderStockoutRiskList();
            renderPurchaseForecast();
        } else {
            console.error('Respuesta de API incorrecta para proyecciones:', data);
            throw new Error('Formato de respuesta inválido');
        }
    })
    .catch(error => {
        console.error('Error al cargar proyecciones:', error);
        showToast('Usando datos de ejemplo para mostrar proyecciones de stock', 'warning');
        
        // Fallback a los datos simulados en caso de error
        simulateProjection();
    });
}

// Función modificada para simular datos de proyecciones
function simulateProjection() {
    console.log('Generando datos simulados para proyecciones de stock');
    
    // Generar fechas para proyecciones (próximas 6 semanas)
    const projectionLabels = [];
    let currentDate = moment();
    for (let i = 0; i < 6; i++) {
        projectionLabels.push(currentDate.format('DD/MM/YY'));
        currentDate.add(7, 'days');
    }
    
    // Datos simulados para proyecciones
    reportData.projectionData = {
        projections: {
            labels: projectionLabels,
            datasets: [
                {
                    label: 'Producto A',
                    data: [20, 18, 15, 12, 9, 6],
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Producto B',
                    data: [35, 32, 29, 25, 22, 18],
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Producto C',
                    data: [25, 20, 15, 10, 5, 0],
                    borderColor: '#FBBC05',
                    backgroundColor: 'rgba(251, 188, 5, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        stockoutRisk: [
            { name: 'Producto C', currentStock: 25, estimatedStockoutDate: moment().add(28, 'days').format('DD/MM/YY'), daysToStockout: 28 },
            { name: 'Producto A', currentStock: 20, estimatedStockoutDate: moment().add(35, 'days').format('DD/MM/YY'), daysToStockout: 35 },
            { name: 'Producto B', currentStock: 28, estimatedStockoutDate: moment().add(42, 'days').format('DD/MM/YY'), daysToStockout: 42 }
        ],
        purchaseForecast: [
            { name: 'Producto C', suggested: 150, estimatedConsumption: '5 unidades/día' },
            { name: 'Producto A', suggested: 100, estimatedConsumption: '3 unidades/día' },
            { name: 'Producto B', suggested: 80, estimatedConsumption: '2.5 unidades/día' }
        ],
        seasonal: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [
                {
                    label: 'Categoría 1',
                    data: [80, 85, 90, 95, 100, 110, 115, 120, 100, 95, 90, 85],
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    fill: true
                },
                {
                    label: 'Categoría 2',
                    data: [120, 110, 100, 90, 85, 80, 75, 80, 90, 100, 110, 125],
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    fill: true
                },
                {
                    label: 'Categoría 3',
                    data: [95, 90, 85, 90, 95, 100, 120, 130, 120, 110, 100, 90],
                    borderColor: '#FBBC05',
                    backgroundColor: 'rgba(251, 188, 5, 0.1)',
                    fill: true
                }
            ]
        }
    };
    
    // Renderizar con datos simulados
    renderProjectionCharts();
    renderStockoutRiskList();
    renderPurchaseForecast();
}

// Renderizar gráficos de proyecciones
function renderProjectionCharts() {
    if (!reportData.projectionData.projections) return;
    
    // Gráfico principal de proyecciones
    const projCtx = document.getElementById('projection-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.projectionChart instanceof Chart) {
        window.projectionChart.destroy();
    }
    
    // Crear gráfico
    window.projectionChart = new Chart(projCtx, {
        type: 'line',
        data: {
            labels: reportData.projectionData.projections.labels,
            datasets: reportData.projectionData.projections.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    position: 'nearest'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                title: {
                    display: true,
                    text: 'Proyección de Stock Próximas Semanas'
                },
                annotation: {
                    annotations: {
                        line: {
                            type: 'line',
                            yMin: 10,
                            yMax: 10,
                            borderColor: 'red',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: 'Stock Crítico',
                                position: 'start',
                                backgroundColor: 'rgba(255, 0, 0, 0.8)'
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Unidades en Stock'
                    },
                    min: 0
                },
                x: {
                    title: {
                        display: true,
                        text: 'Semana'
                    }
                }
            }
        }
    });
    
    // Gráfico de tendencias estacionales
    const seasonalCtx = document.getElementById('seasonal-chart').getContext('2d');
    
    // Destruir gráfico existente si lo hay
    if (window.seasonalChart instanceof Chart) {
        window.seasonalChart.destroy();
    }
    
    // Crear gráfico
    window.seasonalChart = new Chart(seasonalCtx, {
        type: 'line',
        data: {
            labels: reportData.projectionData.seasonal.labels,
            datasets: reportData.projectionData.seasonal.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    position: 'nearest'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                title: {
                    display: true,
                    text: 'Tendencias Estacionales'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Índice de Demanda'
                    },
                    beginAtZero: true
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mes'
                    }
                }
            }
        }
    });
}

// Renderizar lista de productos con riesgo de desabastecimiento
function renderStockoutRiskList() {
    const stockoutRiskList = document.getElementById('stockout-risk');
    stockoutRiskList.innerHTML = '';
    
    reportData.projectionData.stockoutRisk.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-rank-item';
        
        // Determinar el nivel de riesgo basado en días hasta desabastecimiento
        let riskClass, riskLabel;
        if (product.daysToStockout <= 7) {
            riskClass = 'text-danger';
            riskLabel = 'Alto';
        } else if (product.daysToStockout <= 14) {
            riskClass = 'text-warning';
            riskLabel = 'Medio';
        } else {
            riskClass = 'text-success';
            riskLabel = 'Bajo';
        }
        
        item.innerHTML = `
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value ${riskClass}">Riesgo ${riskLabel}</div>
        `;
        
        const stockInfo = document.createElement('div');
        stockInfo.className = 'mt-2 small';
        stockInfo.innerHTML = `
            <div>Stock actual: ${product.currentStock} unidades</div>
            <div class="${riskClass}">
                <i class="fas fa-calendar-alt"></i>
                Fecha estimada de desabastecimiento: ${product.estimatedStockoutDate}
            </div>
        `;
        
        item.appendChild(stockInfo);
        stockoutRiskList.appendChild(item);
    });
}

// Renderizar pronóstico de compras
function renderPurchaseForecast() {
    const purchaseForecastList = document.getElementById('purchase-forecast');
    purchaseForecastList.innerHTML = '';
    
    reportData.projectionData.purchaseForecast.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-rank-item';
        
        item.innerHTML = `
            <div class="product-rank-name">${product.name}</div>
            <div class="product-rank-value">${product.suggested} unidades</div>
        `;
        
        const consumptionInfo = document.createElement('div');
        consumptionInfo.className = 'mt-2 small';
        consumptionInfo.innerHTML = `
            <div>Consumo estimado: ${product.estimatedConsumption}</div>
            <div class="text-info">
                <i class="fas fa-shopping-cart"></i>
                Sugerencia para próximo pedido
            </div>
        `;
        
        item.appendChild(consumptionInfo);
        purchaseForecastList.appendChild(item);
    });
}

// Funciones de fallback con datos simulados en caso de error o para desarrollo
function simulateStockTrendsData() {
    // Datos simulados originales
    reportData.stockTrends = {
        labels: ['16/03/25', '23/03/25', '30/03/25', '06/04/25', '13/04/25'],
        datasets: [
            {
                label: 'Hamburguesa 1',
                data: [35, 32, 28, 25, 20],
                borderColor: '#4285F4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                tension: 0.4
            },
            {
                label: 'Hamburguesa 2',
                data: [15, 20, 25, 30, 35],
                borderColor: '#34A853',
                backgroundColor: 'rgba(52, 168, 83, 0.1)',
                tension: 0.4
            },
            {
                label: 'Hamburguesa 3',
                data: [10, 12, 8, 15, 18],
                borderColor: '#FBBC05',
                backgroundColor: 'rgba(251, 188, 5, 0.1)',
                tension: 0.4
            },
            {
                label: 'Pizza 1',
                data: [22, 19, 23, 25, 28],
                borderColor: '#EA4335',
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                tension: 0.4
            },
            {
                label: 'Pizza 2',
                data: [30, 28, 25, 22, 20],
                borderColor: '#673AB7',
                backgroundColor: 'rgba(103, 58, 183, 0.1)',
                tension: 0.4
            }
        ],
        kpis: {
            avgStock: 23,
            variation: '+4.5%',
            totalStock: 450,
            criticalStock: 2
        }
    };
    
    renderStockTrendChart();
    updateStockKPIs();
}

function simulateTopProductsData() {
    // Datos simulados originales
    reportData.topProducts = [
        { name: 'Hamburguesa 1', cantidad: 120 },
        { name: 'Pizza Familiar', cantidad: 95 },
        { name: 'Bebida Cola 1L', cantidad: 87 },
        { name: 'Papas Fritas Grande', cantidad: 76 },
        { name: 'Hamburguesa 2', cantidad: 68 },
        { name: 'Ensalada César', cantidad: 65 },
        { name: 'Pizza Mediana', cantidad: 62 },
        { name: 'Agua Mineral 500ml', cantidad: 60 },
        { name: 'Nuggets', cantidad: 55 },
        { name: 'Cerveza', cantidad: 50 }
    ];
    
    reportData.bottomProducts = [
        { name: 'Salsa Picante', cantidad: 2 },
        { name: 'Helado de Vainilla', cantidad: 4 },
        { name: 'Torta de Chocolate', cantidad: 5 },
        { name: 'Ensalada Mixta', cantidad: 8 },
        { name: 'Café Expreso', cantidad: 10 },
        { name: 'Hamburguesa Vegetariana', cantidad: 12 },
        { name: 'Batido de Frutas', cantidad: 15 },
        { name: 'Pizza Vegetariana', cantidad: 18 },
        { name: 'Té Helado', cantidad: 20 },
        { name: 'Sandwich de Pollo', cantidad: 22 }
    ];
    
    renderTopProductsCharts();
    renderTopProductsLists();
}

function simulateRotationData() {
    // Datos simulados originales
    reportData.rotationData = {
        rotation: [
            { product: 'Hamburguesa 1', value: 12.5 },
            { product: 'Pizza Familiar', value: 10.2 },
            { product: 'Bebida Cola 1L', value: 15.8 },
            { product: 'Papas Fritas Grande', value: 9.3 },
            { product: 'Hamburguesa 2', value: 8.7 },
            { product: 'Pizza Mediana', value: 7.5 },
            { product: 'Agua Mineral 500ml', value: 14.2 },
            { product: 'Helado de Vainilla', value: 1.2 },
            { product: 'Ensalada Mixta', value: 2.5 },
            { product: 'Café Expreso', value: 3.8 }
        ],
        highRotation: [
            { name: 'Bebida Cola 1L', value: 15.8, stock: 25, daysToStockout: 2 },
            { name: 'Agua Mineral 500ml', value: 14.2, stock: 30, daysToStockout: 3 },
            { name: 'Hamburguesa 1', value: 12.5, stock: 20, daysToStockout: 2 }
        ],
        lowRotation: [
            { name: 'Helado de Vainilla', value: 1.2, stock: 45, daysInInventory: 38 },
            { name: 'Ensalada Mixta', value: 2.5, stock: 32, daysInInventory: 12 },
            { name: 'Café Expreso', value: 3.8, stock: 40, daysInInventory: 11 }
        ],
        categoryRotation: [
            { category: 'Hamburguesas', value: 10.6 },
            { category: 'Pizzas', value: 8.9 },
            { category: 'Bebidas', value: 15.0 },
            { category: 'Complementos', value: 9.3 },
            { category: 'Postres', value: 2.4 }
        ]
    };
    
    renderRotationCharts();
    renderRotationLists();
}

function simulateProjectionData() {
    // Datos simulados originales
    reportData.projectionData = {
        projections: {
            labels: ['16/04/25', '23/04/25', '30/04/25', '07/05/25', '14/05/25', '21/05/25'],
            datasets: [
                {
                    label: 'Hamburguesa 1',
                    data: [20, 18, 15, 12, 9, 6],
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Pizza Familiar',
                    data: [35, 32, 29, 25, 22, 18],
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Bebida Cola 1L',
                    data: [25, 20, 15, 10, 5, 0],
                    borderColor: '#FBBC05',
                    backgroundColor: 'rgba(251, 188, 5, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Papas Fritas Grande',
                    data: [28, 25, 22, 19, 16, 13],
                    borderColor: '#EA4335',
                    backgroundColor: 'rgba(234, 67, 53, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        stockoutRisk: [
            { name: 'Bebida Cola 1L', currentStock: 25, estimatedStockoutDate: '14/05/25', daysToStockout: 28 },
            { name: 'Hamburguesa 1', currentStock: 20, estimatedStockoutDate: '21/05/25', daysToStockout: 35 },
            { name: 'Papas Fritas Grande', currentStock: 28, estimatedStockoutDate: '28/05/25', daysToStockout: 42 }
        ],
        purchaseForecast: [
            { name: 'Bebida Cola 1L', suggested: 150, estimatedConsumption: '5 unidades/día' },
            { name: 'Hamburguesa 1', suggested: 100, estimatedConsumption: '3 unidades/día' },
            { name: 'Pizza Familiar', suggested: 80, estimatedConsumption: '2.5 unidades/día' },
            { name: 'Papas Fritas Grande', suggested: 90, estimatedConsumption: '3 unidades/día' }
        ],
        seasonal: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [
                {
                    label: 'Hamburguesa',
                    data: [80, 85, 90, 95, 100, 110, 115, 120, 100, 95, 90, 85],
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    fill: true
                },
                {
                    label: 'Pizza',
                    data: [120, 110, 100, 90, 85, 80, 75, 80, 90, 100, 110, 125],
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    fill: true
                },
                {
                    label: 'Bebidas',
                    data: [95, 90, 85, 90, 95, 100, 120, 130, 120, 110, 100, 90],
                    borderColor: '#FBBC05',
                    backgroundColor: 'rgba(251, 188, 5, 0.1)',
                    fill: true
                }
            ]
        }
    };
    
    renderProjectionCharts();
    renderStockoutRiskList();
    renderPurchaseForecast();
}