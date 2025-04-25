// Controlador para la gestión de movimientos de inventario
const MovimientoInventario = require('../models/movimiento.model');
const Producto = require('../models/producto.model');
const Usuario = require('../models/usuario.model');
const { sequelize } = require('../utils/database'); // Corregir la importación de sequelize
const { Op } = require('sequelize');

// Obtener todos los movimientos de inventario
exports.getAllMovimientos = async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      producto_id, 
      tipo_movimiento,
      usuario_id 
    } = req.query;
    
    // Construir condiciones de búsqueda
    let where = {};
    
    // Filtrar por rango de fechas
    if (fecha_inicio && fecha_fin) {
      where.fecha_creacion = {
        [Op.between]: [
          new Date(fecha_inicio), 
          new Date(new Date(fecha_fin).setHours(23, 59, 59))
        ]
      };
    } else if (fecha_inicio) {
      where.fecha_creacion = {
        [Op.gte]: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      where.fecha_creacion = {
        [Op.lte]: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    }
    
    // Filtrar por producto
    if (producto_id) {
      where.producto_codigo = producto_id; // Cambiado de producto_id a producto_codigo
    }
    
    // Filtrar por tipo de movimiento
    if (tipo_movimiento) {
      where.tipo_movimiento = tipo_movimiento;
    }
    
    // Filtrar por usuario
    if (usuario_id) {
      where.usuario_id = usuario_id;
    }
    
    // Obtener movimientos con sus relaciones
    const movimientos = await MovimientoInventario.findAll({
      where,
      include: [
        { 
          model: Producto, 
          as: 'producto', 
          attributes: ['codigo', 'nombre'] // Removido 'id' ya que no existe
        },
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['id', 'username', 'nombre_completo']
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: movimientos
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de movimientos',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener un movimiento por ID
exports.getMovimientoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const movimiento = await MovimientoInventario.findByPk(id, {
      include: [
        { 
          model: Producto, 
          as: 'producto', 
          attributes: ['codigo', 'nombre'] // Eliminado 'id' ya que no existe
        },
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['id', 'username', 'nombre_completo']
        }
      ]
    });
    
    if (!movimiento) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: movimiento
    });
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información del movimiento',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear un nuevo movimiento de inventario
exports.createMovimiento = async (req, res) => {
  // Iniciar transacción
  const t = await sequelize.transaction();
  
  try {
    const { 
      producto_id, // Este será el código del producto
      tipo_movimiento, 
      cantidad, 
      motivo, 
      documento_referencia,
      precio_unitario
    } = req.body;
    
    // Validaciones básicas
    if (!producto_id || !tipo_movimiento || cantidad === undefined) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Producto, tipo de movimiento y cantidad son obligatorios'
      });
    }
    
    // Verificar que el tipo de movimiento sea válido
    const tiposValidos = ['entrada', 'salida', 'ajuste'];
    if (!tiposValidos.includes(tipo_movimiento)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tipo de movimiento no válido. Debe ser: entrada, salida o ajuste'
      });
    }
    
    // Verificar que la cantidad sea un número entero y distinto de cero
    const cantidadInt = parseInt(cantidad);
    if (isNaN(cantidadInt) || cantidadInt === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número entero distinto de cero'
      });
    }
    
    // Verificar si el producto existe usando el código como clave primaria
    const producto = await Producto.findByPk(producto_id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Determinar el stock anterior y el nuevo stock
    const stockAnterior = producto.stock;
    let stockNuevo = stockAnterior;
    
    // Actualizar el stock según el tipo de movimiento
    if (tipo_movimiento === 'entrada') {
      stockNuevo += cantidadInt;
    } else if (tipo_movimiento === 'salida') {
      stockNuevo -= cantidadInt;
    } else if (tipo_movimiento === 'ajuste') {
      stockNuevo = cantidadInt; // El ajuste establece el stock directamente
    }
    
    // Verificar que el stock no sea negativo
    if (stockNuevo < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El stock no puede ser negativo'
      });
    }
    
    // Actualizar el stock del producto
    await producto.update({ stock: stockNuevo }, { transaction: t });
    
    // Crear el movimiento
    const movimiento = await MovimientoInventario.create({
      producto_codigo: producto_id, // Usar el código del producto
      tipo_movimiento,
      cantidad: tipo_movimiento === 'ajuste' ? stockNuevo - stockAnterior : cantidadInt,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo: motivo || null,
      usuario_id: req.user.id,
      documento_referencia: documento_referencia || null,
      precio_unitario: precio_unitario || null
    }, { transaction: t });
    
    // Confirmar transacción
    await t.commit();
    
    // Obtener el movimiento recién creado con sus relaciones
    const movimientoCompleto = await MovimientoInventario.findByPk(movimiento.id, {
      include: [
        { 
          model: Producto, 
          as: 'producto', 
          attributes: ['codigo', 'nombre']
        },
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['id', 'username', 'nombre_completo']
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Movimiento de inventario registrado exitosamente',
      data: movimientoCompleto
    });
  } catch (error) {
    // En caso de error, revertir la transacción
    await t.rollback();
    console.error('Error al crear movimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar el movimiento de inventario',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener resumen de movimientos
exports.getResumenMovimientos = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Construir condiciones de búsqueda para fechas
    let where = {};
    if (fecha_inicio && fecha_fin) {
      where.fecha_creacion = {
        [Op.between]: [
          new Date(fecha_inicio), 
          new Date(new Date(fecha_fin).setHours(23, 59, 59))
        ]
      };
    } else if (fecha_inicio) {
      where.fecha_creacion = {
        [Op.gte]: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      where.fecha_creacion = {
        [Op.lte]: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    }
    
    // Obtener totales por tipo de movimiento
    const resumenMovimientos = await MovimientoInventario.findAll({
      where,
      attributes: [
        'tipo_movimiento',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_movimientos'],
        [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_cantidad']
      ],
      group: ['tipo_movimiento']
    });
    
    // Obtener los productos con más movimientos
    const productosTopMovimientos = await MovimientoInventario.findAll({
      where,
      attributes: [
        'producto_codigo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_movimientos']
      ],
      include: [
        { 
          model: Producto, 
          as: 'producto', 
          attributes: ['codigo', 'nombre']
        }
      ],
      group: ['producto_codigo'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5
    });
    
    return res.status(200).json({
      success: true,
      data: {
        resumen_por_tipo: resumenMovimientos,
        productos_top: productosTopMovimientos
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de movimientos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen de movimientos',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};