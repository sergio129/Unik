// Controlador para ventas/facturas con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Importar PDFKit de forma segura
let PDFDocument;
try {
    PDFDocument = require('pdfkit');
} catch (error) {
    console.warn('pdfkit no disponible en este entorno');
    PDFDocument = null;
}

const fs = require('fs');
const path = require('path');

// Obtener todas las facturas
exports.getAllFacturas = async (req, res) => {
  try {
    const { page = 1, limit = 20, cliente_id, fecha_inicio, fecha_fin, estado } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereConditions = {};
    
    if (cliente_id) {
      whereConditions.cliente_id = parseInt(cliente_id);
    }
    
    if (estado) {
      whereConditions.estado = estado;
    }
    
    if (fecha_inicio && fecha_fin) {
      whereConditions.fecha = {
        gte: new Date(fecha_inicio),
        lte: new Date(fecha_fin)
      };
    }
    
    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where: whereConditions,
        include: {
          cliente: {
            select: { id: true, nombre: true, documento: true }
          },
          detalles: {
            include: {
              producto: {
                select: { codigo: true, nombre: true }
              }
            }
          }
        },
        orderBy: { fecha: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.factura.count({ where: whereConditions })
    ]);
    
    return res.status(200).json({
      success: true,
      data: facturas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener facturas',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener factura por ID
exports.getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura requerido'
      });
    }
    
    const facturaId = parseInt(id);
    if (isNaN(facturaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }
    
    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: {
              select: { codigo: true, nombre: true, precio_venta: true }
            }
          }
        }
      }
    });
    
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: factura
    });
  } catch (error) {
    console.error('Error al obtener factura:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener factura',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear una nueva venta/factura
exports.createVenta = async (req, res) => {
  try {
    const { cliente_id, items, metodo_pago, observaciones } = req.body;
    
    if (!cliente_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos para crear la venta'
      });
    }
    
    // Verificar que el usuario está autenticado
    const userId = req.user?.id || 1;
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar stock de productos
      for (const item of items) {
        const producto = await tx.producto.findUnique({
          where: { codigo: item.producto_codigo }
        });
        
        if (!producto) {
          throw new Error(`Producto con código ${item.producto_codigo} no encontrado`);
        }
        
        if (producto.cantidad < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto ${producto.nombre}. Stock disponible: ${producto.cantidad}`);
        }
      }
      
      // Calcular totales
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.precio * item.cantidad;
      }
      
      const impuestos = subtotal * 0.19; // IVA del 19%
      const total = subtotal + impuestos;
      
      // Generar número de factura
      const ultimaFactura = await tx.factura.findFirst({
        orderBy: { numero: 'desc' }
      });
      
      const numeroFactura = ultimaFactura ? ultimaFactura.numero + 1 : 1;
      
      // Crear la factura
      const nuevaFactura = await tx.factura.create({
        data: {
          numero: numeroFactura,
          cliente_id: parseInt(cliente_id),
          fecha: new Date(),
          subtotal: subtotal,
          impuestos: impuestos,
          total: total,
          metodo_pago: metodo_pago || 'efectivo',
          observaciones: observaciones || null,
          estado: 'pagada',
          usuario_id: userId
        }
      });
      
      // Crear detalles de la factura y actualizar stock
      for (const item of items) {
        // Crear detalle
        await tx.detalleFactura.create({
          data: {
            factura_id: nuevaFactura.id,
            producto_codigo: item.producto_codigo,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.precio * item.cantidad
          }
        });
        
        // Actualizar stock del producto
        const producto = await tx.producto.findUnique({
          where: { codigo: item.producto_codigo }
        });
        
        const nuevoStock = producto.cantidad - item.cantidad;
        
        await tx.producto.update({
          where: { codigo: item.producto_codigo },
          data: { cantidad: nuevoStock }
        });
        
        // Registrar movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            producto_codigo: item.producto_codigo,
            tipo_movimiento: 'salida',
            cantidad: item.cantidad,
            stock_anterior: producto.cantidad,
            stock_nuevo: nuevoStock,
            motivo: `Venta - Factura #${numeroFactura}`,
            usuario_id: userId,
            documento_referencia: `F${numeroFactura.toString().padStart(8, '0')}`
          }
        });
      }
      
      return nuevaFactura;
    });
    
    // Obtener la factura completa
    const facturaCompleta = await prisma.factura.findUnique({
      where: { id: resultado.id },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: {
              select: { codigo: true, nombre: true }
            }
          }
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Venta realizada con éxito',
      data: facturaCompleta
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la venta',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Anular una factura
exports.anularFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const userId = req.user?.id || 1;
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la factura existe y no está anulada
      const factura = await tx.factura.findUnique({
        where: { id: parseInt(id) },
        include: { detalles: true }
      });
      
      if (!factura) {
        throw new Error('Factura no encontrada');
      }
      
      if (factura.estado === 'anulada') {
        throw new Error('La factura ya está anulada');
      }
      
      // Devolver stock de todos los productos
      for (const detalle of factura.detalles) {
        const producto = await tx.producto.findUnique({
          where: { codigo: detalle.producto_codigo }
        });
        
        const nuevoStock = producto.cantidad + detalle.cantidad;
        
        await tx.producto.update({
          where: { codigo: detalle.producto_codigo },
          data: { cantidad: nuevoStock }
        });
        
        // Registrar movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            producto_codigo: detalle.producto_codigo,
            tipo_movimiento: 'entrada',
            cantidad: detalle.cantidad,
            stock_anterior: producto.cantidad,
            stock_nuevo: nuevoStock,
            motivo: `Anulación - Factura #${factura.numero}`,
            usuario_id: userId,
            documento_referencia: `F${factura.numero.toString().padStart(8, '0')}`
          }
        });
      }
      
      // Actualizar estado de la factura
      const facturaAnulada = await tx.factura.update({
        where: { id: parseInt(id) },
        data: {
          estado: 'anulada',
          observaciones: `${factura.observaciones || ''}\nANULADA: ${motivo || 'Sin motivo especificado'}`
        }
      });
      
      return facturaAnulada;
    });
    
    return res.status(200).json({
      success: true,
      message: 'Factura anulada exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al anular factura:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al anular factura',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener ventas del día
exports.getVentasDiarias = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    const ventas = await prisma.factura.aggregate({
      where: {
        fecha: {
          gte: hoy,
          lt: manana
        },
        estado: 'pagada'
      },
      _count: true,
      _sum: {
        total: true
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        cantidad: ventas._count || 0,
        total: (ventas._sum.total || 0).toFixed(2),
        fecha: hoy.toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las ventas diarias',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Procesar devolución de productos
exports.procesarDevolucion = async (req, res) => {
  try {
    const { id } = req.params;
    const { productos, motivo } = req.body;
    
    if (!productos || productos.length === 0 || !motivo) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren productos y motivo para la devolución'
      });
    }
    
    const userId = req.user?.id || 1;
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la factura existe
      const factura = await tx.factura.findUnique({
        where: { id: parseInt(id) },
        include: { detalles: true }
      });
      
      if (!factura) {
        throw new Error('Factura no encontrada');
      }
      
      if (factura.estado !== 'pagada') {
        throw new Error('Solo se pueden procesar devoluciones de facturas pagadas');
      }
      
      let totalDevolucion = 0;
      
      // Procesar cada producto devuelto
      for (const itemDevolucion of productos) {
        const detalle = factura.detalles.find(d => d.producto_codigo === itemDevolucion.producto_codigo);
        
        if (!detalle) {
          throw new Error(`El producto ${itemDevolucion.producto_codigo} no está en esta factura`);
        }
        
        if (itemDevolucion.cantidad > detalle.cantidad) {
          throw new Error(`No se puede devolver más cantidad de la vendida para el producto ${itemDevolucion.producto_codigo}`);
        }
        
        // Devolver stock
        const producto = await tx.producto.findUnique({
          where: { codigo: itemDevolucion.producto_codigo }
        });
        
        const nuevoStock = producto.cantidad + itemDevolucion.cantidad;
        
        await tx.producto.update({
          where: { codigo: itemDevolucion.producto_codigo },
          data: { cantidad: nuevoStock }
        });
        
        // Registrar movimiento
        await tx.movimientoInventario.create({
          data: {
            producto_codigo: itemDevolucion.producto_codigo,
            tipo_movimiento: 'entrada',
            cantidad: itemDevolucion.cantidad,
            stock_anterior: producto.cantidad,
            stock_nuevo: nuevoStock,
            motivo: `Devolución - Factura #${factura.numero}: ${motivo}`,
            usuario_id: userId,
            documento_referencia: `DEV-F${factura.numero.toString().padStart(8, '0')}`
          }
        });
        
        totalDevolucion += detalle.precio_unitario * itemDevolucion.cantidad;
      }
      
      // Actualizar observaciones de la factura
      await tx.factura.update({
        where: { id: parseInt(id) },
        data: {
          observaciones: `${factura.observaciones || ''}\nDEVOLUCIÓN: ${motivo} - Total devuelto: $${totalDevolucion.toFixed(2)}`
        }
      });
      
      return { totalDevolucion };
    });
    
    return res.status(200).json({
      success: true,
      message: 'Devolución procesada exitosamente',
      data: {
        total_devolucion: resultado.totalDevolucion.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error al procesar devolución:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar devolución',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener estadísticas de ventas
exports.getEstadisticasVentas = async (req, res) => {
  try {
    const { periodo = '30' } = req.query;
    const diasAtras = parseInt(periodo);
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras);
    
    // Ventas totales del período
    const ventasPeriodo = await prisma.factura.aggregate({
      where: {
        fecha: { gte: fechaInicio },
        estado: 'pagada'
      },
      _count: true,
      _sum: { total: true }
    });
    
    // Ventas por día
    const ventasPorDia = await prisma.$queryRaw`
      SELECT DATE(fecha) as fecha, COUNT(*) as cantidad, SUM(total) as total
      FROM facturas
      WHERE fecha >= ${fechaInicio} AND estado = 'pagada'
      GROUP BY DATE(fecha)
      ORDER BY fecha DESC
    `;
    
    // Productos más vendidos
    const productosMasVendidos = await prisma.detalleFactura.groupBy({
      by: ['producto_codigo'],
      where: {
        factura: {
          fecha: { gte: fechaInicio },
          estado: 'pagada'
        }
      },
      _sum: {
        cantidad: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 10
    });
    
    // Obtener información de productos
    const codigosProductos = productosMasVendidos.map(item => item.producto_codigo);
    const productos = await prisma.producto.findMany({
      where: { codigo: { in: codigosProductos } },
      select: { codigo: true, nombre: true }
    });
    
    const productosMasVendidosConInfo = productosMasVendidos.map(item => {
      const producto = productos.find(p => p.codigo === item.producto_codigo);
      return {
        codigo: item.producto_codigo,
        nombre: producto?.nombre || 'Producto no encontrado',
        cantidad_vendida: item._sum.cantidad,
        total_vendido: item._sum.subtotal
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        periodo_dias: diasAtras,
        ventas_totales: {
          cantidad: ventasPeriodo._count || 0,
          total: ventasPeriodo._sum.total || 0
        },
        ventas_por_dia: ventasPorDia,
        productos_mas_vendidos: productosMasVendidosConInfo
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de ventas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de ventas',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Generar PDF de factura
exports.generarPDF = async (req, res) => {
  try {
    // Verificar si PDFDocument está disponible
    if (!PDFDocument) {
      return res.status(503).json({
        success: false,
        message: 'Generación de PDF no disponible en este entorno',
        error: 'PDFKit not available'
      });
    }
    
    const { id } = req.params;
    
    // Obtener factura completa
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: {
              select: { codigo: true, nombre: true }
            }
          }
        }
      }
    });
    
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    // Crear documento PDF
    const doc = new PDFDocument();
    const filename = `factura_F${factura.numero.toString().padStart(8, '0')}.pdf`;
    const filepath = path.join('temp', filename);
    
    // Pipe el PDF a un archivo
    doc.pipe(fs.createWriteStream(filepath));
    
    // Configurar respuesta HTTP
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    
    // Generar contenido del PDF
    doc.fontSize(20).text('FACTURA DE VENTA', 50, 50);
    doc.fontSize(12).text(`Número: F${factura.numero.toString().padStart(8, '0')}`, 50, 80);
    doc.text(`Fecha: ${factura.fecha.toLocaleDateString()}`, 50, 95);
    doc.text(`Cliente: ${factura.cliente.nombre}`, 50, 110);
    doc.text(`Documento: ${factura.cliente.documento}`, 50, 125);
    
    // Tabla de productos
    let y = 160;
    doc.text('PRODUCTOS:', 50, y);
    y += 20;
    
    doc.text('Código', 50, y);
    doc.text('Producto', 120, y);
    doc.text('Cant.', 300, y);
    doc.text('Precio', 350, y);
    doc.text('Subtotal', 420, y);
    y += 15;
    
    factura.detalles.forEach(detalle => {
      doc.text(detalle.producto_codigo, 50, y);
      doc.text(detalle.producto.nombre.substring(0, 25), 120, y);
      doc.text(detalle.cantidad.toString(), 300, y);
      doc.text(`$${detalle.precio_unitario.toFixed(2)}`, 350, y);
      doc.text(`$${detalle.subtotal.toFixed(2)}`, 420, y);
      y += 15;
    });
    
    // Totales
    y += 20;
    doc.text(`Subtotal: $${factura.subtotal.toFixed(2)}`, 350, y);
    y += 15;
    doc.text(`Impuestos: $${factura.impuestos.toFixed(2)}`, 350, y);
    y += 15;
    doc.fontSize(14).text(`TOTAL: $${factura.total.toFixed(2)}`, 350, y);
    
    if (factura.observaciones) {
      y += 30;
      doc.fontSize(10).text(`Observaciones: ${factura.observaciones}`, 50, y);
    }
    
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

module.exports = exports;
