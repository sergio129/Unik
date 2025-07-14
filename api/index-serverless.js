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

// Cargar rutas de API con manejo de errores mejorado
console.log('🔄 Cargando rutas de API...');

// Auth routes
try {
    const authRoutes = require('../src/routes/auth-prisma.routes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
} catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
}

// Usuarios routes
try {
    const usuariosRoutes = require('../src/routes/usuarios-prisma.routes');
    app.use('/api/usuarios', usuariosRoutes);
    console.log('✅ Usuarios routes loaded');
} catch (error) {
    console.error('❌ Error loading usuarios routes:', error.message);
}

// Categorias routes
try {
    const categoriasRoutes = require('../src/routes/categorias-prisma.routes');
    app.use('/api/categorias', categoriasRoutes);
    console.log('✅ Categorias routes loaded');
} catch (error) {
    console.error('❌ Error loading categorias routes:', error.message);
}

// Productos routes
try {
    const productosRoutes = require('../src/routes/productos-prisma.routes');
    app.use('/api/productos', productosRoutes);
    console.log('✅ Productos routes loaded');
} catch (error) {
    console.error('❌ Error loading productos routes:', error.message);
}

// Ventas routes
try {
    const ventasRoutes = require('../src/routes/ventas-prisma.routes');
    app.use('/api/ventas', ventasRoutes);
    console.log('✅ Ventas routes loaded');
} catch (error) {
    console.error('❌ Error loading ventas routes:', error.message);
}

// Pedidos routes
try {
    const pedidosRoutes = require('../src/routes/pedidos-prisma.routes');
    app.use('/api/pedidos', pedidosRoutes);
    console.log('✅ Pedidos routes loaded');
} catch (error) {
    console.error('❌ Error loading pedidos routes:', error.message);
}

// Clientes routes
try {
    const clientesRoutes = require('../src/routes/clientes-prisma.routes');
    app.use('/api/clientes', clientesRoutes);
    console.log('✅ Clientes routes loaded');
} catch (error) {
    console.error('❌ Error loading clientes routes:', error.message);
}

// Actividad routes
try {
    const actividadRoutes = require('../src/routes/actividad-prisma.routes');
    app.use('/api/actividad', actividadRoutes);
    console.log('✅ Actividad routes loaded');
} catch (error) {
    console.error('❌ Error loading actividad routes:', error.message);
}

// WhatsApp routes
try {
    const whatsappRoutes = require('../src/routes/whatsapp.routes');
    app.use('/api/whatsapp', whatsappRoutes);
    console.log('✅ WhatsApp routes loaded');
} catch (error) {
    console.error('❌ Error loading whatsapp routes:', error.message);
}

// Movimientos routes
try {
    const movimientosRoutes = require('../src/routes/movimientos-prisma.routes');
    app.use('/api/movimientos', movimientosRoutes);
    console.log('✅ Movimientos routes loaded');
} catch (error) {
    console.error('❌ Error loading movimientos routes:', error.message);
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

// Rutas de páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

// Rutas para páginas de inventario
app.get('/inventario/productos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventario', 'productos.html'));
});

app.get('/inventario/categorias', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventario', 'categorias.html'));
});

app.get('/inventario/movimientos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventario', 'movimientos.html'));
});

app.get('/inventario', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventario', 'inventario.html'));
});

// Rutas para páginas de ventas
app.get('/ventas/ventas', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ventas', 'ventas.html'));
});

app.get('/ventas/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ventas', 'clientes.html'));
});

app.get('/ventas/historial', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ventas', 'historial.html'));
});

app.get('/ventas', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ventas', 'ventas.html'));
});

// Rutas para páginas de pedidos
app.get('/pedidos/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pedidos', 'pedidos.html'));
});

app.get('/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pedidos', 'pedidos.html'));
});

// Rutas para páginas de administración
app.get('/admin/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin', 'usuarios.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin', 'usuarios.html'));
});

// Rutas para páginas de perfil
app.get('/perfil/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/perfil', 'perfil.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/perfil', 'perfil.html'));
});

// Catch-all handler para rutas no encontradas
app.get('*', (req, res) => {
    // Si es una ruta de API que no existe, devolver JSON 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint no encontrado',
            path: req.path,
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
                '/api/whatsapp/*',
                '/api/movimientos/*'
            ]
        });
    }
    
    // Para cualquier otra ruta, servir la página principal
    res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
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
