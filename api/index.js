const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Express para servir archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configurar cabeceras CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
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
        const user = localStorage.getItem('usuario');
        
        if (!token || !user) {
          // No hay sesión, redirigir al login
          window.location.href = '/login';
        } else {
          // Hay sesión, proceder normalmente
          document.write('Redirigiendo...');
          setTimeout(() => {
            let path = '${req.path}';
            
            if (path === '/dashboard') {
              window.location.replace('/dashboard.html');
            } else if (path === '/ventas') {
              window.location.replace('/ventas/ventas.html');
            } else if (path === '/inventario') {
              window.location.replace('/inventario/inventario.html');
            } else if (path === '/pedidos') {
              window.location.replace('/pedidos/pedidos.html');
            } else if (path === '/admin/usuarios') {
              window.location.replace('/admin/usuarios.html');
            } else {
              window.location.replace(path + '.html');
            }
          }, 100);
        }
      </script>
    </body>
    </html>
  `);
};

// Cargar rutas de API con manejo de errores
console.log('🔄 Cargando rutas de API...');

const routes = [
    { path: '../src/routes/auth-prisma.routes', mount: '/api/auth' },
    { path: '../src/routes/usuarios-prisma.routes', mount: '/api/usuarios' },
    { path: '../src/routes/categorias-prisma.routes', mount: '/api/categorias' },
    { path: '../src/routes/productos-prisma.routes', mount: '/api/productos' },
    { path: '../src/routes/ventas-prisma.routes', mount: '/api/ventas' },
    { path: '../src/routes/pedidos-prisma.routes', mount: '/api/pedidos' },
    { path: '../src/routes/clientes-prisma.routes', mount: '/api/clientes' },
    { path: '../src/routes/actividad-prisma.routes', mount: '/api/actividad' },
    { path: '../src/routes/movimientos-prisma.routes', mount: '/api/movimientos' }
];

let loadedRoutes = 0;
routes.forEach(route => {
    try {
        const routeModule = require(route.path);
        if (typeof routeModule === 'function') {
            app.use(route.mount, routeModule);
            console.log(`✅ ${route.mount} routes loaded`);
            loadedRoutes++;
        } else {
            console.error(`❌ ${route.mount} routes: exported value is not a function`);
        }
    } catch (error) {
        console.error(`❌ Error loading ${route.mount} routes:`, error.message);
        
        // Crear ruta de fallback
        app.use(route.mount, (req, res) => {
            res.status(503).json({
                success: false,
                message: `Servicio ${route.mount} temporalmente no disponible`,
                error: 'Module loading failed'
            });
        });
    }
});

console.log(`📊 Rutas cargadas: ${loadedRoutes}/${routes.length}`);

// Ruta básica para la API
app.get('/api', (req, res) => {
  res.json({ message: 'API de La UNIKa', status: 'OK' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        routes: `${loadedRoutes}/${routes.length} loaded`,
        version: '1.0.0'
    });
});

// Ruta específica para la página de login (sin extensión .html)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Ruta para el dashboard (protegida)
app.get('/dashboard', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Ruta para el administrador de usuarios (protegida, solo admin)
app.get('/admin/usuarios', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'usuarios.html'));
});

// Rutas para el módulo de inventario
app.get('/inventario', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'inventario', 'inventario.html'));
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
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Ruta de API no encontrada' });
});

// Manejador para servir el frontend en cualquier otra ruta
app.use((req, res) => {
  // Para archivos específicos
  if (req.path.includes('.')) {
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

console.log('📝 Servidor configurado para Vercel');

// Export para Vercel
module.exports = app;