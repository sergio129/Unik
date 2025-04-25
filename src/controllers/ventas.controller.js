// Controlador para ventas/facturas
const { sequelize, Sequelize } = require('../utils/database');
const Op = Sequelize.Op; // Importar los operadores de Sequelize directamente
const Factura = require('../models/factura.model');
const DetalleFactura = require('../models/detalle-factura.model');
const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');
const MovimientoInventario = require('../models/movimiento.model');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Obtener todas las facturas
exports.getAllFacturas = async (req, res) => {
  try {
    const facturas = await Factura.findAll({
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'documento'] }
      ],
      order: [['fecha', 'DESC']]
    });
    
    res.json(facturas);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ message: 'Error al obtener facturas', error: error.message });
  }
};

// Obtener una factura por ID con sus detalles
exports.getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const factura = await Factura.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { 
          model: DetalleFactura, 
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto', attributes: ['codigo', 'nombre', 'descripcion'] }
          ]
        }
      ]
    });
    
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    res.json(factura);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ message: 'Error al obtener factura', error: error.message });
  }
};

// Crear una nueva venta/factura
exports.createVenta = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { cliente_id, items, metodo_pago, observaciones } = req.body;
    
    if (!cliente_id || !items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Datos incompletos para crear la venta' });
    }
    
    // Verificar que el usuario está autenticado
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    
    // Verificar stock de productos
    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_codigo);
      if (!producto) {
        await transaction.rollback();
        return res.status(404).json({ message: `Producto con código ${item.producto_codigo} no encontrado` });
      }
      
      if (producto.cantidad < item.cantidad) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.cantidad}, Solicitado: ${item.cantidad}` 
        });
      }
    }
    
    // Calcular totales
    let subtotal = 0;
    let impuestoTotal = 0;
    let descuentoTotal = 0;
    
    for (const item of items) {
      const itemSubtotal = item.precio_unitario * item.cantidad;
      const itemImpuesto = itemSubtotal * (item.impuesto || 0) / 100;
      const itemDescuento = itemSubtotal * (item.descuento || 0) / 100;
      
      subtotal += itemSubtotal;
      impuestoTotal += itemImpuesto;
      descuentoTotal += itemDescuento;
    }
    
    const total = subtotal + impuestoTotal - descuentoTotal;
    
    // Generar número de factura
    const numeroFactura = await Factura.generarNumeroFactura();
    
    // Crear factura
    const nuevaFactura = await Factura.create({
      numero: numeroFactura,
      cliente_id,
      usuario_id: userId, // Usar el ID del usuario de la sesión
      fecha: new Date(),
      subtotal,
      impuesto: impuestoTotal,
      descuento: descuentoTotal,
      total,
      estado: 'pagada', // Por defecto asumimos que se paga al momento
      metodo_pago,
      observaciones
    }, { transaction });
    
    // Crear detalles y actualizar inventario
    for (const item of items) {
      // Crear detalle de factura
      await DetalleFactura.create({
        factura_id: nuevaFactura.id,
        producto_codigo: item.producto_codigo,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        impuesto: item.impuesto || 0,
        descuento: item.descuento || 0,
        subtotal: item.precio_unitario * item.cantidad
      }, { transaction });
      
      // Actualizar stock del producto
      const producto = await Producto.findByPk(item.producto_codigo, { transaction });
      const stockAnterior = producto.cantidad;
      const stockNuevo = stockAnterior - item.cantidad;
      
      await producto.update({ cantidad: stockNuevo }, { transaction });
      
      // Registrar movimiento de inventario
      const cliente = await Cliente.findByPk(cliente_id, { transaction });
      await MovimientoInventario.create({
        producto_codigo: item.producto_codigo,
        tipo_movimiento: 'salida',
        cantidad: item.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: `Venta a cliente ${cliente.nombre}`,
        usuario_id: userId, // Usar el ID del usuario de la sesión
        documento_referencia: numeroFactura,
        precio_unitario: item.precio_unitario
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Obtener la factura completa con sus detalles
    const facturaCompleta = await Factura.findByPk(nuevaFactura.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { 
          model: DetalleFactura, 
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto' }
          ]
        }
      ]
    });
    
    res.status(201).json({
      message: 'Venta realizada con éxito',
      factura: facturaCompleta
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear venta:', error);
    res.status(500).json({ message: 'Error al procesar la venta', error: error.message });
  }
};

// Anular una factura
exports.anularFactura = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    // Verificar que el usuario está autenticado
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    
    const factura = await Factura.findByPk(id, {
      include: [
        { model: DetalleFactura, as: 'detalles' }
      ],
      transaction
    });
    
    if (!factura) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    if (factura.estado === 'anulada') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Esta factura ya fue anulada previamente' });
    }
    
    // Actualizar estado de la factura
    await factura.update({
      estado: 'anulada',
      observaciones: factura.observaciones + 
        `\nFactura anulada el ${new Date().toLocaleDateString()} - Motivo: ${motivo || 'No especificado'}`
    }, { transaction });
    
    // Restaurar el inventario
    for (const detalle of factura.detalles) {
      const producto = await Producto.findByPk(detalle.producto_codigo, { transaction });
      const stockAnterior = producto.cantidad;
      const stockNuevo = stockAnterior + detalle.cantidad;
      
      await producto.update({ cantidad: stockNuevo }, { transaction });
      
      // Registrar movimiento de inventario (entrada por anulación)
      await MovimientoInventario.create({
        producto_codigo: detalle.producto_codigo,
        tipo_movimiento: 'entrada',
        cantidad: detalle.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: `Anulación de factura ${factura.numero}`,
        usuario_id: userId, // Usar el ID del usuario de la sesión
        documento_referencia: factura.numero,
        precio_unitario: detalle.precio_unitario
      }, { transaction });
    }
    
    await transaction.commit();
    
    res.json({
      message: 'Factura anulada con éxito',
      factura_id: factura.id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al anular factura:', error);
    res.status(500).json({ message: 'Error al anular la factura', error: error.message });
  }
};

// Generar PDF de factura
exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    const factura = await Factura.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { 
          model: DetalleFactura, 
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto' }
          ]
        }
      ]
    });
    
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    // Enviamos el PDF directamente al navegador en lugar de guardarlo en el servidor
    const filename = `factura_${factura.numero}.pdf`;
    
    // Configurar encabezados para descarga del navegador
    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/pdf');
    
    // Crear PDF y enviarlo directamente en la respuesta
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `Factura ${factura.numero}`,
        Author: 'Sistema UNIKA'
      }
    });
    
    // Pipe para enviar el documento directamente a la respuesta
    doc.pipe(res);
    
    // Definir colores y estilos de la factura
    const colorPrimario = '#2C3E50';     // Azul oscuro
    const colorSecundario = '#3498DB';   // Azul claro
    const colorTexto = '#333333';        // Gris oscuro
    const colorResaltado = '#E74C3C';    // Rojo para destacar
    const colorFondo = '#ECF0F1';        // Gris claro para fondos
    
    // Función para crear rectángulos redondeados
    const drawRoundedRect = (x, y, width, height, radius, fillColor) => {
      doc.roundedRect(x, y, width, height, radius).fillAndStroke(fillColor, '#CCCCCC');
    };
    
    // Función para crear una tabla con estilo
    const drawTable = (data, columns, startX, startY, options) => {
      const { rowHeight = 25, cellPadding = 8, headerHeight = 30 } = options;
      let currentY = startY;
      
      // Dibujar header de la tabla
      drawRoundedRect(startX, currentY, columns.reduce((sum, col) => sum + col.width, 0), headerHeight, 5, colorSecundario);
      
      doc.fillColor('#FFFFFF');
      let currentX = startX + cellPadding;
      columns.forEach(column => {
        const alignOption = column.property === 'cantidad' || column.property === 'precio' || column.property === 'subtotal' 
          ? { width: column.width - cellPadding * 2, align: 'right' } 
          : { width: column.width - cellPadding * 2 };
        doc.text(column.header, currentX, currentY + 8, alignOption);
        currentX += column.width;
      });
      
      currentY += headerHeight;
      
      // Dibujar filas de la tabla
      data.forEach((row, index) => {
        const fillColor = index % 2 === 0 ? '#FFFFFF' : colorFondo;
        drawRoundedRect(startX, currentY, columns.reduce((sum, col) => sum + col.width, 0), rowHeight, 0, fillColor);
        
        // Asegurarnos que el texto sea visible independientemente del color de fondo
        doc.fillColor(colorTexto);
        
        currentX = startX + cellPadding;
        columns.forEach(column => {
          // Alineación a la derecha para valores numéricos
          const alignOption = column.property === 'cantidad' || column.property === 'precio' || column.property === 'subtotal' 
            ? { width: column.width - cellPadding * 2, align: 'right' } 
            : { width: column.width - cellPadding * 2 };
          doc.text(row[column.property].toString(), currentX, currentY + 6, alignOption);
          currentX += column.width;
        });
        
        currentY += rowHeight;
      });
      
      return currentY;
    };
    
    // Dibujar cabecera de la factura con un banner atractivo
    drawRoundedRect(50, 50, 495, 100, 10, '#FFFFFF');
    
    // Banner superior con el título
    doc.rect(50, 50, 495, 40).fill(colorPrimario);
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(24)
       .text('FACTURA', 275, 60, { align: 'center' });
    
    // Logotipo o nombre de la empresa
    doc.fillColor(colorPrimario)
       .font('Helvetica-Bold')
       .fontSize(22)
       .text('UNIKA', 75, 110);
       
    doc.fillColor(colorSecundario)
       .fontSize(12)
       .text('Sistema Integral de Gestión', 75, 135);
    
    // Información de la factura en un cuadro destacado
    drawRoundedRect(350, 100, 195, 90, 5, colorFondo);
    
    doc.fillColor(colorPrimario)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('NÚMERO:', 360, 110);
       
    doc.fillColor(colorResaltado)
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(factura.numero, 430, 110);
    
    doc.fillColor(colorPrimario)
       .fontSize(12)
       .text('FECHA:', 360, 130);
       
    doc.fillColor(colorTexto)
       .fontSize(12)
       .text(new Date(factura.fecha).toLocaleDateString(), 430, 130);
    
    doc.fillColor(colorPrimario)
       .fontSize(12)
       .text('ESTADO:', 360, 150);
    
    const colorEstado = factura.estado === 'pagada' 
      ? '#27AE60' 
      : factura.estado === 'anulada' 
        ? colorResaltado 
        : '#F39C12';
    
    doc.fillColor(colorEstado)
       .font('Helvetica-Bold')
       .text(factura.estado.toUpperCase(), 430, 150);
    
    // Datos del cliente en un recuadro
    doc.fillColor(colorPrimario)
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('INFORMACIÓN DEL CLIENTE', 75, 210);
    
    drawRoundedRect(50, 230, 495, 100, 5, '#FFFFFF');
    
    doc.fillColor(colorSecundario)
       .fontSize(12)
       .text('Cliente:', 75, 245);
       
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .text(factura.cliente.nombre, 200, 245);
    
    doc.fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .text('Documento:', 75, 265);
       
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .text(`${factura.cliente.tipo_documento || ''} ${factura.cliente.documento || 'No especificado'}`, 200, 265);
    
    doc.fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .text('Dirección:', 75, 285);
       
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .text(factura.cliente.direccion || 'No especificada', 200, 285);
    
    doc.fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .text('Método de pago:', 75, 305);
       
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .text(factura.metodo_pago.toUpperCase(), 200, 305);
    
    // Titulo para la tabla de productos
    doc.fillColor(colorPrimario)
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('DETALLE DE PRODUCTOS', 75, 350);
    
    // Preparar datos para la tabla
    const productos = factura.detalles.map(detalle => {
      return {
        producto: detalle.producto.nombre,
        cantidad: detalle.cantidad,
        precio: `$${parseFloat(detalle.precio_unitario).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
        subtotal: `$${parseFloat(detalle.subtotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      };
    });
    
    // Definir columnas de la tabla
    const columns = [
      { header: 'PRODUCTO', property: 'producto', width: 230 },
      { header: 'CANT.', property: 'cantidad', width: 60 },
      { header: 'PRECIO', property: 'precio', width: 100 },
      { header: 'SUBTOTAL', property: 'subtotal', width: 105 }
    ];
    
    // Dibujar tabla de productos
    let finalY = drawTable(productos, columns, 50, 370, { rowHeight: 25 });
    finalY += 20; // Espacio después de la tabla
    
    // Si la tabla es muy larga y llega al final de la página, añadir otra página
    if (finalY > 700) {
      doc.addPage();
      finalY = 50;
    }
    
    // Sección de totales - AJUSTAR PARA EVITAR PROBLEMAS DE MARGEN
    // Pre-calcular los valores formateados para evitar cortes de línea
    const formattedSubtotal = `$${parseFloat(factura.subtotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    const formattedImpuesto = `$${parseFloat(factura.impuesto).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    const formattedDescuento = `$${parseFloat(factura.descuento).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    const formattedTotal = `$${parseFloat(factura.total).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    
    // Dibujar fondo para los totales - Hacer más ancho el rectángulo
    drawRoundedRect(300, finalY, 245, 120, 5, '#FFFFFF');
    
    // Dibujar una línea decorativa
    doc.lineWidth(1)
       .moveTo(50, finalY + 15)
       .lineTo(280, finalY + 15)
       .stroke(colorSecundario);
    
    // SUBTOTAL - Posicionar mejor los elementos
    doc.fillColor(colorSecundario)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('SUBTOTAL:', 320, finalY + 20);
    
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .text(formattedSubtotal, 460, finalY + 20, { align: 'right', width: 70 }); 
    
    // Impuesto (si hay)
    if (parseFloat(factura.impuesto) > 0) {
      doc.fillColor(colorSecundario)
         .font('Helvetica-Bold')
         .text('IVA:', 320, finalY + 45);
      
      doc.fillColor(colorTexto)
         .font('Helvetica')
         .text(formattedImpuesto, 460, finalY + 45, { align: 'right', width: 70 });
    }
    
    // Descuento (si hay)
    if (parseFloat(factura.descuento) > 0) {
      doc.fillColor(colorSecundario)
         .font('Helvetica-Bold')
         .text('DESCUENTO:', 320, finalY + 70);
      
      doc.fillColor(colorTexto)
         .font('Helvetica')
         .text(formattedDescuento, 460, finalY + 70, { align: 'right', width: 70 });
    }
    
    // Total con mayor destaque - Ajustado para evitar problemas de margen
    drawRoundedRect(300, finalY + 95, 245, 30, 5, colorPrimario);
    
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('TOTAL:', 320, finalY + 103);
    
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(formattedTotal, 400, finalY + 103, { align: 'right', width: 70 });
    
    finalY += 150; // Espacio después de los totales
    
    // Observaciones (si hay)
    if (factura.observaciones) {
      doc.fillColor(colorPrimario)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('OBSERVACIONES:', 50, finalY);
      
      doc.fillColor(colorTexto)
         .font('Helvetica')
         .fontSize(10)
         .text(factura.observaciones, 50, finalY + 20, { width: 495 });
      
      // Ajustar finalY según el contenido de las observaciones
      const textHeight = doc.heightOfString(factura.observaciones, { width: 495 });
      finalY += textHeight + 40; // 20 por el texto inicial + espacio adicional
    }
    
    // Determinar si hay suficiente espacio para el pie de página
    const footerHeight = 80; // Altura estimada del pie de página
    
    // Si no hay suficiente espacio para el pie de página, añadir nueva página
    if (finalY + footerHeight > 700) {
      doc.addPage();
      finalY = 50; // Resetear la posición Y al inicio de la nueva página
    }
    
    // Pie de página con información de contacto y agradecimiento
    const piePaginaY = finalY + 20; // Posición dinámica para el pie de página
    
    // Línea separadora
    doc.lineWidth(1)
       .moveTo(50, piePaginaY)
       .lineTo(545, piePaginaY)
       .stroke(colorSecundario);
    
    doc.fillColor(colorPrimario)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('¡GRACIAS POR SU COMPRA!', 297.5, piePaginaY + 15, { align: 'center' });
    
    doc.fillColor(colorTexto)
       .font('Helvetica')
       .fontSize(10)
       .text('Para cualquier consulta, comuníquese con nuestro equipo de atención al cliente.', 297.5, piePaginaY + 35, { align: 'center' });
    
    doc.fillColor(colorSecundario)
       .text('info@unika.com | Tel: 3103904286 | www.unika.com', 297.5, piePaginaY + 50, { align: 'center' });
    
    // Finalizar documento
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar el PDF de la factura', error: error.message });
  }
};

// Ruta para descargar el PDF generado
exports.descargarPDF = async (req, res) => {
  try {
    const { numero } = req.params;
    const filePath = path.join(__dirname, '..', '..', 'temp', `factura_${numero}.pdf`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'El archivo PDF no existe' });
    }
    
    res.download(filePath, `factura_${numero}.pdf`, (err) => {
      if (err) {
        console.error('Error al descargar factura:', err);
        return res.status(500).send('Error al descargar el archivo');
      }
    });
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    res.status(500).json({ message: 'Error al procesar la descarga', error: error.message });
  }
};

// Obtener resumen de ventas del día
exports.getVentasDiarias = async (req, res) => {
  try {
    // Obtener la fecha actual
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
    
    // Consultar ventas pagadas del día
    const ventasDiarias = await Factura.findAll({
      where: {
        fecha: {
          [Op.between]: [inicioDia, finDia]
        },
        estado: 'pagada'
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total']
      ],
      raw: true
    });
    
    // Preparar respuesta
    const cantidad = parseInt(ventasDiarias[0].cantidad, 10) || 0;
    const total = parseFloat(ventasDiarias[0].total) || 0;
    
    res.json({
      success: true,
      data: {
        cantidad,
        total: total.toFixed(2),
        fecha: hoy.toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las ventas diarias', 
      error: error.message 
    });
  }
};

// Procesar devolución de productos
exports.procesarDevolucion = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { productos, motivo } = req.body;
    
    if (!productos || productos.length === 0 || !motivo) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Debe especificar los productos a devolver y el motivo' });
    }
    
    // Verificar que el usuario está autenticado
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    
    // Obtener la factura original
    const factura = await Factura.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { 
          model: DetalleFactura, 
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto' }
          ]
        }
      ],
      transaction
    });
    
    if (!factura) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    if (factura.estado === 'anulada') {
      await transaction.rollback();
      return res.status(400).json({ message: 'No se pueden procesar devoluciones para facturas anuladas' });
    }
    
    // Validar productos a devolver
    for (const item of productos) {
      const detalle = factura.detalles.find(d => d.producto_codigo === item.producto_codigo);
      
      if (!detalle) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `El producto con código ${item.producto_codigo} no está en la factura original` 
        });
      }
      
      if (item.cantidad <= 0 || item.cantidad > detalle.cantidad) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Cantidad inválida para el producto ${detalle.producto.nombre}. Disponible: ${detalle.cantidad}, Solicitado: ${item.cantidad}` 
        });
      }
    }
    
    // Calcular totales para la nota de crédito
    let subtotalDevolucion = 0;
    let impuestoDevolucion = 0;
    let descuentoDevolucion = 0;
    
    for (const item of productos) {
      const detalle = factura.detalles.find(d => d.producto_codigo === item.producto_codigo);
      const precioUnitario = detalle.precio_unitario;
      const cantidadDevuelta = item.cantidad;
      const porcentajeImpuesto = detalle.impuesto || 0;
      const porcentajeDescuento = detalle.descuento || 0;
      
      const itemSubtotal = precioUnitario * cantidadDevuelta;
      const itemImpuesto = itemSubtotal * porcentajeImpuesto / 100;
      const itemDescuento = itemSubtotal * porcentajeDescuento / 100;
      
      subtotalDevolucion += itemSubtotal;
      impuestoDevolucion += itemImpuesto;
      descuentoDevolucion += itemDescuento;
    }
    
    const totalDevolucion = subtotalDevolucion + impuestoDevolucion - descuentoDevolucion;
    
    // Generar número para la nota de crédito (NC)
    const fechaHoy = new Date();
    const año = fechaHoy.getFullYear().toString().substr(-2);
    const mes = (fechaHoy.getMonth() + 1).toString().padStart(2, '0');
    
    // Contar notas de crédito existentes y generar el próximo número
    const notasCredito = await Factura.count({
      where: {
        numero: {
          [Op.like]: `NC${año}${mes}%`
        }
      },
      transaction
    });
    
    const secuencia = (notasCredito + 1).toString().padStart(3, '0');
    const numeroNC = `NC${año}${mes}${secuencia}`;
    
    // Crear nota de crédito (es una factura de tipo "devolución")
    const notaCredito = await Factura.create({
      numero: numeroNC,
      cliente_id: factura.cliente_id,
      usuario_id: userId,
      fecha: fechaHoy,
      subtotal: subtotalDevolucion,
      impuesto: impuestoDevolucion,
      descuento: descuentoDevolucion,
      total: totalDevolucion,
      estado: 'pagada',
      metodo_pago: 'devolucion',
      tipo_documento: 'nota_credito',
      observaciones: `Devolución de productos de factura ${factura.numero}. Motivo: ${motivo}`,
      factura_relacionada_id: factura.id
    }, { transaction });
    
    // Crear detalles y actualizar inventario
    for (const item of productos) {
      const detalle = factura.detalles.find(d => d.producto_codigo === item.producto_codigo);
      
      // Crear detalle de nota de crédito
      await DetalleFactura.create({
        factura_id: notaCredito.id,
        producto_codigo: item.producto_codigo,
        cantidad: item.cantidad,
        precio_unitario: detalle.precio_unitario,
        impuesto: detalle.impuesto || 0,
        descuento: detalle.descuento || 0,
        subtotal: detalle.precio_unitario * item.cantidad
      }, { transaction });
      
      // Actualizar stock del producto
      const producto = await Producto.findByPk(item.producto_codigo, { transaction });
      const stockAnterior = producto.cantidad;
      const stockNuevo = stockAnterior + item.cantidad;
      
      await producto.update({ cantidad: stockNuevo }, { transaction });
      
      // Registrar movimiento de inventario
      await MovimientoInventario.create({
        producto_codigo: item.producto_codigo,
        tipo_movimiento: 'entrada',
        cantidad: item.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: `Devolución de venta. Nota de crédito ${numeroNC}`,
        usuario_id: userId,
        documento_referencia: numeroNC,
        precio_unitario: detalle.precio_unitario
      }, { transaction });
    }
    
    // Actualizar observaciones de la factura original
    await factura.update({
      observaciones: factura.observaciones 
        ? `${factura.observaciones}\nDevolución parcial realizada el ${fechaHoy.toLocaleDateString()}. Nota de crédito: ${numeroNC}`
        : `Devolución parcial realizada el ${fechaHoy.toLocaleDateString()}. Nota de crédito: ${numeroNC}`
    }, { transaction });
    
    await transaction.commit();
    
    res.json({
      message: 'Devolución procesada con éxito',
      factura_id: notaCredito.id,
      nota_credito: numeroNC,
      total_devuelto: totalDevolucion
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al procesar devolución:', error);
    res.status(500).json({ message: 'Error al procesar la devolución', error: error.message });
  }
};