/**
 * Theme Manager para La Unika
 * 
 * Este script permite:
 * - Detectar preferencias de tema del sistema
 * - Cambiar manualmente entre tema claro y oscuro
 * - Guardar la selección del usuario en localStorage
 * - Añade un botón para cambiar el tema en todas las páginas
 */

// Clase principal para gestionar el tema
class ThemeManager {
  constructor() {
    this.THEME_KEY = 'unika-theme-preference';
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      SYSTEM: 'system' // Usar preferencia del sistema
    };
    
    // Inicializar el gestor de tema
    this.init();
  }

  /**
   * Inicializa el gestor de tema
   */
  init() {
    // Leer preferencia guardada o usar sistema como predeterminado
    this.currentTheme = localStorage.getItem(this.THEME_KEY) || this.THEMES.SYSTEM;
    
    // Aplicar tema al cargar la página
    this.applyTheme();
    
    // Crear e insertar el botón de cambio de tema
    this.createThemeToggle();
    
    // Agregar detector de cambios en preferencias del sistema
    this.setupSystemPreferenceListener();
  }

  /**
   * Aplica el tema seleccionado (claro, oscuro o sistema)
   */
  applyTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const documentElement = document.documentElement;
    
    // Limpiar clases existentes
    documentElement.classList.remove('light-theme', 'dark-theme');
    
    if (this.currentTheme === this.THEMES.SYSTEM) {
      // Usar preferencia del sistema
      this.actualTheme = prefersDarkScheme ? this.THEMES.DARK : this.THEMES.LIGHT;
    } else {
      // Usar preferencia explícita del usuario
      this.actualTheme = this.currentTheme;
      documentElement.classList.add(`${this.currentTheme}-theme`);
    }

    // Actualizar el ícono del botón si existe
    this.updateToggleButton();
    
    // Notificar al resto de la aplicación del cambio de tema
    this.dispatchThemeChangeEvent();
  }

  /**
   * Cambia al siguiente tema en el ciclo: claro -> oscuro -> sistema -> claro
   */
  toggleTheme() {
    switch (this.currentTheme) {
      case this.THEMES.LIGHT:
        this.currentTheme = this.THEMES.DARK;
        break;
      case this.THEMES.DARK:
        this.currentTheme = this.THEMES.SYSTEM;
        break;
      default:
        this.currentTheme = this.THEMES.LIGHT;
    }
    
    // Guardar preferencia
    localStorage.setItem(this.THEME_KEY, this.currentTheme);
    
    // Aplicar el nuevo tema
    this.applyTheme();
    
    // Mostrar notificación del cambio
    this.showThemeChangeNotification();
  }

  /**
   * Crea un botón flotante para cambiar el tema
   */
  createThemeToggle() {
    // Verificar si ya existe el botón
    if (document.querySelector('.theme-toggle')) return;
    
    // Crear el botón
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Cambiar tema');
    themeToggle.setAttribute('title', 'Cambiar tema (claro/oscuro/sistema)');
    themeToggle.innerHTML = `
      <i class="fas fa-sun" aria-hidden="true"></i>
      <i class="fas fa-moon" aria-hidden="true"></i>
    `;
    
    // Vincular evento de clic
    themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Insertar al final del body
    document.body.appendChild(themeToggle);
    
    // Actualizar el estado inicial del botón
    this.updateToggleButton();
  }

  /**
   * Actualiza la apariencia del botón según el tema actual
   */
  updateToggleButton() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    // Limpiar clases
    themeToggle.classList.remove('light', 'dark', 'system');
    
    // Añadir clase según el tema actual
    themeToggle.classList.add(this.actualTheme);
    
    // Actualizar texto del título según el tema
    const nextTheme = this.getNextThemeName();
    themeToggle.setAttribute('title', `Cambiar a tema ${nextTheme}`);
  }

  /**
   * Obtiene el nombre del siguiente tema en el ciclo para mostrar en el tooltip
   */
  getNextThemeName() {
    switch (this.currentTheme) {
      case this.THEMES.LIGHT:
        return 'oscuro';
      case this.THEMES.DARK:
        return 'sistema';
      default:
        return 'claro';
    }
  }

  /**
   * Configura el detector de cambios en preferencias del sistema
   */
  setupSystemPreferenceListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.currentTheme === this.THEMES.SYSTEM) {
        this.applyTheme();
      }
    });
  }

  /**
   * Muestra una notificación sobre el cambio de tema
   */
  showThemeChangeNotification() {
    let themeName;
    switch (this.currentTheme) {
      case this.THEMES.LIGHT:
        themeName = 'claro';
        break;
      case this.THEMES.DARK:
        themeName = 'oscuro';
        break;
      default:
        themeName = 'sistema';
    }
    
    // Verificar si existe función de notificación
    if (window.mostrarNotificacion) {
      window.mostrarNotificacion(`Tema cambiado a: ${themeName}`, 'info');
    } else {
      // Crear una notificación simple si no existe el sistema de notificaciones
      this.showSimpleNotification(`Tema cambiado a: ${themeName}`);
    }
  }

  /**
   * Muestra una notificación simple para el cambio de tema
   */
  showSimpleNotification(message) {
    // Verificar si ya existe una notificación y eliminarla
    const existingNotification = document.querySelector('.theme-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.textContent = message;
    
    // Estilos para la notificación
    Object.assign(notification.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      padding: '10px 15px',
      backgroundColor: 'var(--primary-color)',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      zIndex: '1000',
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: '0',
      transform: 'translateY(10px)'
    });
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Forzar un reflow para que la transición funcione
    notification.offsetHeight;
    
    // Mostrar con animación
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(10px)';
      
      // Eliminar del DOM después de la transición
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Dispara un evento personalizado cuando cambia el tema
   */
  dispatchThemeChangeEvent() {
    const event = new CustomEvent('themeChange', {
      detail: {
        theme: this.currentTheme,
        actualTheme: this.actualTheme
      }
    });
    document.dispatchEvent(event);
  }
}

// Iniciar el gestor de tema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Crear instancia global
  window.themeManager = new ThemeManager();
});

// Si el DOM ya está cargado (cuando el script se carga tarde)
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  window.themeManager = new ThemeManager();
}