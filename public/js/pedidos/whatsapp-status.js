/**
 * Módulo para gestionar la integración de WhatsApp en la interfaz
 * Comprueba periódicamente el estado de la conexión y muestra indicadores visuales
 */

// Objeto para gestionar el estado de WhatsApp
const WhatsAppStatus = {
    connected: false,
    checking: false,
    qrAvailable: false,
    lastCheck: null,
    checkInterval: null,
    
    // Inicializa el módulo y comienza a comprobar el estado
    init() {
        console.log('Inicializando módulo WhatsApp Status...');
        
        // Crear elementos de UI si no existen
        this.createStatusElements();
        
        // Iniciar comprobaciones periódicas
        this.startChecking();
        
        // Configurar el modal para escanear código QR
        this.setupQrModal();
        
        // Agregar manejadores de eventos
        document.getElementById('btn-restart-whatsapp').addEventListener('click', () => {
            this.restartWhatsApp();
        });
    },
    
    // Crea los elementos de interfaz necesarios
    createStatusElements() {
        if (!document.getElementById('whatsapp-status-container')) {
            // Crear contenedor para el estado en la parte superior derecha
            const statusContainer = document.createElement('div');
            statusContainer.id = 'whatsapp-status-container';
            statusContainer.className = 'whatsapp-status-container position-fixed';
            statusContainer.style.top = '70px';
            statusContainer.style.right = '15px';
            statusContainer.style.zIndex = '1000';
            
            // Crear el indicador
            statusContainer.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-sm btn-light border shadow-sm dropdown-toggle" type="button" id="whatsapp-status-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <span class="whatsapp-connection-indicator disconnected"></span>
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <div class="dropdown-menu dropdown-menu-right" aria-labelledby="whatsapp-status-dropdown">
                        <h6 class="dropdown-header">Estado de WhatsApp</h6>
                        <div id="whatsapp-status-details" class="px-4 py-2">
                            <div class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="sr-only">Cargando...</span>
                                </div>
                                Verificando estado...
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" type="button" id="btn-show-qr">
                            <i class="fas fa-qrcode"></i> Escanear código QR
                        </button>
                        <button class="dropdown-item" type="button" id="btn-restart-whatsapp">
                            <i class="fas fa-sync-alt"></i> Reiniciar conexión
                        </button>
                    </div>
                </div>
            `;
            
            // Agregar a la página
            document.body.appendChild(statusContainer);
            
            // Configurar evento para mostrar el código QR
            document.getElementById('btn-show-qr').addEventListener('click', () => {
                this.showQrCode();
            });
        }
        
        // Crear modal de código QR si no existe
        if (!document.getElementById('whatsappQrModal')) {
            const qrModal = document.createElement('div');
            qrModal.id = 'whatsappQrModal';
            qrModal.className = 'modal fade';
            qrModal.setAttribute('tabindex', '-1');
            qrModal.setAttribute('role', 'dialog');
            qrModal.setAttribute('aria-labelledby', 'whatsappQrModalLabel');
            qrModal.setAttribute('aria-hidden', 'true');
            
            qrModal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title" id="whatsappQrModalLabel">
                                <i class="fab fa-whatsapp"></i> Conectar WhatsApp
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Cerrar">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div id="whatsapp-qr-container" class="text-center p-3">
                                <div id="whatsapp-qr-loading">
                                    <div class="spinner-border text-success" role="status">
                                        <span class="sr-only">Cargando...</span>
                                    </div>
                                    <p class="mt-2">Obteniendo código QR...</p>
                                </div>
                                <div id="whatsapp-qr-code" class="d-none">
                                    <canvas id="qrcode-canvas"></canvas>
                                </div>
                                <div id="whatsapp-qr-error" class="d-none">
                                    <div class="alert alert-danger mt-3">
                                        <i class="fas fa-exclamation-circle"></i> No se pudo obtener el código QR.
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-info mt-3">
                                <ol class="mb-0">
                                    <li>Abra WhatsApp en su teléfono</li>
                                    <li>Toque Menú <i class="fas fa-ellipsis-v"></i> o Configuración <i class="fas fa-cog"></i></li>
                                    <li>Seleccione "Dispositivos vinculados" y luego "Vincular un dispositivo"</li>
                                    <li>Escanee este código QR con su cámara</li>
                                </ol>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
                            <button type="button" id="btn-refresh-qr" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Actualizar código QR
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(qrModal);
        }
    },
    
    // Inicia el proceso de comprobación periódica
    startChecking() {
        // Comprobar inmediatamente
        this.checkStatus();
        
        // Configurar comprobación periódica cada 30 segundos
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(() => {
            this.checkStatus();
        }, 30000);
    },
    
    // Comprueba el estado actual de WhatsApp
    async checkStatus() {
        if (this.checking) return;
        
        this.checking = true;
        const statusIndicator = document.querySelector('.whatsapp-connection-indicator');
        
        try {
            const response = await fetch('/api/whatsapp/status', {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            const data = await response.json();
            this.lastCheck = new Date();
            
            // Actualizar estado
            if (data.success) {
                this.connected = data.data.connected;
                this.qrAvailable = data.data.hasQr;
                this.error = data.data.error;
                
                // Actualizar indicador visual
                if (statusIndicator) {
                    statusIndicator.className = 'whatsapp-connection-indicator';
                    
                    if (data.data.initializing) {
                        statusIndicator.classList.add('connecting');
                    } else if (data.data.connected) {
                        statusIndicator.classList.add('connected');
                    } else {
                        statusIndicator.classList.add('disconnected');
                    }
                }
                
                // Actualizar detalles
                const statusDetails = document.getElementById('whatsapp-status-details');
                if (statusDetails) {
                    if (data.data.initializing) {
                        statusDetails.innerHTML = `
                            <div class="text-center">
                                <div class="spinner-border spinner-border-sm text-warning" role="status">
                                    <span class="sr-only">Conectando...</span>
                                </div>
                                <div class="mt-1">Conectando...</div>
                            </div>
                        `;
                    } else if (data.data.connected) {
                        statusDetails.innerHTML = `
                            <div class="text-success mb-2">
                                <i class="fas fa-check-circle"></i> Conectado
                            </div>
                            <small class="text-muted">
                                Última verificación:<br>
                                ${this.lastCheck.toLocaleTimeString()}
                            </small>
                        `;
                    } else {
                        statusDetails.innerHTML = `
                            <div class="text-danger mb-2">
                                <i class="fas fa-times-circle"></i> Desconectado
                            </div>
                            ${this.error ? `<small class="text-danger">${this.error}</small><br>` : ''}
                            <small class="text-muted">
                                Última verificación:<br>
                                ${this.lastCheck.toLocaleTimeString()}
                            </small>
                        `;
                    }
                }
                
                // Si hay un botón "Mostrar código QR", habilitar o deshabilitar según disponibilidad
                const btnShowQr = document.getElementById('btn-show-qr');
                if (btnShowQr) {
                    btnShowQr.disabled = !this.qrAvailable && data.data.connected;
                }
            }
        } catch (error) {
            console.error('Error al comprobar estado de WhatsApp:', error);
            // Marcar como desconectado en caso de error
            this.connected = false;
            
            if (statusIndicator) {
                statusIndicator.className = 'whatsapp-connection-indicator disconnected';
            }
            
            const statusDetails = document.getElementById('whatsapp-status-details');
            if (statusDetails) {
                statusDetails.innerHTML = `
                    <div class="text-danger">
                        <i class="fas fa-exclamation-triangle"></i> Error al comprobar estado
                    </div>
                    <small class="text-muted">
                        Intente reiniciar la conexión
                    </small>
                `;
            }
        } finally {
            this.checking = false;
        }
    },
    
    // Configura el modal para escanear código QR
    setupQrModal() {
        // Configurar evento para el botón de refrescar código QR
        const btnRefreshQr = document.getElementById('btn-refresh-qr');
        if (btnRefreshQr) {
            btnRefreshQr.addEventListener('click', () => {
                this.restartWhatsApp();
                this.showQrCode();
            });
        }
        
        // Configurar eventos para el modal de QR
        const qrModal = document.getElementById('whatsappQrModal');
        if (qrModal) {
            $(qrModal).on('show.bs.modal', () => {
                this.loadQrCode();
            });
        }
    },
    
    // Muestra el modal de código QR para escanear
    showQrCode() {
        $('#whatsappQrModal').modal('show');
    },
    
    // Carga el código QR desde el servidor
    async loadQrCode() {
        // Mostrar spinner
        document.getElementById('whatsapp-qr-loading').classList.remove('d-none');
        document.getElementById('whatsapp-qr-code').classList.add('d-none');
        document.getElementById('whatsapp-qr-error').classList.add('d-none');
        
        try {
            // Comprobar estado para ver si hay QR disponible
            await this.checkStatus();
            
            if (this.qrAvailable) {
                // Cargar el código QR como una imagen o texto
                const qrCodeFile = '/temp/whatsapp-qr.txt';
                
                // Hacer una petición para obtener el contenido del QR como texto
                const qrResponse = await fetch(qrCodeFile);
                if (!qrResponse.ok) {
                    throw new Error('No se pudo cargar el código QR');
                }
                
                const qrText = await qrResponse.text();
                console.log('Texto QR recibido:', qrText.substring(0, 20) + '...');
                
                // Limpiar contenedor existente
                const container = document.getElementById('whatsapp-qr-code');
                container.innerHTML = '';
                
                // Intentar usar la biblioteca QRCode.js incluida en la página
                try {
                    // Crear un nuevo div para contener el QR
                    const qrContainer = document.createElement('div');
                    qrContainer.style.margin = '0 auto';
                    qrContainer.style.width = '256px';
                    qrContainer.style.height = '256px';
                    container.appendChild(qrContainer);
                    
                    // Verificamos si QRCode está disponible en el ámbito global
                    if (typeof QRCode !== 'undefined') {
                        // Crear un nuevo código QR
                        new QRCode(qrContainer, {
                            text: qrText.trim(),
                            width: 256,
                            height: 256,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.H
                        });
                        console.log('QR generado exitosamente con la biblioteca QRCode.js');
                    } else {
                        throw new Error('Biblioteca QRCode.js no disponible');
                    }
                } catch (qrError) {
                    console.error('Error al generar QR con la biblioteca:', qrError);
                    
                    // Si falla el método anterior, mostramos el QR como texto para que los usuarios 
                    // puedan al menos copiarlo y usarlo manualmente
                    const qrTextDisplay = document.createElement('div');
                    qrTextDisplay.className = 'alert alert-info';
                    qrTextDisplay.innerHTML = `
                        <p><strong>Código QR (texto):</strong></p>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; max-height: 200px; overflow-y: auto; font-family: monospace;">
                            ${qrText}
                        </div>
                        <p class="mt-2 mb-0">
                            <small class="text-muted">Si el código QR no se muestra correctamente, 
                            puede copiar este texto y usarlo en un generador de QR online.</small>
                        </p>
                    `;
                    container.appendChild(qrTextDisplay);
                }
                
                // Mostrar el contenido del QR
                document.getElementById('whatsapp-qr-loading').classList.add('d-none');
                document.getElementById('whatsapp-qr-code').classList.remove('d-none');
            } else if (this.connected) {
                // Si ya está conectado, mostrar mensaje indicándolo
                document.getElementById('whatsapp-qr-loading').classList.add('d-none');
                document.getElementById('whatsapp-qr-error').classList.remove('d-none');
                document.getElementById('whatsapp-qr-error').innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> WhatsApp ya está conectado. No es necesario escanear un código QR.
                    </div>
                `;
            } else {
                // No hay QR disponible, mostrar error
                document.getElementById('whatsapp-qr-loading').classList.add('d-none');
                document.getElementById('whatsapp-qr-error').classList.remove('d-none');
                document.getElementById('whatsapp-qr-error').innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> No hay código QR disponible en este momento. Intente reiniciar la conexión.
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error al cargar código QR:', error);
            document.getElementById('whatsapp-qr-loading').classList.add('d-none');
            document.getElementById('whatsapp-qr-error').classList.remove('d-none');
            document.getElementById('whatsapp-qr-error').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle"></i> Error al generar el código QR: ${error.message}
                </div>
                <button class="btn btn-outline-primary mt-2" id="btn-intentar-qr">
                    <i class="fas fa-redo"></i> Intentar nuevamente
                </button>
            `;
            
            // Agregar evento al botón de reintentar
            document.getElementById('btn-intentar-qr')?.addEventListener('click', () => {
                this.loadQrCode();
            });
        }
    },
    
    // Reinicia la conexión de WhatsApp
    async restartWhatsApp() {
        const statusDetails = document.getElementById('whatsapp-status-details');
        if (statusDetails) {
            statusDetails.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm text-warning" role="status">
                        <span class="sr-only">Reiniciando...</span>
                    </div>
                    <div class="mt-1">Reiniciando conexión...</div>
                </div>
            `;
        }
        
        try {
            const response = await fetch('/api/whatsapp/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Mostrar notificación
                if (window.showNotification) {
                    showNotification('La conexión de WhatsApp se está reiniciando', 'info');
                } else {
                    alert('La conexión de WhatsApp se está reiniciando');
                }
                
                // Actualizar estado inmediatamente
                this.checkStatus();
            } else {
                throw new Error(data.message || 'Error al reiniciar WhatsApp');
            }
        } catch (error) {
            console.error('Error al reiniciar WhatsApp:', error);
            
            // Mostrar notificación de error
            if (window.showNotification) {
                showNotification('Error al reiniciar la conexión de WhatsApp', 'error');
            } else {
                alert('Error al reiniciar la conexión de WhatsApp: ' + error.message);
            }
        }
    },
    
    // Comprueba si WhatsApp está conectado
    isConnected() {
        return this.connected;
    },
    
    // Comprueba si hay un QR disponible
    isQrAvailable() {
        return this.qrAvailable;
    }
};

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño retardo para asegurar que otros scripts ya se han cargado
    setTimeout(() => {
        WhatsAppStatus.init();
        
        // Exponer globalmente para que otros scripts puedan acceder
        window.WhatsAppStatus = WhatsAppStatus;
    }, 1000);
});