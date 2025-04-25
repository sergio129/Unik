class BarcodeScanner {
  constructor(options = {}) {
    this.options = {
      timeGap: options.timeGap || 100,
      minLength: options.minLength || 4,
      ...options
    };

    this.buffer = '';
    this.lastKeyTime = 0;
    this.onScan = options.onScan || (() => {});
    this.onError = options.onError || (() => {});
  }

  // Inicializar el escáner en un input
  setupInput(input) {
    if (!input) return;

    // Evitar configurar múltiples veces el mismo input
    if (input.dataset.hasScanner) return;
    input.dataset.hasScanner = 'true';

    input.addEventListener('keypress', this.handleKeyPress.bind(this));
    input.addEventListener('focus', () => {
      input.classList.add('scanner-active');
    });
    input.addEventListener('blur', () => {
      input.classList.remove('scanner-active');
    });
  }

  // Manejar evento keypress
  handleKeyPress(event) {
    const currentTime = new Date().getTime();

    // Si ha pasado mucho tiempo desde la última tecla, reiniciar el buffer
    if (currentTime - this.lastKeyTime > this.options.timeGap) {
      this.buffer = '';
    }

    // Actualizar el tiempo de la última tecla
    this.lastKeyTime = currentTime;

    // Añadir carácter al buffer
    this.buffer += event.key;

    // Si es un Enter, procesar el código
    if (event.key === 'Enter') {
      event.preventDefault();

      const code = this.buffer.slice(0, -1); // Remover el Enter
      if (code.length >= this.options.minLength) {
        this.processCode(code, event.target);
      }

      this.buffer = '';
    }
  }

  // Procesar el código escaneado
  async processCode(code, input) {
    try {
      // Validar el código según el tipo seleccionado
      const tipo = input.closest('.codigo-barras-item')?.querySelector('.tipo-codigo')?.value || 
                  document.getElementById('barcode-tipo')?.value || 'EAN13';
      
      if (!this.validateCode(code, tipo)) {
        throw new Error(`Código inválido para el tipo ${tipo}`);
      }

      // Si la validación es exitosa, llamar al callback onScan
      await this.onScan(code, tipo, input);
    } catch (error) {
      this.onError(error);
      // Limpiar el input
      input.value = '';
    }
  }

  // Validar el código según su tipo
  validateCode(code, tipo) {
    switch (tipo) {
      case 'EAN13':
        return /^\d{13}$/.test(code) && this.validateEANChecksum(code);
      case 'EAN8':
        return /^\d{8}$/.test(code) && this.validateEANChecksum(code);
      case 'CODE128':
        return /^[\x00-\x7F]+$/.test(code) && code.length >= 1;
      case 'UPC':
        return /^\d{12}$/.test(code) && this.validateUPCChecksum(code);
      case 'QR':
        return code.length > 0;
      case 'OTHER':
        return code.length > 0;
      default:
        console.warn('Tipo de código no reconocido:', tipo);
        return code.length > 0; // Ser más permisivo con tipos desconocidos
    }
  }
  
  // Validar checksum de códigos EAN
  validateEANChecksum(code) {
    const digits = code.split('').map(d => parseInt(d));
    const checkDigit = digits.pop(); // Extraer el último dígito (checksum)
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      // Para EAN, alternar entre multiplicar por 1 y 3
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    
    // El checksum es el dígito que hay que añadir para llegar al siguiente múltiplo de 10
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheckDigit;
  }
  
  // Validar checksum de códigos UPC
  validateUPCChecksum(code) {
    const digits = code.split('').map(d => parseInt(d));
    const checkDigit = digits.pop();
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheckDigit;
  }

  // Calcular dígito de control EAN
  calculateEANCheckDigit(code) {
    let sum = 0;
    const len = code.length;
    
    for (let i = 0; i < len; i++) {
      const digit = parseInt(code[i]);
      const multiplier = (i % 2 === 0) ? 1 : 3;
      sum += digit * multiplier;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit;
  }

  // Calcular dígito de control UPC
  calculateUPCCheckDigit(code) {
    let sum = 0;
    const len = code.length;
    
    for (let i = 0; i < len; i++) {
      const digit = parseInt(code[i]);
      const multiplier = (i % 2 === 0) ? 3 : 1;
      sum += digit * multiplier;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit;
  }

  // Generar código EAN-13
  generateEAN13() {
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    const checkDigit = this.calculateEANCheckDigit(code);
    return code + checkDigit;
  }

  // Generar código EAN-8
  generateEAN8() {
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    const checkDigit = this.calculateEANCheckDigit(code);
    return code + checkDigit;
  }

  // Generar código UPC
  generateUPC() {
    let code = '';
    for (let i = 0; i < 11; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    const checkDigit = this.calculateUPCCheckDigit(code);
    return code + checkDigit;
  }

  // Generar código CODE128
  generateCODE128(length = 10) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += String.fromCharCode(Math.floor(Math.random() * (122 - 48 + 1)) + 48);
    }
    
    return code;
  }
  
  // Método para generar cualquier tipo de código
  generateBarcode(tipo, customLength) {
    switch (tipo) {
      case 'EAN13':
        return this.generateEAN13();
      case 'EAN8':
        return this.generateEAN8();
      case 'UPC':
        return this.generateUPC();
      case 'CODE128':
        return this.generateCODE128(customLength || 10);
      case 'OTHER':
        return this.generateRandomAlphanumeric(customLength || 8);
      default:
        return this.generateEAN13();
    }
  }
  
  // Generar código alfanumérico aleatorio para tipos personalizados
  generateRandomAlphanumeric(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

// Exportar la clase
window.BarcodeScanner = BarcodeScanner;

// Utilidad para escanear códigos de barras usando la cámara web
// Esta implementación utiliza la biblioteca QuaggaJS (https://github.com/serratus/quaggaJS)

let quaggaInstance = null;

// Función para iniciar el escáner de códigos de barras usando la cámara web
function initBarcodeScanner(previewElement, onDetected) {
  if (typeof Quagga === 'undefined') {
    loadQuaggaScript(() => {
      startScanner(previewElement, onDetected);
    });
  } else {
    startScanner(previewElement, onDetected);
  }
}

// Función para cargar el script de Quagga si no está disponible
function loadQuaggaScript(callback) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

// Función principal para iniciar el escáner
function startScanner(previewElement, onDetected) {
  if (!previewElement) {
    console.error('Elemento de vista previa no encontrado');
    return;
  }

  // Debug adicional
  console.log("DEBUG: Iniciando escáner con elemento:", previewElement);
  console.log("DEBUG: Callback onDetected disponible:", typeof onDetected === 'function');

  // Actualizar mensaje si existe
  if (document.querySelector('.scanner-message')) {
    document.querySelector('.scanner-message').textContent = 'Solicitando acceso a la cámara...';
  }

  // Configuraciones optimizadas para dispositivos móviles
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Usar configuraciones específicas dependiendo del dispositivo
  const videoConstraints = isMobile ? 
    { 
      facingMode: { exact: "environment" },
      width: { min: 640, ideal: 1280, max: 1920 },
      height: { min: 480, ideal: 720, max: 1080 }
    } : 
    { 
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };

  // Verificar permisos de cámara
  navigator.mediaDevices.getUserMedia({ 
    video: videoConstraints,
    audio: false
  })
  .catch(function(err) {
    console.error("Error al acceder a la cámara:", err);
    
    // Si falla la cámara trasera en móviles, intentar con configuración más flexible
    if (isMobile && err.name === "OverconstrainedError") {
      console.log("Intentando con configuración alternativa para móviles...");
      return navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { min: 320, ideal: 640 },
          height: { min: 240, ideal: 480 }
        }, 
        audio: false 
      });
    }
    
    if (document.querySelector('.scanner-message')) {
      document.querySelector('.scanner-message').textContent = 'Error al acceder a la cámara. Verifica los permisos.';
    }
    if (typeof window.showToast === 'function') {
      window.showToast("No se pudo acceder a la cámara. Verifique los permisos o intente en otro navegador.", 'error');
    } else {
      console.error("No se pudo acceder a la cámara. Verifique los permisos o intente en otro navegador.");
    }
    cameraFallbackSolution(err.name === "OverconstrainedError" ? 'hardware' : 'permission');
    return Promise.reject(err);
  })
  .then(function(stream) {
    // Si llegamos aquí, tenemos acceso a la cámara
    if (document.querySelector('.scanner-message')) {
      document.querySelector('.scanner-message').textContent = 'Cámara activada, preparando escáner...';
    }
    
    // Inicializar Quagga
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: previewElement,
        constraints: videoConstraints,
        area: {
          top: "25%",
          right: "10%",
          left: "10%",
          bottom: "25%"
        },
      },
      locator: {
        patchSize: isMobile ? "medium" : "large",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 4) : 2,
      frequency: 10,
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ]
      },
    }, function(err) {
      if (err) {
        console.error("Error al iniciar el escáner:", err);
        if (document.querySelector('.scanner-message')) {
          document.querySelector('.scanner-message').textContent = 'Error al iniciar el escáner de códigos';
        }
        cameraFallbackSolution('hardware');
        return;
      }
      
      console.log("Escáner de códigos de barras iniciado");
      quaggaInstance = Quagga;
      
      // Actualizar mensaje cuando la cámara esté lista
      if (document.querySelector('.scanner-message')) {
        document.querySelector('.scanner-message').textContent = 'Coloque el código de barras frente a la cámara';
      }
      
      Quagga.start();
      
      // Mejorar la detección para evitar falsos positivos
      let lastCode = null;
      let lastCodeTime = 0;
      const validationDelay = 500; // 500ms entre detecciones para validación
      
      Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
          const code = result.codeResult.code;
          const format = result.codeResult.format;
          const confidence = result.codeResult.confidence;
          const now = new Date().getTime();
          
          console.log(`Código detectado: ${code}, formato: ${format}, confianza: ${confidence}`);
          
          // Validar solo si el código parece legítimo
          if (code.length > 0) {
            // Si es el mismo código que detectamos recientemente, considerarlo válido
            if (code === lastCode && (now - lastCodeTime) < 2000) {
              console.log("DEBUG: Código validado después de múltiples detecciones:", code);
              
              // CAMBIO IMPORTANTE: Detenga el escáner antes de llamar al callback
              Quagga.stop();
              quaggaInstance = null;
              
              // Notificar al usuario que se ha detectado un código
              if (typeof window.showToast === 'function') {
                window.showToast(`Código detectado: ${code}`, 'success');
              }
              
              console.log("DEBUG: Deteniendo escáner y llamando al callback con código:", code);
              
              if (typeof onDetected === 'function') {
                // Llamar al callback con el código detectado
                onDetected(code);
                
                // NUEVO: Verificación después de llamar al callback
                console.log("DEBUG: Callback onDetected ejecutado para el código:", code);
                
                // NUEVO: Verificación para búsqueda directa en la API
                const inputBarcode = document.getElementById('search-barcode-input');
                if (inputBarcode) {
                  console.log("DEBUG: Campo de búsqueda encontrado, valor actual:", inputBarcode.value);
                  
                  // Verificar si estamos en la página de búsqueda por código de barras
                  const resultsContainer = document.getElementById('barcode-search-results');
                  if (resultsContainer) {
                    console.log("DEBUG: Contenedor de resultados encontrado, iniciando búsqueda directa para el código:", code);
                    
                    // Mostrar mensaje de carga
                    resultsContainer.innerHTML = `
                      <div class="loading-result">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Buscando producto con código: ${code}...</p>
                      </div>
                    `;
                    
                    // Obtener el token de autenticación
                    const token = localStorage.getItem('token');
                    if (!token) {
                      console.error("DEBUG: Token de autenticación no encontrado");
                      return;
                    }
                    
                    // Ejecutar la búsqueda directamente
                    const apiUrl = `/api/productos/barcode/${encodeURIComponent(code.trim())}`;
                    console.log("DEBUG: Llamando a la API en:", apiUrl);
                    
                    fetch(apiUrl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      }
                    })
                    .then(response => {
                      console.log("DEBUG: Respuesta API recibida, status:", response.status);
                      if (!response.ok) {
                        throw new Error('No se encontró ningún producto con este código de barras');
                      }
                      return response.json();
                    })
                    .then(data => {
                      console.log("DEBUG: Datos recibidos de API:", data);
                      
                      if (!data.success || !data.data) {
                        throw new Error('Respuesta inválida del servidor');
                      }
                      
                      const producto = data.data;
                      console.log("DEBUG: Producto encontrado:", producto);
                      
                      // Actualizar interfaz con el producto encontrado
                      resultsContainer.innerHTML = `
                        <div class="product-result">
                          <div class="product-result-header">
                            <div class="product-image">
                              ${producto.imagen_url 
                                ? `<img src="${producto.imagen_url}" alt="${producto.nombre}">`
                                : '<div class="no-image"><i class="fas fa-box"></i></div>'}
                            </div>
                            <div class="product-info">
                              <h3>${producto.nombre}</h3>
                              <p class="product-code">Código: ${producto.codigo}</p>
                              <p class="product-category">Categoría: ${producto.categoria ? producto.categoria.nombre : 'Sin categoría'}</p>
                              <p class="product-stock ${parseInt(producto.cantidad || 0) <= parseInt(producto.stock_minimo || 0) ? 'low-stock' : ''}">
                                <i class="fas fa-layer-group"></i> Stock: <strong>${producto.cantidad || 0}</strong> ${producto.unidad_medida || 'unidad(es)'}
                                ${parseInt(producto.cantidad || 0) <= parseInt(producto.stock_minimo || 0) ? ' <span class="badge warning">Stock Bajo</span>' : ''}
                              </p>
                            </div>
                          </div>
                          <div class="product-details">
                            <div class="detail-row">
                              <span class="detail-label">Precio Compra:</span>
                              <span class="detail-value">$${parseFloat(producto.precio_compra || 0).toFixed(2)}</span>
                            </div>
                            <div class="detail-row">
                              <span class="detail-label">Precio Venta:</span>
                              <span class="detail-value">$${parseFloat(producto.precio_venta || producto.precio || 0).toFixed(2)}</span>
                            </div>
                            <div class="detail-row">
                              <span class="detail-label">Estado:</span>
                              <span class="detail-value">${producto.activo 
                                ? '<span class="badge active">Activo</span>' 
                                : '<span class="badge inactive">Inactivo</span>'}
                              </span>
                            </div>
                          </div>
                          <div class="product-actions">
                            <button type="button" class="primary" onclick="editProducto('${producto.codigo}'); closeBarcodeSearchModal();">
                              <i class="fas fa-edit"></i> Editar Producto
                            </button>
                          </div>
                        </div>
                      `;
                      console.log("DEBUG: Interfaz actualizada con el producto encontrado");
                    })
                    .catch(error => {
                      console.error("DEBUG: Error en búsqueda API:", error);
                      resultsContainer.innerHTML = `
                        <div class="empty-result">
                          <i class="fas fa-exclamation-triangle"></i>
                          <p>${error.message}</p>
                          <small>Código escaneado: ${code}</small>
                        </div>
                      `;
                    });
                  }
                }
              }
            } else {
              // Primera detección o nuevo código, guardar para validación
              lastCode = code;
              lastCodeTime = now;
              console.log("DEBUG: Primera detección de código, guardando para validación:", code);
            }
          }
        }
      });
    });
  });
}

function stopBarcodeScanner() {
  if (quaggaInstance) {
    quaggaInstance.stop();
    quaggaInstance = null;
    console.log("Escáner de códigos de barras detenido");
  }
}

// Función para validar códigos de barras
function validateBarcode(code, format) {
  if (!code || code.length === 0) {
    return false;
  }

  switch(format) {
    case 'ean_13':
      if (code.length !== 13 || !/^\d{13}$/.test(code)) {
        return false;
      }
      return validateEANChecksum(code);
    
    case 'ean_8':
      if (code.length !== 8 || !/^\d{8}$/.test(code)) {
        return false;
      }
      return validateEANChecksum(code);
    
    case 'upc_a':
      if (code.length !== 12 || !/^\d{12}$/.test(code)) {
        return false;
      }
      return validateUPCChecksum(code);
    
    case 'upc_e':
      if (code.length !== 8 || !/^\d{8}$/.test(code)) {
        return false;
      }
      return true;
    
    case 'code_128':
      return /^[\x00-\x7F]+$/.test(code) && code.length >= 1;
    
    case 'code_39':
      // CODE39 contiene caracteres alfanuméricos, espacios y algunos caracteres especiales
      return /^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(code) && code.length >= 1;
    
    default:
      // Para otros formatos, aceptamos el código si tiene longitud suficiente
      return code.length >= 4;
  }
}

// Validar checksum de códigos EAN
function validateEANChecksum(code) {
  const digits = code.split('').map(d => parseInt(d));
  const checkDigit = digits.pop();
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    // Para EAN, alternar entre multiplicar por 1 y 3
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  // El checksum es el dígito que hay que añadir para llegar al siguiente múltiplo de 10
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
}

// Validar checksum de códigos UPC
function validateUPCChecksum(code) {
  const digits = code.split('').map(d => parseInt(d));
  const checkDigit = digits.pop(); // Extraer el último dígito (checksum)
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    // Para UPC, alternar entre multiplicar por 3 y 1
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  
  // El checksum es el dígito que hay que añadir para llegar al siguiente múltiplo de 10
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
}

// Funciones para diagnóstico y resolución de problemas con la cámara
function checkCameraCompatibility() {
  return new Promise((resolve, reject) => {
    // Verificar si el navegador soporta getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reject({
        type: 'browser',
        message: 'Tu navegador no soporta acceso a la cámara. Intenta actualizar tu navegador o usar otro como Chrome o Firefox.'
      });
      return;
    }

    // Verificar si estamos en un contexto seguro (HTTPS o localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn('La API de cámara requiere HTTPS para funcionar en la mayoría de los navegadores.');
    }

    // Intentar obtener la lista de dispositivos de cámara
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        // Filtrar solo las cámaras de video
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          reject({
            type: 'hardware',
            message: 'No se detectó ninguna cámara en tu dispositivo.'
          });
          return;
        }
        
        // Todo bien, tenemos al menos una cámara
        resolve({
          hasCamera: true,
          devices: videoDevices,
          count: videoDevices.length
        });
      })
      .catch(err => {
        reject({
          type: 'permission',
          message: 'Error al enumerar dispositivos de cámara. Asegúrate de conceder los permisos necesarios.',
          error: err
        });
      });
  });
}

// Soluciones alternativas para cuando la cámara no funciona
function cameraFallbackSolution(errorType) {
  // Crear un diálogo para mostrar soluciones
  const dialogHTML = `
    <div class="camera-troubleshoot">
      <h3>Problema con la cámara</h3>
      <p id="camera-error-message">No se pudo acceder a la cámara de tu dispositivo.</p>
      
      <div class="solutions">
        <div class="solution">
          <h4>1. Verifica los permisos</h4>
          <p>Asegúrate de que has permitido el acceso a la cámara cuando el navegador te lo solicita.</p>
          <button id="check-permissions" class="btn-solution">Verificar permisos</button>
        </div>
        
        <div class="solution">
          <h4>2. Utiliza otro navegador</h4>
          <p>Algunos navegadores tienen mejor compatibilidad. Intenta con Chrome, Firefox o Safari.</p>
        </div>
        
        <div class="solution">
          <h4>3. Ingresa el código manualmente</h4>
          <p>Si el escáner no funciona, puedes ingresar el código manualmente.</p>
          <button id="manual-input" class="btn-solution">Ingresar código</button>
        </div>
      </div>
      
      <div class="actions">
        <button id="close-troubleshoot" class="btn-secondary">Cerrar</button>
      </div>
    </div>
  `;
  
  // Insertar el diálogo en el DOM si no existe
  if (!document.querySelector('.camera-troubleshoot')) {
    const container = document.createElement('div');
    container.className = 'troubleshoot-container';
    container.innerHTML = dialogHTML;
    document.body.appendChild(container);
    
    // Configurar eventos
    document.getElementById('check-permissions').onclick = () => {
      navigator.permissions.query({ name: 'camera' })
        .then(permissionStatus => {
          // Reemplazar alert por showToast
          if (typeof window.showToast === 'function') {
            window.showToast(`Estado del permiso de cámara: ${permissionStatus.state}. ${permissionStatus.state !== 'granted' ? 'Por favor, permite el acceso a la cámara en la configuración de tu navegador.' : ''}`, permissionStatus.state === 'granted' ? 'success' : 'warning');
          } else {
            console.log(`Estado del permiso de cámara: ${permissionStatus.state}`);
          }
        })
        .catch(() => {
          // Reemplazar alert por showToast
          if (typeof window.showToast === 'function') {
            window.showToast('No se pudo verificar el estado de los permisos. Intenta verificar manualmente en la configuración de tu navegador.', 'error');
          } else {
            console.error('No se pudo verificar el estado de los permisos.');
          }
        });
    };
    
    document.getElementById('manual-input').onclick = () => {
      const code = prompt('Ingresa el código de barras manualmente:');
      if (code && code.length > 0) {
        // Buscar el campo de entrada más cercano para colocar el código
        const inputs = [
          document.getElementById('search-barcode-input'),
          document.getElementById('barcode-input'),
          document.getElementById('new-barcode')
        ];
        
        const input = inputs.find(el => el && el.offsetParent !== null); // Buscar el primer input visible
        if (input) {
          input.value = code;
          // Disparar evento de cambio para activar listeners
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          // Mostrar mensaje de éxito
          if (typeof window.showToast === 'function') {
            window.showToast('Código ingresado manualmente con éxito', 'success');
          }
        }
      }
      
      document.querySelector('.troubleshoot-container').style.display = 'none';
    };
    
    document.getElementById('close-troubleshoot').onclick = () => {
      document.querySelector('.troubleshoot-container').style.display = 'none';
    };
  }
  
  // Personalizar el mensaje según el tipo de error
  const container = document.querySelector('.troubleshoot-container');
  const errorMsg = document.getElementById('camera-error-message');
  
  if (errorType === 'browser') {
    errorMsg.textContent = 'Tu navegador no soporta acceso a la cámara.';
  } else if (errorType === 'hardware') {
    errorMsg.textContent = 'No se detectó ninguna cámara en tu dispositivo.';
  } else if (errorType === 'permission') {
    errorMsg.textContent = 'No tienes permisos para acceder a la cámara.';
  } else if (errorType === 'https') {
    errorMsg.textContent = 'El acceso a la cámara requiere una conexión segura (HTTPS).';
  } else {
    errorMsg.textContent = 'Ocurrió un problema al intentar acceder a la cámara.';
  }
  
  // Mostrar el diálogo
  container.style.display = 'flex';
}

// Añadir estilos CSS para el diálogo de solución de problemas
(function() {
  const style = document.createElement('style');
  style.textContent = `
    .troubleshoot-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    
    .camera-troubleshoot {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .camera-troubleshoot h3 {
      margin-top: 0;
      color: #d32f2f;
    }
    
    .solutions {
      margin: 20px 0;
    }
    
    .solution {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .solution h4 {
      margin: 0 0 8px 0;
      color: #333;
    }
    
    .btn-solution {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      margin-top: 8px;
    }
    
    .btn-solution:hover {
      background-color: #e0e0e0;
    }
    
    .actions {
      text-align: right;
      margin-top: 15px;
    }
    
    .btn-secondary {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();