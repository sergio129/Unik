const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./utils/database');
const initAdmin = require('./utils/initAdmin');
const runMigrations = require('./migrations');
const whatsappService = require('./services/whatsappService'); // Importar servicio de WhatsApp
const http = require('http'); // Añadido para Socket.IO
const socketIo = require('socket.io'); // Añadido para WebSockets
require('dotenv').config();

// Global para tracking del estado de WhatsApp
global.whatsappInitialized = false;

// Importación de modelos para establecer relaciones
const Usuario = require('./models/usuario.model');
const Sesion = require('./models/sesion.model');

// Establecer relaciones entre modelos
Sesion.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Usuario.hasMany(Sesion, { foreignKey: 'usuario_id' });

// Importación de rutas
const authRoutes = require('./routes/auth.route');
const usuariosRoutes = require('./routes/usuarios.route');
const categoriasRoutes = require('./routes/categorias.routes'); // Corregido: .route -> .routes
const productosRoutes = require('./routes/productos.route');
const movimientosRoutes = require('./routes/movimientos.route');
const reportesRoutes = require('./routes/reportes.final'); // Usando el archivo final con el patrón correcto
const clientesRoutes = require('./routes/clientes.route');
const ventasRoutes = require('./routes/ventas.route');
const actividadRoutes = require('./routes/actividad.routes'); // Corregido: .route -> .routes
const pedidosRoutes = require('./routes/pedidos.route'); // Nueva ruta para gestión de pedidos
const proveedoresRoutes = require('./routes/proveedores.routes'); // Nueva ruta para gestión de proveedores
const whatsappRoutes = require('./routes/whatsapp.route'); // Nueva ruta para gestión de WhatsApp
const notificacionesRoutes = require('./routes/notificaciones.routes'); // Nueva ruta para sistema de notificaciones

const app = express();
const server = http.createServer(app); // Crear servidor HTTP para Socket.IO
const io = socketIo(server, { 
    cors: {
        origin: "*", // Permitir conexiones desde cualquier origen
        methods: ["GET", "POST"]
    }
}); // Inicializar Socket.IO

// Hacer que io sea accesible globalmente
global.io = io;

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Express para servir archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configurar cabeceras y cors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Configuración de Socket.IO para eventos en tiempo real
io.on('connection', (socket) => {
    console.log('Cliente conectado a WebSocket:', socket.id);

    // Evento para unirse a una sala específica (útil para chats de pedidos específicos)
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Usuario ${socket.id} se unió a la sala: ${room}`);
    });

    // Evento para salir de una sala
    socket.on('leave_room', (room) => {
        socket.leave(room);
        console.log(`Usuario ${socket.id} salió de la sala: ${room}`);
    });

    // Evento para enviar mensaje a un proveedor
    socket.on('send_whatsapp_message', async (data) => {
        try {
            const { telefono, pedidoId, mensaje, usuarioId } = data;
            
            if (!telefono || !mensaje) {
                socket.emit('error', { message: 'Teléfono y mensaje son requeridos' });
                return;
            }
            
            // Verificar si hay un chat activo o activarlo
            const chatActivo = await whatsappService.verificarChatActivo(telefono);
            if (!chatActivo && pedidoId) {
                await whatsappService.activarModoChat(telefono, pedidoId);
            }
            
            // Enviar mensaje
            const resultado = await whatsappService.responderAlProveedor(
                telefono, 
                pedidoId, 
                mensaje, 
                usuarioId
            );
            
            if (resultado) {
                socket.emit('message_sent', { success: true, message: 'Mensaje enviado correctamente' });
            } else {
                socket.emit('error', { message: 'Error al enviar mensaje' });
            }
        } catch (error) {
            console.error('Error en WebSocket send_whatsapp_message:', error);
            socket.emit('error', { message: 'Error interno al enviar mensaje' });
        }
    });

    // Evento para cuando un cliente se desconecta
    socket.on('disconnect', () => {
        console.log('Cliente desconectado de WebSocket:', socket.id);
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/actividad', actividadRoutes); // Nueva ruta para actividad reciente
app.use('/api/pedidos', pedidosRoutes); // Nueva ruta para gestión de pedidos
app.use('/api/proveedores', proveedoresRoutes); // Nueva ruta para gestión de proveedores
app.use('/api/whatsapp', whatsappRoutes); // Nueva ruta para gestión de WhatsApp
app.use('/api/notificaciones', notificacionesRoutes); // Nueva ruta para sistema de notificaciones

// Ruta básica para la API
app.get('/api', (req, res) => {
  res.json({ message: 'API de La UNIKa' });
});

// Middleware para verificar autenticación en rutas protegidas
const checkAuth = (req, res, next) => {
  // Para API calls, verificar el token en el header
  if (req.headers.authorization) {
    return next();
  }
  
  // Para peticiones del navegador, usar localStorage
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Verificando autenticación</title>
    </head>
    <body>
      <script>
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
          // No hay sesión, redirigir al login
          window.location.href = '/login';
        } else {
          // Hay sesión, mostrar el contenido de la página
          // Manejo especial para rutas específicas
          let path = '${req.path}';
          
          // Eliminar la barra final si existe para evitar redirecciones recursivas
          if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
          }
          
          if (path === '/inventario') {
            // Ruta de inventario debe ir a la página específica de inventario
            window.location.replace('/inventario/inventario.html');
          } else if (path.startsWith('/inventario/')) {
            // Ya está en una subruta de inventario, verificar si ya tiene .html
            if (!path.endsWith('.html')) {
              window.location.replace(path + '.html');
            } else {
              window.location.replace(path);
            }
          } else if (path === '/ventas') {
            // Ruta de ventas
            window.location.replace('/ventas/ventas.html');
          } else if (path.startsWith('/ventas/')) {
            // Ya está en una subruta de ventas, verificar si ya tiene .html
            if (!path.endsWith('.html')) {
              window.location.replace(path + '.html');
            } else {
              window.location.replace(path);
            }
          } else if (path === '/pedidos') {
            // Ruta de pedidos
            window.location.replace('/pedidos/pedidos.html');
          } else if (path.startsWith('/pedidos/')) {
            // Ya está en una subruta de pedidos, verificar si ya tiene .html
            if (!path.endsWith('.html')) {
              window.location.replace(path + '.html');
            } else {
              window.location.replace(path);
            }
          } else {
            // Para otras rutas, usar el comportamiento normal
            if (!path.endsWith('.html')) {
              window.location.replace(path + '.html');
            } else {
              window.location.replace(path);
            }
          }
        }
      </script>
    </body>
    </html>
  `);
};

// Ruta específica para la página de login (sin extensión .html)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Ruta para el dashboard (protegida)
app.get('/dashboard', checkAuth, (req, res) => {
  // Servir el dashboard directamente desde la carpeta public
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Ruta para el administrador de usuarios (protegida, solo admin)
app.get('/admin/usuarios', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'usuarios.html'));
});

// Rutas para el módulo de inventario
app.get('/inventario', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'inventario.html'));
});

app.get('/inventario/categorias', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'inventario', 'categorias.html'));
});

app.get('/inventario/productos', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'inventario', 'productos.html'));
});

app.get('/inventario/movimientos', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'inventario', 'movimientos.html'));
});

// Rutas para el módulo de pedidos
app.get('/pedidos', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pedidos', 'pedidos.html'));
});

// Rutas para el módulo de ventas
app.get('/ventas', checkAuth, (req, res) => {
  // En lugar de usar el middleware para la redirección, enviar directamente el archivo HTML
  res.sendFile(path.join(__dirname, '..', 'public', 'ventas', 'ventas.html'));
});

app.get('/ventas/clientes', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ventas', 'clientes.html'));
});

app.get('/ventas/historial', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'ventas', 'historial.html'));
});

// Ruta para servir el frontend en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Manejador de errores para rutas no encontradas de la API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta de API no encontrada' });
});

// Manejador para servir el frontend en cualquier otra ruta (para SPA)
app.use((req, res) => {
  // Normalizar la ruta eliminando la barra diagonal al final si existe
  let reqPath = req.path;
  if (reqPath !== '/' && reqPath.endsWith('/')) {
    reqPath = reqPath.slice(0, -1);
    // Redirigir a la ruta sin la barra al final para evitar problemas
    return res.redirect(301, reqPath);
  }

  // Verificar si la ruta comienza con /ventas, /inventario o /pedidos para evitar redirecciones incorrectas
  if (reqPath.startsWith('/ventas') || reqPath.startsWith('/inventario') || reqPath.startsWith('/pedidos')) {
    // Aplicar el middleware checkAuth primero
    return checkAuth(req, res, () => {});
  }
  
  // Para otras rutas o archivos no encontrados
  if (reqPath.includes('.')) {
    res.status(404).send('Archivo no encontrado');
  } else {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    // Sincronizar modelos con la base de datos pero con menos verbosidad
    // Solo sincronizamos si estamos en desarrollo y específicamente configurado para ello
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      console.log('Sincronizando modelos con la base de datos...');
      await sequelize.sync({ alter: true });
      console.log('Base de datos sincronizada correctamente.');
    } else {
      // En producción o cuando no queremos sincronizar, solo probamos la conexión
      console.log('Modo de sincronización desactivado, solo comprobando conexión...');
    }
    
    // Probar la conexión
    await testConnection();
    
    // Las migraciones ahora se ejecutan con un comando separado: npm run migrate
    // await runMigrations();
    
    // Crear usuario administrador inicial (mantenemos esto por compatibilidad)
    if (process.env.INIT_ADMIN === 'true') {
      await initAdmin();
    } else {
      console.log('Ya existe al menos un usuario administrador en el sistema');
    }
    
    // Inicializar servicio de WhatsApp
    console.log('Inicializando servicio de WhatsApp...');
    whatsappService.initializeWhatsApp();
    global.whatsappInitialized = true;
    
    // Iniciar el servidor (cambiado de app.listen a server.listen para Socket.IO)
    server.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
      console.log(`Accede a la aplicación en: http://localhost:${PORT}`);
      console.log(`Socket.IO habilitado para comunicación en tiempo real`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

// Manejar errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Rechazo de promesa no manejado:', err);
});