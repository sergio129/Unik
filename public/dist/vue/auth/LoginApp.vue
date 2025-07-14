<template>
  <div class="login-container">
    <div class="login-header">
      <div class="login-logo" ref="logoContainer">
        <img v-if="logoLoaded" src="/images/logo.png" @error="handleLogoError" alt="Logo La UNIKA">
        <div v-else class="logo-fallback">UNIKA</div>
      </div>
      <h1>Sistema La UNIKA</h1>
      <p>Gestión de Negocio</p>
      <div class="version-tag">
        <i class="fas fa-code-branch"></i> Versión Vue.js
      </div>
    </div>
    
    <div class="login-form">
      <!-- Mensajes de error y éxito -->
      <div v-if="showError" class="error-message" :class="{ 'shake': isAnimating }">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMessage }}</span>
      </div>
      
      <div v-if="showSuccess" class="success-message">
        <i class="fas fa-check-circle"></i>
        <span>{{ successMessage }}</span>
      </div>
      
      <!-- Formulario de login -->
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Usuario</label>
          <div class="input-group">
            <input 
              type="text" 
              id="username" 
              v-model="username" 
              class="form-control" 
              placeholder="Ingrese su usuario" 
              autocomplete="username" 
              required
            >
            <i class="fas fa-user"></i>
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="input-group">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="password" 
              v-model="password" 
              class="form-control" 
              placeholder="Ingrese su contraseña" 
              autocomplete="current-password" 
              required
            >
            <i 
              :class="showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'" 
              class="toggle-password" 
              @click="togglePassword"
            ></i>
          </div>
        </div>
        
        <div class="form-group">
          <label for="role">Ingresar como</label>
          <div class="input-group role-group">
            <select id="role" v-model="selectedRole" class="form-control">
              <option value="vendedor">Asesor / Vendedor</option>
              <option value="admin">Administrador</option>
              <option value="inventario">Inventario</option>
            </select>
            <i class="fas fa-user-tag"></i>
          </div>
        </div>

        <div class="form-options">
          <div class="remember-me">
            <input type="checkbox" id="rememberMe" v-model="rememberMe">
            <label for="rememberMe">Recordar sesión</label>
          </div>
          <div class="forgot-password">
            <a href="#" @click.prevent="openResetModal">¿Olvidaste tu contraseña?</a>
          </div>
        </div>
        
        <button 
          type="submit" 
          class="login-btn" 
          :disabled="isLoading"
        >
          <i v-if="!isLoading" class="fas fa-sign-in-alt"></i>
          <i v-else class="fas fa-spinner fa-spin"></i>
          {{ isLoading ? 'Procesando...' : 'Iniciar Sesión' }}
        </button>
      </form>
      
      <div class="form-footer">
        <p>&copy; {{ currentYear }} La UNIKA - Todos los derechos reservados</p>
      </div>
      
      <div class="login-alternate">
        <a href="/login.html" class="alternate-link">
          <i class="fas fa-arrow-left"></i> Regresar a versión original
        </a>
      </div>
    </div>
  </div>

  <!-- Modal para recuperación de contraseña -->
  <teleport to="body">
    <div v-if="showResetModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="closeResetModal">&times;</span>
        <h2>Recuperar Contraseña</h2>
        <p>Ingresa tu correo electrónico para recibir instrucciones de recuperación.</p>
        <form @submit.prevent="handlePasswordReset">
          <div class="form-group">
            <label for="resetEmail">Correo Electrónico</label>
            <div class="input-group">
              <input 
                type="email" 
                id="resetEmail" 
                v-model="resetEmail" 
                class="form-control" 
                placeholder="Ingrese su correo" 
                required
              >
              <i class="fas fa-envelope"></i>
            </div>
          </div>
          <button type="submit" class="reset-btn" :disabled="isResetting">
            <i v-if="!isResetting" class="fas fa-paper-plane"></i>
            <i v-else class="fas fa-spinner fa-spin"></i>
            {{ isResetting ? 'Enviando...' : 'Enviar Instrucciones' }}
          </button>
        </form>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';

export default defineComponent({
  name: 'LoginApp',
  
  setup() {
    // Estado del formulario
    const username = ref('');
    const password = ref('');
    const selectedRole = ref('vendedor');
    const rememberMe = ref(false);
    const resetEmail = ref('');
    
    // Estado de UI
    const showPassword = ref(false);
    const showError = ref(false);
    const showSuccess = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');
    const isLoading = ref(false);
    const isResetting = ref(false);
    const showResetModal = ref(false);
    const isAnimating = ref(false);
    const logoLoaded = ref(false);
    
    // Año actual para el footer
    const currentYear = computed(() => new Date().getFullYear());
    
    // Manejo de logo
    const handleLogoError = () => {
      logoLoaded.value = false;
    };
    
    // Comprobar si existe una sesión al cargar
    onMounted(() => {
      // Intentar cargar logo
      const img = new Image();
      img.onload = () => {
        logoLoaded.value = true;
      };
      img.onerror = () => {
        logoLoaded.value = false;
      };
      img.src = '/images/logo.png';
      
      // Cargar credenciales guardadas
      loadSavedCredentials();
      
      // Verificar sesión existente
      checkExistingSession();
    });
    
    // Función para alternar visibilidad de la contraseña
    const togglePassword = () => {
      showPassword.value = !showPassword.value;
    };
    
    // Función para abrir/cerrar modal de recuperación
    const openResetModal = () => {
      showResetModal.value = true;
    };
    
    const closeResetModal = () => {
      showResetModal.value = false;
      resetEmail.value = '';
    };
    
    // Función para verificar sesión existente
    const checkExistingSession = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Solo redireccionar si ya hay token
          if (window.location.pathname.includes('login')) {
            // Opcionalmente verificar validez del token
            // verifyTokenAndRedirect(token);
          }
        } catch (error) {
          console.log('No hay sesión activa válida');
          localStorage.removeItem('token');
        }
      }
    };
    
    // Función para guardar credenciales
    const saveCredentials = (username: string, rememberMe: boolean) => {
      if (rememberMe) {
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('savedUsername');
      }
    };
    
    // Función para cargar credenciales guardadas
    const loadSavedCredentials = () => {
      const savedUsername = localStorage.getItem('savedUsername');
      if (savedUsername) {
        username.value = savedUsername;
        rememberMe.value = true;
      }
    };
    
    // Función para mostrar error
    const showErrorMessage = (message: string) => {
      errorMessage.value = message;
      showError.value = true;
      showSuccess.value = false;
      
      // Animación de shake
      isAnimating.value = true;
      setTimeout(() => {
        isAnimating.value = false;
      }, 500);
      
      // Reproducir sonido de error
      playSound('sounds/error.mp3');
      
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => {
        showError.value = false;
      }, 5000);
    };
    
    // Función para mostrar mensaje de éxito
    const showSuccessMessage = (message: string) => {
      successMessage.value = message;
      showSuccess.value = true;
      showError.value = false;
      
      // Reproducir sonido de éxito
      playSound('sounds/success.mp3');
    };
    
    // Función para reproducir sonidos
    const playSound = (soundPath: string) => {
      try {
        const audio = new Audio(soundPath);
        audio.volume = 0.5;
        audio.play().catch(err => console.log('No se pudo reproducir el sonido:', err));
      } catch (err) {
        console.log('Error al reproducir sonido:', err);
      }
    };
    
    // Manejar envío del formulario de login
    const handleLogin = async () => {
      // Validación básica
      if (!username.value.trim()) {
        showErrorMessage('Por favor, ingrese su nombre de usuario');
        return;
      }
      
      if (!password.value) {
        showErrorMessage('Por favor, ingrese su contraseña');
        return;
      }
      
      try {
        // Mostrar indicador de carga
        isLoading.value = true;
        
        // Realizar la petición al backend
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username.value.trim(),
            password: password.value,
            role: selectedRole.value
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Verificar si el rol del usuario coincide con el rol seleccionado
          if (data.user.rol !== selectedRole.value) {
            showErrorMessage(`Acceso denegado: No tiene permisos para ingresar como ${selectedRole.value === 'admin' ? 'administrador' : 
                            selectedRole.value === 'vendedor' ? 'asesor/vendedor' : 'inventario'}`);
            isLoading.value = false;
            return;
          }
          
          // Guardar credenciales si se seleccionó "recordar"
          saveCredentials(username.value, rememberMe.value);
          
          // Guardar token y datos del usuario en localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          showSuccessMessage('Inicio de sesión exitoso. Redirigiendo...');
          
          // Redireccionar según el rol del usuario
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          showErrorMessage(data.message || 'Error al iniciar sesión. Verifique sus credenciales.');
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        showErrorMessage('Error de conexión con el servidor. Intente nuevamente más tarde.');
      } finally {
        isLoading.value = false;
      }
    };
    
    // Manejar envío del formulario de recuperación de contraseña
    const handlePasswordReset = async () => {
      try {
        isResetting.value = true;
        
        // Petición al servidor para reset de contraseña
        const response = await fetch('/api/auth/reset-password-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: resetEmail.value })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showSuccessMessage('Instrucciones enviadas a tu correo electrónico');
          closeResetModal();
        } else {
          showErrorMessage(data.message || 'Error al procesar la solicitud');
        }
      } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Error de conexión con el servidor');
      } finally {
        isResetting.value = false;
      }
    };
    
    return {
      // Estado
      username,
      password,
      selectedRole,
      rememberMe,
      resetEmail,
      showPassword,
      showError,
      showSuccess,
      errorMessage,
      successMessage,
      isLoading,
      isResetting,
      showResetModal,
      currentYear,
      isAnimating,
      logoLoaded,
      
      // Métodos
      togglePassword,
      openResetModal,
      closeResetModal,
      handleLogin,
      handlePasswordReset,
      handleLogoError
    };
  }
});
</script>

<style scoped>
/* Estilos adicionales específicos del componente */
.login-alternate {
  margin-top: 20px;
  text-align: center;
}

.alternate-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: opacity 0.3s;
}

.alternate-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* Clase para animación shake */
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}
</style>