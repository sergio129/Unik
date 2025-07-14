const express = require('express');

console.log('🔍 Debugging rutas individualmente...\n');

const app = express();

const routes = [
    { name: 'auth', path: './src/routes/auth-prisma.routes' },
    { name: 'usuarios', path: './src/routes/usuarios-prisma.routes' },
    { name: 'categorias', path: './src/routes/categorias-prisma.routes' },
    { name: 'productos', path: './src/routes/productos-prisma.routes' },
    { name: 'ventas', path: './src/routes/ventas-prisma.routes' },
    { name: 'pedidos', path: './src/routes/pedidos-prisma.routes' }
];

for (const route of routes) {
    try {
        console.log(`Probando ${route.name}...`);
        const routeModule = require(route.path);
        
        // Intentar usar la ruta
        app.use(`/api/${route.name}`, routeModule);
        console.log(`✅ ${route.name} - OK`);
        
    } catch (error) {
        console.log(`❌ ${route.name} - ERROR:`, error.message);
        console.log('Stack:', error.stack);
        break;
    }
}

console.log('\n🎯 Debug completado');
