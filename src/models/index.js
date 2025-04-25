const { sequelize } = require('../utils/database');
const Categoria = require('./categoria.model');
const Producto = require('./producto.model');
const CodigoBarras = require('./codigo-barras.model')(sequelize);
const ProductoCompuesto = require('./producto-compuesto.model');
const HistorialPreciosModule = require('./historial-precios.model');
const UnidadMedida = require('./unidad-medida.model');
const Usuario = require('./usuario.model');
const Movimiento = require('./movimiento.model');
const Cliente = require('./cliente.model');
const Factura = require('./factura.model');
const DetalleFactura = require('./detalle-factura.model');
const Pedido = require('./pedido.model');
const DetallePedido = require('./detalle-pedido.model');
const SeguimientoPedido = require('./seguimiento-pedido.model');

// Initialize models that are functions (need sequelize instance)
const HistorialPrecios = HistorialPreciosModule(sequelize);

const models = {
  Categoria,
  Producto,
  CodigoBarras,
  ProductoCompuesto,
  HistorialPrecios,
  UnidadMedida,
  Usuario,
  Movimiento,
  Cliente,
  Factura,
  DetalleFactura,
  Pedido,
  DetallePedido,
  SeguimientoPedido
};

// Asegurarnos de que todas las relaciones estén establecidas
Object.values(models).forEach(model => {
  if (model && model.associate) {
    model.associate(models);
  }
});

// Función para sincronizar todos los modelos
async function syncModels(force = false) {
  try {
    await sequelize.sync({ force });
    console.log('Modelos sincronizados correctamente');
    return true;
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
    throw error;
  }
}

module.exports = {
  ...models,
  sequelize,
  syncModels
};