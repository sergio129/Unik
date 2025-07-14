// Servidor serverless mínimo para debugging
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🚀 Iniciando servidor serverless mínimo...');

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// Health check básico
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Servidor mínimo funcionando',
        node_version: process.version,
        memory: process.memoryUsage()
    });
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas básicas de páginas
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    } catch (error) {
        res.status(500).send('Error loading page: ' + error.message);
    }
});

app.get('/login', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../public', 'login.html'));
    } catch (error) {
        res.status(500).send('Error loading login page: ' + error.message);
    }
});

app.get('/dashboard', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
    } catch (error) {
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// Catch all para debugging
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        message: 'Error interno del servidor',
        error: error.message
    });
});

console.log('✅ Servidor serverless mínimo configurado');

module.exports = app;
