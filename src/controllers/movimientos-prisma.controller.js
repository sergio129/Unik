// Controlador para la gestión de movimientos de inventario con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los movimientos de inventario
exports.getAllMovimientos = async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      producto_id, 
      tipo,
      usuario_id,
      page = 1,
      limit = 50
    } = req.query;
    
    // Construir condiciones de búsqueda
    let where = {};
    
    // Filtrar por rango de fechas
    if (fecha_inicio && fecha_fin) {
      where.createdAt = {
        gte: new Date(fecha_inicio),
        lte: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    } else if (fecha_inicio) {
      where.createdAt = {
        gte: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      where.createdAt = {
        lte: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    }
    
    // Filtrar por producto
    if (producto_id) {
      where.producto_id = parseInt(producto_id);
    }
    
    // Filtrar por tipo de movimiento
    if (tipo) {
      where.tipo = tipo;
    }
    
    // Filtrar por usuario
    if (usuario_id) {
      where.usuario_id = parseInt(usuario_id);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const movimientos = await prisma.movimientoInventario.findMany({
      where,
      include: {
        producto: {
          select: {
            codigo: true,
            nombre: true,
            precio_costo: true,
            precio: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre_completo: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: parseInt(limit)
    });

    // Obtener total para paginación
    const total = await prisma.movimientoInventario.count({ where });

    res.json({
      success: true,
      data: movimientos,
      pagination: {
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimientos',
      error: error.message
    });
  }
};

// Obtener count de movimientos
exports.countMovimientos = async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      producto_id, 
      tipo,
      usuario_id 
    } = req.query;
    
    let where = {};
    
    // Aplicar los mismos filtros que en getAllMovimientos
    if (fecha_inicio && fecha_fin) {
      where.createdAt = {
        gte: new Date(fecha_inicio),
        lte: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    } else if (fecha_inicio) {
      where.createdAt = {
        gte: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      where.createdAt = {
        lte: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    }
    
    if (producto_id) {
      where.producto_id = parseInt(producto_id);
    }
    
    if (tipo) {
      where.tipo = tipo;
    }
    
    if (usuario_id) {
      where.usuario_id = parseInt(usuario_id);
    }

    const count = await prisma.movimientoInventario.count({ where });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error al contar movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al contar movimientos',
      error: error.message
    });
  }
};

// Obtener resumen de movimientos
exports.getResumenMovimientos = async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      producto_id 
    } = req.query;
    
    let where = {};
    
    // Filtrar por rango de fechas
    if (fecha_inicio && fecha_fin) {
      where.createdAt = {
        gte: new Date(fecha_inicio),
        lte: new Date(new Date(fecha_fin).setHours(23, 59, 59))
      };
    }
    
    if (producto_id) {
      where.producto_id = parseInt(producto_id);
    }

    // Obtener movimientos agrupados por tipo
    const resumenPorTipo = await prisma.movimientoInventario.groupBy({
      by: ['tipo'],
      where,
      _count: {
        id: true
      },
      _sum: {
        cantidad: true
      }
    });

    // Total de movimientos
    const totalMovimientos = await prisma.movimientoInventario.count({ where });

    // Movimientos por mes (últimos 6 meses)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6);

    const movimientosPorMes = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as mes,
        COUNT(*) as total,
        SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END) as salidas
      FROM "movimientos_inventario"
      WHERE "createdAt" >= ${fechaLimite}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY mes DESC
    `;

    res.json({
      success: true,
      data: {
        resumenPorTipo,
        totalMovimientos,
        movimientosPorMes
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de movimientos',
      error: error.message
    });
  }
};

// Obtener movimiento por ID
exports.getMovimientoById = async (req, res) => {
  try {
    const { id } = req.params;

    const movimiento = await prisma.movimientoInventario.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        producto: {
          select: {
            codigo: true,
            nombre: true,
            precio_costo: true,
            precio: true,
            stock: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre_completo: true,
            email: true
          }
        }
      }
    });

    if (!movimiento) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: movimiento
    });
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimiento',
      error: error.message
    });
  }
};

// Crear nuevo movimiento
exports.createMovimiento = async (req, res) => {
  try {
    const { 
      producto_id, 
      tipo, 
      cantidad, 
      motivo, 
      referencia, 
      usuario_id 
    } = req.body;

    // Validaciones básicas
    if (!producto_id || !tipo || !cantidad) {
      return res.status(400).json({
        success: false,
        message: 'producto_id, tipo y cantidad son requeridos'
      });
    }

    if (!['entrada', 'salida', 'ajuste', 'venta', 'devolucion'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de movimiento inválido'
      });
    }

    // Verificar que el producto existe y obtener stock actual
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(producto_id) }
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const stockAnterior = producto.stock;
    let stockNuevo;

    // Calcular nuevo stock según el tipo de movimiento
    switch (tipo) {
      case 'entrada':
      case 'devolucion':
        stockNuevo = stockAnterior + parseInt(cantidad);
        break;
      case 'salida':
      case 'venta':
        stockNuevo = stockAnterior - parseInt(cantidad);
        if (stockNuevo < 0) {
          return res.status(400).json({
            success: false,
            message: 'Stock insuficiente para realizar el movimiento'
          });
        }
        break;
      case 'ajuste':
        stockNuevo = parseInt(cantidad); // En ajuste, cantidad es el nuevo stock
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de movimiento no válido'
        });
    }

    // Transacción para crear movimiento y actualizar stock
    const resultado = await prisma.$transaction(async (prisma) => {
      // Crear el movimiento
      const movimiento = await prisma.movimientoInventario.create({
        data: {
          producto_id: parseInt(producto_id),
          tipo,
          cantidad: tipo === 'ajuste' ? stockNuevo - stockAnterior : parseInt(cantidad),
          stock_anterior: stockAnterior,
          stock_actual: stockNuevo,
          precio: producto.precio_costo,
          motivo: motivo || null,
          referencia: referencia || null,
          usuario_id: usuario_id ? parseInt(usuario_id) : null
        },
        include: {
          producto: {
            select: {
              codigo: true,
              nombre: true
            }
          },
          usuario: {
            select: {
              nombre_completo: true
            }
          }
        }
      });

      // Actualizar stock del producto
      await prisma.producto.update({
        where: { id: parseInt(producto_id) },
        data: { stock: stockNuevo }
      });

      return movimiento;
    });

    res.status(201).json({
      success: true,
      message: 'Movimiento creado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear movimiento',
      error: error.message
    });
  }
};
