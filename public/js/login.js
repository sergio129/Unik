document.addEventListener('DOMContentLoaded', function() {
    // Cargar logo de manera segura para evitar bucles de error
    const logoContainer = document.getElementById('logoContainer');
    if (logoContainer) {
        const img = new Image();
        img.onload = function() {
            logoContainer.appendChild(img);
        };
        img.onerror = function() {
            // En caso de error, crear un elemento fallback en lugar de intentar cargar otra imagen
            const fallbackLogo = document.createElement('div');
            fallbackLogo.className = 'logo-fallback';
            fallbackLogo.textContent = 'UNIKA';
            logoContainer.appendChild(fallbackLogo);
        };
        // Solo intentar cargar la imagen una vez
        img.src = 'images/logo.png';
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const errorText = document.getElementById('error-text');
    const successText = document.getElementById('success-text');
    const roleSelect = document.getElementById('role');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const passwordResetModal = document.getElementById('passwordResetModal');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const closeModalBtn = document.querySelector('.close');
    
    // Ocultar mensajes de error y éxito al inicio
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Intentar cargar credenciales guardadas
    loadSavedCredentials();
    
    // Verificar si hay token guardado y redirigir si es válido
    checkExistingSession();
    
    // Toggle mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }
    
    // Abrir modal de recuperación de contraseña
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            passwordResetModal.style.display = 'block';
        });
    }
    
    // Cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            passwordResetModal.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target === passwordResetModal) {
            passwordResetModal.style.display = 'none';
        }
    });
    
    // Función para verificar si hay una sesión existente
    function checkExistingSession() {
        const token = localStorage.getItem('token');
        // Solo verificar si existe un token, no realizar peticiones automáticas
        if (token) {
            // Solo redirigir si estamos en la página de login y ya hay token
            if (window.location.pathname.includes('login')) {
                try {
                    // Verificación opcional - se puede habilitar si es necesario
                    // verifyTokenAndRedirect(token);
                } catch (error) {
                    console.log('No hay sesión activa válida');
                    // Limpiar token inválido
                    localStorage.removeItem('token');
                }
            }
        }
    }
    
    // Función para verificar token y redirigir - desactivada por defecto
    async function verifyTokenAndRedirect(token) {
        try {
            const response = await fetch('/api/auth/verificar-token', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.auth) {
                    const user = JSON.parse(localStorage.getItem('user')) || {};
                    switch(user.rol) {
                        case 'admin':
                            window.location.href = '/dashboard';
                            break;
                        case 'vendedor':
                            window.location.href = '/dashboard';
                            break;
                        case 'inventario':
                            window.location.href = '/dashboard';
                            break;
                        default:
                            window.location.href = '/dashboard';
                    }
                }
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            console.error('Error verificando token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
    
    // Procesar formulario de recuperación de contraseña
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            
            try {
                const response = await fetch('/api/auth/reset-password-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess('Instrucciones enviadas a tu correo electrónico');
                    passwordResetModal.style.display = 'none';
                    resetPasswordForm.reset();
                } else {
                    showError(data.message || 'Error al procesar la solicitud');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Error de conexión con el servidor');
            }
        });
    }
    
    // Función para guardar credenciales
    function saveCredentials(username, rememberMe) {
        if (rememberMe) {
            localStorage.setItem('savedUsername', username);
        } else {
            localStorage.removeItem('savedUsername');
        }
    }
    
    // Función para cargar credenciales guardadas
    function loadSavedCredentials() {
        const savedUsername = localStorage.getItem('savedUsername');
        
        if (savedUsername) {
            usernameInput.value = savedUsername;
            rememberMeCheckbox.checked = true;
        }
    }
    
    // Validación en tiempo real para mejorar UX
    usernameInput.addEventListener('input', function() {
        validateInput(usernameInput, 'Por favor ingrese un nombre de usuario válido');
    });
    
    passwordInput.addEventListener('input', function() {
        validateInput(passwordInput, 'La contraseña debe tener al menos 6 caracteres');
    });
    
    function validateInput(input, message) {
        const isValid = input.checkValidity();
        
        if (!isValid) {
            input.classList.add('input-error');
            input.setCustomValidity(message);
        } else {
            input.classList.remove('input-error');
            input.setCustomValidity('');
        }
        
        return isValid;
    }
    
    // Función para mostrar mensaje de error
    function showError(message) {
        errorText.innerText = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Añadir animación de shake
        loginForm.classList.add('shake');
        setTimeout(() => {
            loginForm.classList.remove('shake');
        }, 500);
        
        // Reproducir sonido de error si existe
        playSound('sounds/error.mp3');
        
        // Ocultar mensaje después de 5 segundos
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // Función para mostrar mensaje de éxito
    function showSuccess(message) {
        successText.innerText = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Reproducir sonido de éxito si existe
        playSound('sounds/success.mp3');
    }
    
    // Función para reproducir sonidos
    function playSound(soundPath) {
        try {
            const audio = new Audio(soundPath);
            audio.volume = 0.5;
            audio.play().catch(err => console.log('No se pudo reproducir el sonido:', err));
        } catch (err) {
            console.log('Error al reproducir sonido:', err);
        }
    }
    
    // Manejar envío del formulario
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const selectedRole = roleSelect.value;
        const rememberMe = rememberMeCheckbox.checked;
        
        // Validación básica con feedback visual
        if (!username) {
            showError('Por favor, ingrese su nombre de usuario');
            usernameInput.focus();
            return;
        }
        
        if (!password) {
            showError('Por favor, ingrese su contraseña');
            passwordInput.focus();
            return;
        }
        
        try {
            // Mostrar indicador de carga
            const loginButton = document.querySelector('.login-btn');
            const originalButtonText = loginButton.innerHTML;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            loginButton.disabled = true;
            
            // Realizar la petición al backend
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, role: selectedRole })
            });
            
            const data = await response.json();
            
            // Restaurar botón
            loginButton.innerHTML = originalButtonText;
            loginButton.disabled = false;
            
            if (response.ok && data.success) {
                // Verificar si el rol del usuario coincide con el rol seleccionado
                if (data.user.rol !== selectedRole) {
                    showError(`Acceso denegado: No tiene permisos para ingresar como ${selectedRole === 'admin' ? 'administrador' : 
                              selectedRole === 'vendedor' ? 'asesor/vendedor' : 'inventario'}`);
                    return;
                }
                
                // Guardar credenciales si se seleccionó "recordar"
                saveCredentials(username, rememberMe);
                
                // Guardar token y datos del usuario en localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showSuccess('Inicio de sesión exitoso. Redirigiendo...');
                
                // Redireccionar según el rol del usuario
                setTimeout(() => {
                    switch(data.user.rol) {
                        case 'admin':
                            window.location.href = '/dashboard';
                            break;
                        case 'vendedor':
                            window.location.href = '/dashboard';
                            break;
                        case 'inventario':
                            window.location.href = '/dashboard';
                            break;
                        default:
                            window.location.href = '/dashboard';
                    }
                }, 1500);
            } else {
                showError(data.message || 'Error al iniciar sesión. Verifique sus credenciales.');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showError('Error de conexión con el servidor. Intente nuevamente más tarde.');
        }
    });
});