// Controlador para la actividad reciente del sistema
const { sequelize, Sequelize } = require('../utils/database');
const Op = Sequelize.Op;
const Factura = require('../models/factura.model');
const MovimientoInventario = require('../models/movimiento.model');
const Usuario = require('../models/usuario.model');
const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');

// Obtener actividad reciente (ventas, movimientos de inventario, etc.)
exports.getRecentActivity = async (req, res) => {
  try {
    // Limitar a los últimos 7 días y 10 registros
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    
    // Obtener límite de registros de los parámetros de consulta o usar 10 por defecto
    const limit = parseInt(req.query.limit) || 10;
    
    // 1. Obtener las ventas recientes (facturas)
    const ventas = await Factura.findAll({
      attributes: [
        'id', 
        'numero', 
        'fecha', 
        'total', 
        'estado',
        'usuario_id',
        [Sequelize.literal("'venta'"), 'tipo_actividad']
      ],
      where: {
        fecha: {
          [Op.gte]: fechaLimite
        }
      },
      include: [
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['username', 'nombre_completo']
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nombre']
        }
      ],
      order: [['fecha', 'DESC']],
      limit
    });
    
    // 2. Obtener los movimientos de inventario recientes
    const movimientos = await MovimientoInventario.findAll({
      attributes: [
        'id', 
        'fecha_creacion', // Cambiado de 'fecha' a 'fecha_creacion'
        'tipo_movimiento', 
        'cantidad', 
        'motivo',
        'usuario_id',
        'producto_codigo',
        [Sequelize.literal("'movimiento_inventario'"), 'tipo_actividad']
      ],
      where: {
        fecha_creacion: { // Cambiado de 'fecha' a 'fecha_creacion'
          [Op.gte]: fechaLimite
        }
      },
      include: [
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['username', 'nombre_completo']
        },
        {
          model: Producto,
          as: 'producto',
          attributes: ['codigo', 'nombre']
        }
      ],
      order: [['fecha_creacion', 'DESC']], // Cambiado de 'fecha' a 'fecha_creacion'
      limit
    });
    
    // 3. Combinar ambos resultados y ordenar por fecha
    let actividades = [
      ...ventas.map(venta => {
        const data = venta.get({ plain: true });
        return {
          id: `v-${data.id}`,
          fecha: data.fecha,
          tipo: 'venta',
          descripcion: `Venta realizada - ${data.numero}`,
          usuario: data.usuario ? data.usuario.nombre_completo || data.usuario.username : 'Sistema',
          detalle: {
            valor: data.total,
            estado: data.estado,
            cliente: data.cliente ? data.cliente.nombre : 'Cliente no especificado'
          }
        };
      }),
      
      ...movimientos.map(movimiento => {
        const data = movimiento.get({ plain: true });
        return {
          id: `m-${data.id}`,
          fecha: data.fecha_creacion, // Cambiado de 'fecha' a 'fecha_creacion'
          tipo: data.tipo_movimiento === 'entrada' ? 'entrada_producto' : 'salida_producto',
          descripcion: data.tipo_movimiento === 'entrada' ? 
            `Entrada de producto${data.producto ? ` - ${data.producto.nombre}` : ''}` : 
            `Salida de producto${data.producto ? ` - ${data.producto.nombre}` : ''}`,
          usuario: data.usuario ? data.usuario.nombre_completo || data.usuario.username : 'Sistema',
          detalle: {
            cantidad: data.cantidad,
            motivo: data.motivo,
            producto: data.producto ? data.producto.nombre : 'Producto desconocido'
          }
        };
      })
    ];
    
    // Ordenar por fecha descendente
    actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Limitar al número de registros solicitados
    actividades = actividades.slice(0, limit);
    
    res.json({
      success: true,
      data: actividades
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la actividad reciente',
      error: error.message
    });
  }
};