/**
 * usuarios-dashboard.js
 * Maneja las estadísticas en tiempo real y gráficos para el módulo de administración de usuarios
 */

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar componentes del dashboard
  initThemeToggle();
  initTableSorting();
  initColumnVisibility();
  initPagination();
  
  // Cargar datos para el dashboard
  loadUserStatistics();
  loadUserCharts();
  
  // Actualizar datos cada 5 minutos
  setInterval(() => {
    loadUserStatistics();
    loadUserCharts();
  }, 300000); // 5 minutos
});

/**
 * Inicializa el toggle del tema (modo claro/oscuro)
 */
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  
  // Verificar si hay una preferencia guardada
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
  themeToggle.checked = currentTheme === 'dark';
  
  // Cambiar tema al hacer clic en el toggle
  themeToggle.addEventListener('change', function() {
    if (this.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });
}

/**
 * Carga las estadísticas de usuarios
 */
async function loadUserStatistics() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch('/api/usuarios/estadisticas', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar estadísticas');
    }
    
    const stats = await response.json();
    
    // Actualizar las tarjetas de estadísticas con animación
    updateStatWithAnimation('total-users', stats.totalUsuarios);
    updateStatWithAnimation('active-users', stats.usuariosActivos);
    updateStatWithAnimation('new-users', stats.nuevosUsuariosMes);
    
  } catch (error) {
    console.error('Error al cargar estadísticas de usuarios:', error);
    // No mostrar error al usuario, simplemente mantener los valores anteriores
  }
}

/**
 * Actualiza un valor estadístico con animación de conteo
 */
function updateStatWithAnimation(elementId, newValue) {
  const element = document.getElementById(elementId);
  const currentValue = parseInt(element.textContent) || 0;
  
  // Si es el valor inicial (--), simplemente establecer el valor
  if (element.textContent === '--') {
    element.textContent = newValue;
    return;
  }
  
  // Calcular incremento para animación
  const diff = newValue - currentValue;
  const steps = 20; // Número de pasos en la animación
  const increment = diff / steps;
  let current = currentValue;
  let step = 0;
  
  // Animar el cambio
  const timer = setInterval(() => {
    step++;
    current += increment;
    element.textContent = Math.round(current);
    
    if (step >= steps) {
      clearInterval(timer);
      element.textContent = newValue; // Asegurar el valor final exacto
    }
  }, 30);
}

/**
 * Carga y muestra los gráficos de usuarios
 */
async function loadUserCharts() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch('/api/usuarios/graficos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar datos para gráficos');
    }
    
    const chartData = await response.json();
    
    // Renderizar los gráficos
    renderRolesChart(chartData.distribucionRoles);
    renderActivityChart(chartData.actividadReciente);
    
  } catch (error) {
    console.error('Error al cargar datos de gráficos:', error);
    // Mostrar mensaje de error en los contenedores de gráficos
    showChartError('roles-chart', 'No se pudieron cargar los datos');
    showChartError('activity-chart', 'No se pudieron cargar los datos');
  }
}

/**
 * Renderiza el gráfico de distribución de roles
 */
function renderRolesChart(roleData) {
  const ctx = document.getElementById('roles-chart').getContext('2d');
  
  // Destruir gráfico existente si lo hay
  if (window.rolesChart) {
    window.rolesChart.destroy();
  }
  
  // Colores para los diferentes roles
  const roleColors = {
    'admin': '#4B77BE',
    'vendedor': '#26C281',
    'inventario': '#F39C12'
  };
  
  // Preparar datos
  const labels = Object.keys(roleData).map(role => mapRoleName(role));
  const data = Object.values(roleData);
  const colors = Object.keys(roleData).map(role => roleColors[role] || '#CCCCCC');
  
  // Crear gráfico
  window.rolesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }
  });
}

/**
 * Renderiza el gráfico de actividad reciente
 */
function renderActivityChart(activityData) {
  const ctx = document.getElementById('activity-chart').getContext('2d');
  
  // Destruir gráfico existente si lo hay
  if (window.activityChart) {
    window.activityChart.destroy();
  }
  
  // Configuración de colores
  const colors = {
    login: 'rgba(52, 152, 219, 0.6)',
    userCreation: 'rgba(46, 204, 113, 0.6)',
    userModification: 'rgba(155, 89, 182, 0.6)',
    userDeletion: 'rgba(231, 76, 60, 0.6)',
    border: {
      login: 'rgba(52, 152, 219, 1)',
      userCreation: 'rgba(46, 204, 113, 1)',
      userModification: 'rgba(155, 89, 182, 1)',
      userDeletion: 'rgba(231, 76, 60, 1)'
    }
  };
  
  // Crear el conjunto de datos
  const datasets = Object.keys(activityData.series).map(key => {
    return {
      label: getActivityLabel(key),
      data: activityData.series[key],
      backgroundColor: colors[key] || 'rgba(200, 200, 200, 0.6)',
      borderColor: colors.border[key] || 'rgba(200, 200, 200, 1)',
      borderWidth: 1,
      tension: 0.3
    };
  });
  
  // Crear gráfico
  window.activityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: activityData.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 10,
          ticks: {
            precision: 0
          }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            }
          }
        }
      },
      animation: {
        duration: 1200
      }
    }
  });
}

/**
 * Muestra un mensaje de error en un contenedor de gráfico
 */
function showChartError(chartId, message) {
  const canvas = document.getElementById(chartId);
  const parent = canvas.parentNode;
  
  // Crear mensaje de error si no existe
  let errorMsg = parent.querySelector('.chart-error');
  if (!errorMsg) {
    errorMsg = document.createElement('div');
    errorMsg.className = 'chart-error';
    parent.appendChild(errorMsg);
  }
  
  errorMsg.textContent = message;
  canvas.style.opacity = '0.3';
}

/**
 * Devuelve una etiqueta legible para tipos de actividad
 */
function getActivityLabel(activityType) {
  const labels = {
    'login': 'Inicios de sesión',
    'userCreation': 'Usuarios creados',
    'userModification': 'Usuarios modificados',
    'userDeletion': 'Usuarios eliminados'
  };
  
  return labels[activityType] || activityType;
}

/**
 * Inicializa el ordenamiento de tabla
 */
function initTableSorting() {
  const table = document.getElementById('users-table');
  const headers = table.querySelectorAll('th[data-column]');
  
  headers.forEach(header => {
    header.addEventListener('click', () => {
      // Eliminar clases de ordenamiento de todos los encabezados
      headers.forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      
      const column = header.dataset.column;
      const currentSort = header.dataset.sort || 'none';
      
      // Cambiar dirección de ordenamiento
      let newSort;
      if (currentSort === 'none' || currentSort === 'desc') {
        newSort = 'asc';
        header.classList.add('sort-asc');
      } else {
        newSort = 'desc';
        header.classList.add('sort-desc');
      }
      
      header.dataset.sort = newSort;
      
      // Ordenar tabla
      sortTable(table, column, newSort);
    });
  });
}

/**
 * Ordena la tabla según la columna y dirección especificadas
 */
function sortTable(table, column, direction) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // No ordenar si solo hay una fila o es fila de carga/mensaje
  if (rows.length <= 1 || rows[0].querySelector('td[colspan]')) {
    return;
  }
  
  // Determinar el índice de la columna
  const headers = table.querySelectorAll('th');
  let columnIndex = 0;
  
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].dataset.column === column) {
      columnIndex = i;
      break;
    }
  }
  
  // Ordenar filas
  rows.sort((a, b) => {
    const cellA = a.cells[columnIndex].textContent.trim();
    const cellB = b.cells[columnIndex].textContent.trim();
    
    // Manejar ordenamiento según el tipo de datos
    if (column === 'id') {
      // Ordenar como números
      return direction === 'asc' 
        ? parseInt(cellA) - parseInt(cellB)
        : parseInt(cellB) - parseInt(cellA);
    } else if (column === 'lastAccess') {
      // Ordenar fechas
      const dateA = parseDate(cellA);
      const dateB = parseDate(cellB);
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      // Ordenar como texto
      return direction === 'asc'
        ? cellA.localeCompare(cellB)
        : cellB.localeCompare(cellA);
    }
  });
  
  // Volver a añadir filas ordenadas
  rows.forEach(row => tbody.appendChild(row));
}

/**
 * Parsea un texto de fecha a objeto Date
 */
function parseDate(dateStr) {
  if (dateStr === '-') return new Date(0); // Para fechas vacías
  
  const parts = dateStr.split(' ');
  const dateParts = parts[0].split('/');
  const timeParts = parts[1] ? parts[1].split(':') : [0, 0];
  
  // Formato: DD/MM/YYYY HH:MM
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // Los meses en JS van de 0-11
  const year = parseInt(dateParts[2]);
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  
  return new Date(year, month, day, hours, minutes);
}

/**
 * Inicializa la funcionalidad de mostrar/ocultar columnas
 */
function initColumnVisibility() {
  const columnMenu = document.getElementById('column-menu');
  const columnSettings = document.getElementById('column-settings');
  const checkboxes = columnMenu.querySelectorAll('input[type="checkbox"]');
  
  // Mostrar/ocultar menú de columnas
  columnSettings.addEventListener('click', function(e) {
    e.stopPropagation();
    columnMenu.classList.toggle('show');
  });
  
  // Cerrar menú al hacer click fuera
  document.addEventListener('click', function() {
    columnMenu.classList.remove('show');
  });
  
  // Prevenir cierre al hacer click dentro
  columnMenu.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Cargar configuración guardada
  loadColumnSettings();
  
  // Actualizar visibilidad al cambiar checkbox
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const column = this.dataset.column;
      toggleColumnVisibility(column, this.checked);
      
      // Guardar preferencias
      saveColumnSettings();
    });
  });
}

/**
 * Alterna la visibilidad de una columna
 */
function toggleColumnVisibility(columnName, isVisible) {
  const table = document.getElementById('users-table');
  const headerIndex = getColumnIndexByName(table, columnName);
  
  if (headerIndex === -1) return;
  
  // Actualizar visibilidad de encabezado y celdas
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cell = row.cells[headerIndex];
    if (cell) {
      cell.style.display = isVisible ? '' : 'none';
    }
  });
}

/**
 * Obtiene el índice de una columna por su nombre
 */
function getColumnIndexByName(table, columnName) {
  const headers = table.querySelectorAll('th');
  
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].dataset.column === columnName) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Guarda la configuración de columnas visibles
 */
function saveColumnSettings() {
  const checkboxes = document.querySelectorAll('.column-toggle input');
  const settings = {};
  
  checkboxes.forEach(cb => {
    settings[cb.dataset.column] = cb.checked;
  });
  
  localStorage.setItem('userTableColumns', JSON.stringify(settings));
}

/**
 * Carga la configuración de columnas visibles
 */
function loadColumnSettings() {
  let settings = localStorage.getItem('userTableColumns');
  
  if (!settings) return;
  
  try {
    settings = JSON.parse(settings);
    
    // Aplicar configuración a checkboxes y columnas
    const checkboxes = document.querySelectorAll('.column-toggle input');
    
    checkboxes.forEach(cb => {
      const column = cb.dataset.column;
      if (settings[column] !== undefined) {
        cb.checked = settings[column];
        toggleColumnVisibility(column, settings[column]);
      }
    });
    
  } catch (e) {
    console.error('Error al cargar configuración de columnas:', e);
  }
}

/**
 * Inicializa la paginación de la tabla
 */
function initPagination() {
  // Pendiente de implementar: este código se implementará cuando
  // el backend proporcione endpoints de paginación
}