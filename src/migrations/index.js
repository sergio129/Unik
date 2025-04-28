const initCategorias = require('./init-categorias');
const initProductos = require('./init-productos');
const initProductosMejoras = require('./init-productos-mejoras');
const initMovimientos = require('./init-movimientos');
const initUsuarios = require('./init-usuarios');
const fixPedidosTable = require('./fix-pedidos-table');
const fixPedidosIdColumn = require('./fix-pedidos-id-column');
const createDetallesPedidoTable = require('./create-detalles-pedido-table');
const updateFacturasSchema = require('./update-facturas-schema');
const addTipoDocumentoClientes = require('./add-tipo-documento-clientes');
const updatePedidosProveedorId = require('./update-pedidos-proveedor-id');
const addTipoPedidoAndProveedor = require('./add-tipo-pedido-and-proveedor');
const fixSeguimientoPedidos = require('./fix-seguimiento-pedidos');
const addNitToProveedores = require('./add-nit-to-proveedores');
const addSubcategoriesSupport = require('./add-subcategories-support');
const addPerfilUsuarios = require('./add-perfil-usuarios');

// Array ordenado de migraciones
const migrations = [
  initCategorias,
  initProductos,
  initProductosMejoras,
  initMovimientos,
  initUsuarios,
  fixPedidosTable,
  fixPedidosIdColumn,
  createDetallesPedidoTable,
  updateFacturasSchema,
  addTipoDocumentoClientes,
  updatePedidosProveedorId,
  addTipoPedidoAndProveedor,
  fixSeguimientoPedidos, // Migración para corregir SeguimientoPedidos
  addNitToProveedores, // Migración para agregar columna nit a proveedores
  addSubcategoriesSupport, // Migración para añadir soporte de subcategorías
  addPerfilUsuarios // Migración para añadir campos de perfil extendido a usuarios
];

// Función para ejecutar las migraciones en orden
async function runMigrations() {
  const { sequelize } = require('../utils/database');
  
  console.log('Iniciando migraciones...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const migration of migrations) {
    try {
      await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
      successCount++;
    } catch (error) {
      console.error(`Error en migración: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`Migraciones completadas: ${successCount} exitosas, ${errorCount} con errores`);
}

module.exports = runMigrations;