import { createApp } from 'vue';
import LoginApp from './LoginApp.vue';
import './styles.css'; // Opcional para estilos adicionales

// Crear la instancia de la aplicación Vue
const app = createApp(LoginApp);

// Montarla en el elemento designado
app.mount('#vue-login-app');

// Exponer la aplicación para debugging
if (import.meta.env.DEV) {
  console.log('Vue auth app initialized in development mode');
}

// Manejador para el spinner de carga
window.addEventListener('DOMContentLoaded', () => {
  const spinnerOverlay = document.getElementById('spinner-overlay');
  if (spinnerOverlay) {
    spinnerOverlay.classList.add('active');
    
    // Ocultar spinner después de que la app esté cargada
    window.addEventListener('vue-app-loaded', () => {
      spinnerOverlay.classList.remove('active');
    });
    
    // Fallback por si el evento nunca se dispara
    setTimeout(() => {
      spinnerOverlay.classList.remove('active');
    }, 2000);
  }
});