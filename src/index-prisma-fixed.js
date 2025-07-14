const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketIo = require('socket.io');
console.log('📝 Configuración completa. Verificando si es Vercel o local...');
console.log('🔍 process.env.VERCEL:', process.env.VERCEL);
console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);

// Para compatibilidad con Vercel
if (process.env.VERCEL && process.env.VERCEL !== 'false') {
    console.log('🔶 Modo Vercel detectado - exportando app');
    module.exports = app;
} else {
    // Ejecutar servidor localmente
    console.log('🔶 Modo local detectado - iniciando servidor...');
    startServer();
}
require('dotenv').config();

// Inicializar Prisma
const prisma = new PrismaClient();

// Global para tracking del estado de WhatsApp
global.whatsappInitialized = false;

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
        'http://127.0.0.1:3000',
        'http://191.108.173.181:3000'
    ],
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

// Cargar rutas migradas a Prisma
console.log('Cargando rutas migradas a Prisma...');

try {
    const authRoutes = require('./routes/auth-prisma.routes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
} catch (error) {
    console.log('❌ Error loading auth routes:', error.message);
}

try {
    const usuariosRoutes = require('./routes/usuarios-prisma.routes');
    app.use('/api/usuarios', usuariosRoutes);
    console.log('✅ Usuarios routes loaded');
} catch (error) {
    console.log('❌ Error loading usuarios routes:', error.message);
}

try {
    const categoriasRoutes = require('./routes/categorias-prisma.routes');
    app.use('/api/categorias', categoriasRoutes);
    console.log('✅ Categorias routes loaded');
} catch (error) {
    console.log('❌ Error loading categorias routes:', error.message);
}

try {
    const productosRoutes = require('./routes/productos-prisma.routes');
    app.use('/api/productos', productosRoutes);
    console.log('✅ Productos routes loaded');
} catch (error) {
    console.log('❌ Error loading productos routes:', error.message);
}

try {
    const ventasRoutes = require('./routes/ventas-prisma.routes');
    app.use('/api/ventas', ventasRoutes);
    console.log('✅ Ventas routes loaded');
} catch (error) {
    console.log('❌ Error loading ventas routes:', error.message);
}

try {
    const pedidosRoutes = require('./routes/pedidos-prisma.routes');
    app.use('/api/pedidos', pedidosRoutes);
    console.log('✅ Pedidos routes loaded');
} catch (error) {
    console.log('❌ Error loading pedidos routes:', error.message);
}

console.log('📝 Todas las rutas cargadas, configurando health check...');

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

console.log('📝 Health check configurado, configurando rutas estáticas...');

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

console.log('📝 Rutas estáticas configuradas, configurando Socket.IO...');

// Socket.IO para notificaciones en tiempo real
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Usuario ${userId} se unió a su sala`);
    });
    
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

console.log('📝 Socket.IO configurado, configurando middleware de errores...');

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no controlado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : null
    });
});

// TODO: Agregar middleware para rutas no encontradas después de debug
// app.use((req, res) => {
//     res.status(404).json({
//         success: false,
//         message: 'Ruta no encontrada',
//         path: req.originalUrl
//     });
// });

// Función para inicialización de la aplicación
async function startServer() {
    try {
        console.log('📝 Iniciando función startServer...');
        
        // Verificar conexión a base de datos
        console.log('🔍 Intentando conectar a PostgreSQL...');
        await prisma.$connect();
        console.log('✅ Conexión a PostgreSQL establecida exitosamente');

        // Obtener puerto del entorno o usar 3000 por defecto
        const PORT = process.env.PORT || 3000;
        console.log(`🔧 Puerto configurado: ${PORT}`);
        
        // Iniciar servidor
        console.log('🚀 Iniciando servidor HTTP...');
        server.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📊 Dashboard disponible en: http://localhost:${PORT}/dashboard`);
            console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('🔄 Estado migración: Core modules migrated to Prisma');
        });

        // Manejo de cierre graceful
        process.on('SIGTERM', async () => {
            console.log('🛑 Cerrando servidor gracefully...');
            await prisma.$disconnect();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('🛑 Cerrando servidor gracefully...');
            await prisma.$disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        console.error('📊 Stack trace:', error.stack);
        process.exit(1);
    }
}

console.log('📝 Configuración completa. Verificando si es Vercel o local...');

// Para compatibilidad con Vercel
if (process.env.VERCEL) {
    console.log('🔶 Modo Vercel detectado - exportando app');
    module.exports = app;
} else {
    // Ejecutar servidor localmente
    console.log('� Modo local detectado - iniciando servidor...');
    startServer();
}
