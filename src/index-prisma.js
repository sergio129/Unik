const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Inicializar Prisma
const prisma = new PrismaClient();

// Global para tracking del estado de WhatsApp
global.whatsappInitialized = false;

// Importación de rutas
const authRoutes = require('./routes/auth.route');
const usuariosRoutes = require('./routes/usuarios.route');
const categoriasRoutes = require('./routes/categorias.routes');
const productosRoutes = require('./routes/productos.route');
const movimientosRoutes = require('./routes/movimientos.route');
const reportesRoutes = require('./routes/reportes.route');
const clientesRoutes = require('./routes/clientes.route');
const ventasRoutes = require('./routes/ventas.route');
const actividadRoutes = require('./routes/actividad.routes');
const pedidosRoutes = require('./routes/pedidos.route');
const proveedoresRoutes = require('./routes/proveedores.routes');
const whatsappRoutes = require('./routes/whatsapp.route');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const perfilRoutes = require('./routes/perfil.routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { 
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Hacer que io y prisma sean accesibles globalmente
global.io = io;
global.prisma = prisma;

// Middleware para CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://192.168.1.9:3000',
        'https://unika-app.vercel.app',
        process.env.VERCEL_URL || '',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/actividad', actividadRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/perfil', perfilRoutes);

// Ruta para health check
app.get('/api/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            database: 'connected',
            environment: process.env.NODE_ENV
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

// Rutas de archivos estáticos y páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

app.get('/inventario', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'inventario.html'));
});

app.get('/inventario/categorias', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'inventario', 'categorias.html'));
});

app.get('/inventario/productos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'inventario', 'productos.html'));
});

app.get('/inventario/movimientos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'inventario', 'movimientos.html'));
});

app.get('/ventas', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'ventas', 'ventas.html'));
});

app.get('/ventas/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'ventas', 'clientes.html'));
});

app.get('/ventas/historial', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'ventas', 'historial.html'));
});

app.get('/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'pedidos', 'pedidos.html'));
});

app.get('/admin/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin', 'usuarios.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'perfil', 'perfil.html'));
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Configuración de WebSockets
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
    
    // Eventos de WhatsApp
    socket.on('whatsapp:status', () => {
        socket.emit('whatsapp:status', global.whatsappInitialized);
    });
});

// Función para inicializar la aplicación
async function startApp() {
    try {
        console.log('🚀 Iniciando aplicación UNIKA...');
        
        // Verificar conexión a base de datos
        await prisma.$connect();
        console.log('✅ Conexión a PostgreSQL establecida');
        
        // Crear usuario admin por defecto si no existe
        if (process.env.INIT_ADMIN === 'true') {
            try {
                const adminExists = await prisma.usuario.findFirst({
                    where: { username: 'admin' }
                });
                
                if (!adminExists) {
                    const bcrypt = require('bcrypt');
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    
                    await prisma.usuario.create({
                        data: {
                            username: 'admin',
                            password: hashedPassword,
                            nombre_completo: 'Administrador',
                            email: 'admin@unika.com',
                            rol: 'admin',
                            activo: true
                        }
                    });
                    console.log('✅ Usuario admin creado');
                }
            } catch (error) {
                console.log('ℹ️ Usuario admin ya existe o error al crear:', error.message);
            }
        }
        
        // Inicializar WhatsApp (opcional)
        if (process.env.ENABLE_WHATSAPP === 'true') {
            try {
                const whatsappService = require('./services/whatsappService');
                setTimeout(() => {
                    whatsappService.initialize();
                }, 5000);
            } catch (error) {
                console.log('⚠️ Error al inicializar WhatsApp:', error.message);
            }
        }
        
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        process.exit(1);
    }
}

// Iniciar aplicación
startApp();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Cerrando aplicación...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Cerrando aplicación...');
    await prisma.$disconnect();
    process.exit(0);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV}`);
    console.log(`📱 API Health: http://${HOST}:${PORT}/api/health`);
});

// Exportar para Vercel
module.exports = app;
