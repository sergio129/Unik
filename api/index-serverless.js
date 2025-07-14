// Servidor serverless optimizado para Vercel
const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Inicializar Prisma
const prisma = new PrismaClient();

// Hacer que prisma sea accesible globalmente
global.prisma = prisma;
global.whatsappInitialized = false;

const app = express();

// Middleware para CORS más permisivo para Vercel
app.use(cors({
    origin: true, // Permite cualquier origen en production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Middleware para parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Función helper para cargar rutas de forma segura
function loadRoute(routePath, mountPath) {
    try {
        const route = require(routePath);
        
        // Verificar que la ruta exporta una función válida de Express
        if (typeof route !== 'function') {
            console.error(`❌ ${mountPath} routes: exported value is not a function`);
            return false;
        }
        
        app.use(mountPath, route);
        console.log(`✅ ${mountPath} routes loaded`);
        return true;
    } catch (error) {
        console.error(`❌ Error loading ${mountPath} routes:`, error.message);
        
        // Crear ruta de fallback para evitar errores 404
        app.use(mountPath, (req, res) => {
            res.status(503).json({
                success: false,
                message: `Servicio ${mountPath} temporalmente no disponible`,
                error: 'Module loading failed'
            });
        });
        
        return false;
    }
}

// Cargar rutas de API con manejo de errores mejorado
console.log('🔄 Cargando rutas de API...');

// Cargar rutas en orden de prioridad
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

routes.forEach(route => {
    loadRoute(route.path, route.mount);
});

// Intentar cargar WhatsApp solo si está disponible
try {
    const whatsappRoutes = require('../src/routes/whatsapp.routes');
    app.use('/api/whatsapp', whatsappRoutes);
    console.log('✅ WhatsApp routes loaded');
} catch (error) {
    console.log('⚠️ WhatsApp routes not available in serverless environment');
    
    // Crear rutas de fallback para WhatsApp
    app.use('/api/whatsapp', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Servicio de WhatsApp no disponible en el entorno serverless',
            error: 'Service not supported'
        });
    });
}

// Ruta para health check
app.get('/api/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            database: 'connected',
            environment: process.env.NODE_ENV || 'production',
            vercel: true
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Función helper para enviar archivos HTML de forma segura
function sendHTMLFile(res, filename) {
    try {
        const filePath = path.join(__dirname, '../public', filename);
        res.sendFile(filePath);
    } catch (error) {
        console.error(`Error serving ${filename}:`, error);
        res.status(404).send('Page not found');
    }
}

// Rutas de páginas HTML
app.get('/', (req, res) => sendHTMLFile(res, 'index.html'));
app.get('/login', (req, res) => sendHTMLFile(res, 'login.html'));
app.get('/dashboard', (req, res) => sendHTMLFile(res, 'dashboard.html'));

// Rutas para páginas de inventario
app.get('/inventario/productos', (req, res) => sendHTMLFile(res, 'inventario/productos.html'));
app.get('/inventario/categorias', (req, res) => sendHTMLFile(res, 'inventario/categorias.html'));
app.get('/inventario/movimientos', (req, res) => sendHTMLFile(res, 'inventario/movimientos.html'));
app.get('/inventario', (req, res) => sendHTMLFile(res, 'inventario/inventario.html'));

// Rutas para páginas de ventas
app.get('/ventas/ventas', (req, res) => sendHTMLFile(res, 'ventas/ventas.html'));
app.get('/ventas/clientes', (req, res) => sendHTMLFile(res, 'ventas/clientes.html'));
app.get('/ventas/historial', (req, res) => sendHTMLFile(res, 'ventas/historial.html'));
app.get('/ventas', (req, res) => sendHTMLFile(res, 'ventas/ventas.html'));

// Rutas para páginas de pedidos
app.get('/pedidos/pedidos', (req, res) => sendHTMLFile(res, 'pedidos/pedidos.html'));
app.get('/pedidos', (req, res) => sendHTMLFile(res, 'pedidos/pedidos.html'));

// Rutas para páginas de administración
app.get('/admin/usuarios', (req, res) => sendHTMLFile(res, 'admin/usuarios.html'));
app.get('/admin', (req, res) => sendHTMLFile(res, 'admin/usuarios.html'));

// Rutas para páginas de perfil
app.get('/perfil/perfil', (req, res) => sendHTMLFile(res, 'perfil/perfil.html'));
app.get('/perfil', (req, res) => sendHTMLFile(res, 'perfil/perfil.html'));

// Catch-all handler para rutas no encontradas
app.use('*', (req, res) => {
    // Si es una ruta de API que no existe, devolver JSON 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint no encontrado',
            path: req.path,
            method: req.method,
            availableEndpoints: [
                '/api/health',
                '/api/auth/*',
                '/api/usuarios/*',
                '/api/categorias/*',
                '/api/productos/*',
                '/api/ventas/*',
                '/api/pedidos/*',
                '/api/clientes/*',
                '/api/actividad/*',
                '/api/movimientos/*'
            ]
        });
    }
    
    // Para cualquier otra ruta, servir la página principal
    try {
        sendHTMLFile(res, 'dashboard.html');
    } catch (error) {
        console.error('Error serving fallback page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('💥 Error no controlado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

console.log('📝 Servidor serverless configurado para Vercel');

// Export para Vercel
module.exports = app;
