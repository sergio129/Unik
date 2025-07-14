// Controlador para la gestión de productos con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Excel = require('exceljs');
const csv = require('fast-csv');

// Configurar multer para el almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/productos');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Obtener todos los productos con filtros
exports.getAllProductos = async (req, res) => {
  try {
    const { buscar, categoria, activo, bajoStock } = req.query;
    
    const whereConditions = {};
    
    // Filtro de búsqueda
    if (buscar) {
      whereConditions.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } }
      ];
    }
    
    // Filtrar por categoría
    if (categoria) {
      whereConditions.categoria_id = parseInt(categoria);
    }
    
    // Filtrar por activo/inactivo
    if (activo !== undefined) {
      whereConditions.activo = activo === 'true';
    }
    
    // Filtrar productos con bajo stock
    if (bajoStock === 'true') {
      whereConditions.stock = {
        lte: 5 // Usar un valor fijo por ahora
      };
    }
    
    const productos = await prisma.producto.findMany({
      where: whereConditions,
      include: {
        categoria: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return res.status(200).json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener producto por código
exports.getProductoByCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const producto = await prisma.producto.findUnique({
      where: { codigo },
      include: {
        categoria: {
          select: { id: true, nombre: true }
        },
        unidad_medida: {
          select: { id: true, nombre: true, abreviacion: true }
        },
        codigos_barras: true,
        movimientos_inventario: {
          take: 10,
          orderBy: { created_at: 'desc' }
        }
      }
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear nuevo producto
exports.createProducto = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      precio_costo,
      precio,
      stock_inicial,
      stock_minimo,
      unidad_medida_id,
      activo = true
    } = req.body;
    console.log('📦 DATOS RECIBIDOS:', { codigo, nombre, descripcion, categoria_id, precio_costo, precio, stock_inicial });
    
    // Validaciones básicas
    if (!codigo || !nombre || !categoria_id) {
      return res.status(400).json({
        success: false,
        message: 'Los campos código, nombre y categoría son obligatorios'
      });
    }
    
    // Verificar si el código ya existe
    const productoExistente = await prisma.producto.findUnique({
      where: { codigo }
    });
    
    if (productoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese código'
      });
    }
    
    // Verificar que la categoría existe
    const categoria = await prisma.categoria.findUnique({
      where: { id: parseInt(categoria_id) }
    });
    
    if (!categoria) {
      return res.status(400).json({
        success: false,
        message: 'La categoría especificada no existe'
      });
    }
    
    // Usar transacción para crear producto y relacionados
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el producto
      const nuevoProducto = await tx.producto.create({
        data: {
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          categoria_id: parseInt(categoria_id),
          precio: precio ? parseFloat(precio) : 0, // Campo obligatorio (precio de venta)
          precio_costo: precio_costo ? parseFloat(precio_costo) : null, // Campo opcional
          stock: stock_inicial ? parseInt(stock_inicial) : 0, // Stock inicial desde el frontend
          stock_minimo: stock_minimo ? parseInt(stock_minimo) : 5,
          unidad_medida_id: unidad_medida_id ? parseInt(unidad_medida_id) : null,
          activo: Boolean(activo)
        }
      });
      
      return nuevoProducto;
    });
    
    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar producto
exports.updateProducto = async (req, res) => {
  try {
    const { codigo } = req.params;
    const {
      nombre,
      descripcion,
      categoria_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      unidad_medida_id,
      activo
    } = req.body;
    
    // Verificar que el producto existe
    const productoExistente = await prisma.producto.findUnique({
      where: { codigo }
    });
    
    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Usar transacción para actualizar
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar el producto
      const productoActualizado = await tx.producto.update({
        where: { codigo },
        data: {
          ...(nombre && { nombre: nombre.trim() }),
          ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
          ...(categoria_id && { categoria_id: parseInt(categoria_id) }),
          ...(precio_compra !== undefined && { precio_costo: parseFloat(precio_compra) || 0 }),
          ...(precio_venta !== undefined && { precio: parseFloat(precio_venta) || 0 }),
          ...(stock_minimo !== undefined && { stock_minimo: parseInt(stock_minimo) || 0 }),
          ...(unidad_medida_id !== undefined && { 
            unidad_medida_id: unidad_medida_id ? parseInt(unidad_medida_id) : null 
          }),
          ...(activo !== undefined && { activo: Boolean(activo) })
        }
      });
      
      return productoActualizado;
    });
    
    return res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar producto
exports.deleteProducto = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { codigo },
      include: {
        detalles_pedido: true,
        detalles_factura: true,
        movimientos_inventario: true
      }
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar que no tiene transacciones asociadas
    if (producto.detalles_pedido.length > 0 || 
        producto.detalles_factura.length > 0 || 
        producto.movimientos_inventario.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el producto porque tiene transacciones asociadas'
      });
    }
    
    // Eliminar en transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar códigos de barras
      await tx.codigoBarras.deleteMany({
        where: { producto_id: producto.id }
      });
      
      // Eliminar historial de precios
      await tx.historialPrecios.deleteMany({
        where: { producto_id: producto.id }
      });
      
      // Eliminar el producto
      await tx.producto.delete({
        where: { codigo }
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar stock de producto
exports.updateStock = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { cantidad, motivo } = req.body;
    
    if (!cantidad || isNaN(cantidad)) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número válido'
      });
    }
    
    const cantidadNum = parseInt(cantidad);
    
    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { codigo }
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    const cantidadAnterior = producto.stock;
    const cantidadNueva = cantidadNum;
    
    // Actualizar en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar stock
      await tx.producto.update({
        where: { codigo },
        data: { stock: cantidadNueva }
      });
      
      // Registrar movimiento
      await tx.movimientoInventario.create({
        data: {
          producto_id: producto.id,
          tipo: cantidadNueva > cantidadAnterior ? 'entrada' : 'salida',
          cantidad: Math.abs(cantidadNueva - cantidadAnterior),
          stock_anterior: cantidadAnterior,
          stock_actual: cantidadNueva,
          motivo: motivo || 'Ajuste manual de inventario',
          usuario_id: req.user?.id || 1,
          referencia: null
        }
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: {
        codigo: producto.codigo,
        nombre: producto.nombre,
        stock_anterior: cantidadAnterior,
        cantidad_modificada: cantidadNum,
        stock_nuevo: cantidadNueva
      }
    });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el stock del producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener productos con bajo stock
exports.getProductosBajoStock = async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                stock: {
                  lte: prisma.producto.fields.stock_minimo || 5
                }
              },
              {
                stock: {
                  lte: 5  // Fallback si stock_minimo es null
                }
              }
            ]
          },
          { activo: true }
        ]
      },
      include: {
        categoria: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: [
        { stock: 'asc' },
        { nombre: 'asc' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: productos,
      count: productos.length
    });
  } catch (error) {
    console.error('Error al obtener productos con bajo stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener productos con bajo stock',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Buscar productos
exports.searchProductos = async (req, res) => {
  try {
    const { q, categoria, activo, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereConditions = {};
    
    if (q) {
      whereConditions.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (activo !== undefined) {
      whereConditions.activo = activo === 'true';
    }
    
    if (categoria) {
      whereConditions.categoria_id = parseInt(categoria);
    }
    
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereConditions,
        include: {
          categoria: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { nombre: 'asc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.producto.count({ where: whereConditions })
    ]);
    
    return res.status(200).json({
      success: true,
      data: productos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener estadísticas de productos
exports.getEstadisticasProductos = async (req, res) => {
  try {
    // Estadísticas básicas
    const [total, activos, bajoStock, sinStock] = await Promise.all([
      prisma.producto.count(),
      prisma.producto.count({ where: { activo: true } }),
      prisma.producto.count({
        where: {
          AND: [
            { stock: { lte: prisma.producto.fields.stock_minimo } },
            { activo: true }
          ]
        }
      }),
      prisma.producto.count({
        where: {
          AND: [
            { stock: 0 },
            { activo: true }
          ]
        }
      })
    ]);
    
    // Productos más vendidos (por movimientos de salida)
    const masVendidos = await prisma.movimientoInventario.groupBy({
      by: ['producto_codigo'],
      where: {
        tipo_movimiento: 'salida',
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
        }
      },
      _sum: {
        cantidad: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 5
    });
    
    // Obtener información de los productos más vendidos
    const codigosMasVendidos = masVendidos.map(item => item.producto_codigo);
    const productosMasVendidos = await prisma.producto.findMany({
      where: { codigo: { in: codigosMasVendidos } },
      select: { codigo: true, nombre: true }
    });
    
    const masVendidosConInfo = masVendidos.map(item => {
      const producto = productosMasVendidos.find(p => p.codigo === item.producto_codigo);
      return {
        codigo: item.producto_codigo,
        nombre: producto?.nombre || 'Producto no encontrado',
        cantidad_vendida: item._sum.cantidad
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        total,
        activos,
        inactivos: total - activos,
        bajo_stock: bajoStock,
        sin_stock: sinStock,
        mas_vendidos: masVendidosConInfo
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener el conteo total de productos
exports.getProductosCount = async (req, res) => {
  try {
    const total = await prisma.producto.count({
      where: { activo: true }
    });
    
    return res.status(200).json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Error al obtener conteo de productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener conteo de productos',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar estado de un producto (activar/desactivar)
exports.updateEstado = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { activo } = req.body; // Ignoramos resetearStock por ahora

    console.log('🔄 ACTUALIZAR ESTADO:', { codigo, activo, body: req.body });

    // Validar que el estado sea booleano
    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El estado debe ser verdadero o falso'
      });
    }

    // Verificar que el producto existe
    const productoExistente = await prisma.producto.findUnique({
      where: { codigo }
    });

    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Actualizar el estado
    const productoActualizado = await prisma.producto.update({
      where: { codigo },
      data: { activo },
      include: {
        categoria: true
      }
    });

    return res.status(200).json({
      success: true,
      message: `Producto ${activo ? 'activado' : 'desactivado'} exitosamente`,
      data: productoActualizado
    });

  } catch (error) {
    console.error('Error al actualizar estado del producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Middleware de upload
exports.uploadProductImage = upload.single('imagen');

module.exports = exports;
