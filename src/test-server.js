const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Inicializar Prisma
const prisma = new PrismaClient();

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test simple
app.get('/test', (req, res) => {
    res.json({ message: 'Server working' });
});

// Intentar cargar rutas una a una
console.log('Loading auth routes...');
try {
    const authRoutes = require('./routes/auth-prisma.routes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading auth routes:', error.message);
}

console.log('Loading usuarios routes...');
try {
    const usuariosRoutes = require('./routes/usuarios-prisma.routes');
    app.use('/api/usuarios', usuariosRoutes);
    console.log('✅ Usuarios routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading usuarios routes:', error.message);
}

console.log('Loading categorias routes...');
try {
    const categoriasRoutes = require('./routes/categorias-prisma.routes');
    app.use('/api/categorias', categoriasRoutes);
    console.log('✅ Categorias routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading categorias routes:', error.message);
}

console.log('Loading productos routes...');
try {
    const productosRoutes = require('./routes/productos-prisma.routes');
    app.use('/api/productos', productosRoutes);
    console.log('✅ Productos routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading productos routes:', error.message);
}

console.log('Loading ventas routes...');
try {
    const ventasRoutes = require('./routes/ventas-prisma.routes');
    app.use('/api/ventas', ventasRoutes);
    console.log('✅ Ventas routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading ventas routes:', error.message);
}

console.log('Loading pedidos routes...');
try {
    const pedidosRoutes = require('./routes/pedidos-prisma.routes');
    app.use('/api/pedidos', pedidosRoutes);
    console.log('✅ Pedidos routes loaded successfully');
} catch (error) {
    console.log('❌ Error loading pedidos routes:', error.message);
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/test`);
});
