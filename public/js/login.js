document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const errorText = document.getElementById('error-text');
    const successText = document.getElementById('success-text');
    const roleSelect = document.getElementById('role');
    
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
    }
    
    // Manejar envío del formulario
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const selectedRole = roleSelect.value;
        
        // Validación básica
        if (!username || !password) {
            showError('Por favor, complete todos los campos');
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