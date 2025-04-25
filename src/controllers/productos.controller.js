// Controlador para la gestión de productos
const Producto = require('../models/producto.model');
const Categoria = require('../models/categoria.model');
const { Op } = require('sequelize');
const { sequelize } = require('../utils/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Excel = require('exceljs');
const csv = require('fast-csv');

// Importar modelos con asociaciones ya establecidas
const models = require('../models');
const HistorialPrecios = models.HistorialPrecios;
const Usuario = models.Usuario;
const CodigoBarras = models.CodigoBarras;

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
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  }
}).single('imagen');

// Obtener todos los productos
exports.getAllProductos = async (req, res) => {
  try {
    const { buscar, categoria, activo, bajoStock } = req.query;
    
    // Construir condiciones de búsqueda
    let where = {};
    
    // Filtrar por búsqueda
    if (buscar) {
      where = {
        [Op.or]: [
          { nombre: { [Op.like]: `%${buscar}%` } },
          { codigo: { [Op.like]: `%${buscar}%` } },
          { descripcion: { [Op.like]: `%${buscar}%` } }
        ]
      };
    }
    
    // Filtrar por categoría
    if (categoria) {
      where.categoria_id = categoria;
    }
    
    // Filtrar por activo/inactivo
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    // Filtrar productos con bajo stock
    if (bajoStock === 'true') {
      where.cantidad = {
        [Op.lte]: sequelize.col('stock_minimo')
      };
    }
    
    // Obtener productos con su categoría
    const productos = await Producto.findAll({
      where,
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['nombre', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de productos',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener un producto por ID
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ]
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
      message: 'Error al obtener información del producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      // Verificar si req.body existe
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: 'No se recibieron datos en el cuerpo de la solicitud'
        });
      }

      const { 
        codigo, 
        nombre, 
        descripcion, 
        precio_compra, 
        precio_venta,
        stock, 
        stock_minimo, 
        categoria_id,
        unidad_medida,
        lote,
        motivo,
        codigos_barras
      } = req.body;

      // Validaciones básicas
      if (!codigo || !nombre || !categoria_id) {
        return res.status(400).json({
          success: false,
          message: 'Código, nombre y categoría son obligatorios'
        });
      }

      // Verificar si ya existe un producto con el mismo código
      const productoExistente = await Producto.findOne({ where: { codigo } });
      if (productoExistente) {
        // Si hay una imagen cargada, eliminarla
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con ese código'
        });
      }

      // Verificar si la categoría existe
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        // Si hay una imagen cargada, eliminarla
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'La categoría seleccionada no existe'
        });
      }

      // Convertir valores numéricos correctamente
      const precioCompraNumerico = parseFloat(precio_compra) || 0;
      const precioVentaNumerico = parseFloat(precio_venta) || 0;
      const stockNumerico = parseInt(stock) || 0;
      const stockMinimoNumerico = parseInt(stock_minimo) || 5;

      // Crear el producto
      const nuevoProducto = await Producto.create({
        codigo,
        nombre,
        descripcion,
        precio_compra: precioCompraNumerico,
        precio: precioVentaNumerico,
        lote: lote || codigo,
        cantidad: stockNumerico,
        stock_minimo: stockMinimoNumerico,
        categoria_id,
        imagen_url: req.file ? `/uploads/productos/${req.file.filename}` : null,
        unidad_medida: unidad_medida || 'unidad',
        activo: true
      });

      // Registrar historial de precio de compra
      await HistorialPrecios.create({
        producto_codigo: nuevoProducto.codigo,
        precio_anterior: 0,
        precio_nuevo: precioCompraNumerico,
        tipo_precio: 'compra',
        usuario_id: req.user ? req.user.id : 1, // Usa el ID del usuario de la sesión o un ID por defecto
        motivo: motivo || 'Creación inicial del producto'
      });
      
      // Registrar historial de precio de venta
      await HistorialPrecios.create({
        producto_codigo: nuevoProducto.codigo,
        precio_anterior: 0,
        precio_nuevo: precioVentaNumerico,
        tipo_precio: 'venta',
        usuario_id: req.user ? req.user.id : 1, // Usa el ID del usuario de la sesión o un ID por defecto
        motivo: motivo || 'Creación inicial del producto'
      });

      // Procesar códigos de barras si existen
      let codigosBarrasData = [];
      if (codigos_barras) {
        try {
          let dataBarras;
          if (typeof codigos_barras === 'string') {
            dataBarras = JSON.parse(codigos_barras);
          } else {
            dataBarras = codigos_barras;
          }
          
          // Procesar nuevos códigos de barras
          if (dataBarras.nuevos && dataBarras.nuevos.length > 0) {
            for (const codigo of dataBarras.nuevos) {
              // Verificar si el código ya existe para otro producto
              const codigoExistente = await CodigoBarras.findOne({
                where: { codigo: codigo.codigo }
              });
              
              if (codigoExistente) {
                continue; // Saltar este código si ya existe
              }
              
              // Si se establece como principal, desmarcar cualquier otro
              if (codigo.principal) {
                await CodigoBarras.update(
                  { principal: false },
                  { where: { producto_codigo: nuevoProducto.codigo, principal: true } }
                );
              }
              
              // Crear el nuevo código de barras
              const nuevoCodigo = await CodigoBarras.create({
                codigo: codigo.codigo,
                tipo: codigo.tipo || 'EAN13',
                principal: codigo.principal || false,
                producto_codigo: nuevoProducto.codigo
              });
              
              codigosBarrasData.push(nuevoCodigo);
            }
          }
          
          // Si no se agregó ningún código de barras, crear uno automáticamente con el código del producto
          if (codigosBarrasData.length === 0) {
            const nuevoCodigo = await CodigoBarras.create({
              codigo: nuevoProducto.codigo,
              tipo: 'SKU',
              principal: true,
              producto_codigo: nuevoProducto.codigo
            });
            
            codigosBarrasData.push(nuevoCodigo);
          }
        } catch (error) {
          console.error('Error al procesar códigos de barras:', error);
          // No fallamos la operación principal si hay error en códigos de barras
        }
      }

      // Obtener el producto recién creado con los datos de la categoría
      const productoConCategoria = await Producto.findByPk(nuevoProducto.codigo, {
        include: [
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
        ]
      });

      // Añadir campo precio_venta para devolver al frontend
      productoConCategoria.dataValues.precio_venta = productoConCategoria.precio;
      productoConCategoria.dataValues.codigos_barras = codigosBarrasData;

      return res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: productoConCategoria
      });
    } catch (error) {
      // Si hay un error y se subió una imagen, eliminarla
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      console.error('Error al crear producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el producto',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  });
};

// Actualizar un producto
exports.updateProducto = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { id } = req.params;
      const { 
        codigo, 
        nombre, 
        descripcion, 
        precio_compra, 
        precio_venta,
        stock_minimo, 
        categoria_id,
        unidad_medida,
        activo,
        lote,
        motivo,
        codigos_barras
      } = req.body;

      // Verificar si el producto existe
      const producto = await Producto.findByPk(id);
      if (!producto) {
        // Si hay una imagen cargada, eliminarla
        if (req.file) {
          await fs.unlink(req.file.path);
        }
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar si ya existe otro producto con el mismo código
      if (codigo && codigo !== producto.codigo) {
        const productoExistente = await Producto.findOne({ where: { codigo } });
        if (productoExistente) {
          // Si hay una imagen cargada, eliminarla
          if (req.file) {
            await fs.unlink(req.file.path);
          }
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro producto con ese código'
          });
        }
      }

      // Verificar si la categoría existe
      if (categoria_id) {
        const categoria = await Categoria.findByPk(categoria_id);
        if (!categoria) {
          // Si hay una imagen cargada, eliminarla
          if (req.file) {
            await fs.unlink(req.file.path);
          }
          return res.status(400).json({
            success: false,
            message: 'La categoría seleccionada no existe'
          });
        }
      }

      // Convertir valores numéricos correctamente asegurándose que son números
      const precioCompra = precio_compra !== undefined ? parseFloat(precio_compra) : producto.precio_compra;
      const precioVenta = precio_venta !== undefined ? parseFloat(precio_venta) : producto.precio;
      const stockMinimo = stock_minimo !== undefined ? parseInt(stock_minimo) : producto.stock_minimo;

      // Guardar los precios originales para comparar después
      const precioCompraOriginal = parseFloat(producto.precio_compra);
      const precioVentaOriginal = parseFloat(producto.precio);

      console.log('Precio compra original:', precioCompraOriginal, 'Nuevo precio compra:', precioCompra);
      console.log('Precio venta original:', precioVentaOriginal, 'Nuevo precio venta:', precioVenta);

      // Si hay una nueva imagen, eliminar la anterior
      if (req.file && producto.imagen_url) {
        const oldImagePath = path.join('public', producto.imagen_url);
        try {
          await fs.access(oldImagePath);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.error('Error al eliminar imagen antigua:', error);
        }
      }

      // Actualizar el producto
      const updateData = {
        codigo: codigo || producto.codigo,
        nombre: nombre || producto.nombre,
        descripcion: descripcion !== undefined ? descripcion : producto.descripcion,
        precio_compra: precioCompra,
        precio: precioVenta,
        stock_minimo: stockMinimo,
        categoria_id: categoria_id || producto.categoria_id,
        unidad_medida: unidad_medida || producto.unidad_medida,
        imagen_url: req.file ? `/uploads/productos/${req.file.filename}` : producto.imagen_url,
        activo: activo !== undefined ? activo : producto.activo,
        lote: lote || producto.lote || producto.codigo
      };

      await producto.update(updateData);

      // Función para comparar precios con tolerancia para evitar problemas de punto flotante
      const preciosDiferentes = (precio1, precio2) => {
        return Math.abs(precio1 - precio2) > 0.001;
      };

      // Registrar el historial de precios si los precios han cambiado
      if (precio_compra !== undefined || precio_venta !== undefined) {
        // Registrar historial para precio de compra si cambió
        if (precio_compra !== undefined && preciosDiferentes(precioCompra, precioCompraOriginal)) {
          console.log('Registrando cambio en precio de compra');
          await HistorialPrecios.create({
            producto_codigo: producto.codigo,
            precio_anterior: precioCompraOriginal,
            precio_nuevo: precioCompra,
            tipo_precio: 'compra',
            usuario_id: req.user ? req.user.id : 1, // Usa el ID del usuario de la sesión o un ID por defecto
            motivo: motivo || 'Actualización de precio de compra'
          });
        }
        
        // Registrar historial para precio de venta si cambió
        if (precio_venta !== undefined && preciosDiferentes(precioVenta, precioVentaOriginal)) {
          console.log('Registrando cambio en precio de venta');
          await HistorialPrecios.create({
            producto_codigo: producto.codigo,
            precio_anterior: precioVentaOriginal,
            precio_nuevo: precioVenta,
            tipo_precio: 'venta',
            usuario_id: req.user ? req.user.id : 1, // Usa el ID del usuario de la sesión o un ID por defecto
            motivo: motivo || 'Actualización de precio de venta'
          });
        }
      }

      // Procesar códigos de barras si existen
      if (codigos_barras) {
        try {
          let dataBarras;
          if (typeof codigos_barras === 'string') {
            dataBarras = JSON.parse(codigos_barras);
          } else {
            dataBarras = codigos_barras;
          }
          
          // Procesar nuevos códigos de barras
          if (dataBarras.nuevos && dataBarras.nuevos.length > 0) {
            for (const codigo of dataBarras.nuevos) {
              // Verificar si el código ya existe para este u otro producto
              const codigoExistente = await CodigoBarras.findOne({
                where: { codigo: codigo.codigo }
              });
              
              if (codigoExistente) {
                continue; // Saltar este código si ya existe
              }
              
              // Si se establece como principal, desmarcar cualquier otro
              if (codigo.principal) {
                await CodigoBarras.update(
                  { principal: false },
                  { where: { producto_codigo: producto.codigo, principal: true } }
                );
              }
              
              // Crear el nuevo código de barras
              await CodigoBarras.create({
                codigo: codigo.codigo,
                tipo: codigo.tipo || 'EAN13',
                principal: codigo.principal || false,
                producto_codigo: producto.codigo
              });
            }
          }
          
          // Procesar códigos modificados
          if (dataBarras.modificados && dataBarras.modificados.length > 0) {
            for (const codigo of dataBarras.modificados) {
              // Si se establece como principal, desmarcar cualquier otro
              if (codigo.principal) {
                await CodigoBarras.update(
                  { principal: false },
                  { where: { 
                    producto_codigo: producto.codigo, 
                    principal: true,
                    id: { [Op.ne]: codigo.id }
                  } }
                );
              }
              
              // Actualizar el código de barras
              await CodigoBarras.update({
                tipo: codigo.tipo,
                principal: codigo.principal
              }, {
                where: { id: codigo.id }
              });
            }
          }
          
          // Procesar códigos eliminados
          if (dataBarras.eliminados && dataBarras.eliminados.length > 0) {
            await CodigoBarras.destroy({
              where: { 
                id: { [Op.in]: dataBarras.eliminados },
                producto_codigo: producto.codigo
              }
            });
          }
        } catch (error) {
          console.error('Error al procesar códigos de barras:', error);
          // No fallamos la operación principal si hay error en códigos de barras
        }
      }

      // Obtener el producto actualizado con los datos de la categoría
      const productoActualizado = await Producto.findByPk(id, {
        include: [
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
        ]
      });

      // Añadir campo precio_venta para devolver al frontend
      productoActualizado.dataValues.precio_venta = productoActualizado.precio;

      return res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: productoActualizado
      });
    } catch (error) {
      // Si hay un error y se subió una imagen, eliminarla
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      console.error('Error al actualizar producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el producto',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  });
};

// Eliminar un producto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar si es posible eliminar el producto
    // En este caso, simplemente permitiremos eliminar cualquier producto
    // En un sistema real, podría haber restricciones adicionales
    
    // Eliminar el producto
    await producto.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar el stock de un producto
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    
    if (cantidad === undefined) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad es requerida'
      });
    }
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Actualizar el stock
    const cantidadAnterior = producto.cantidad;
    const cantidadNueva = cantidadAnterior + parseInt(cantidad);
    
    if (cantidadNueva < 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad no puede ser negativa'
      });
    }
    
    await producto.update({ cantidad: cantidadNueva });
    
    return res.status(200).json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: {
        producto_id: producto.id,
        nombre: producto.nombre,
        stock_anterior: cantidadAnterior,
        cantidad_modificada: parseInt(cantidad),
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
    // Obtener productos donde la cantidad es menor o igual que el stock mínimo
    const productos = await Producto.findAll({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.col('cantidad'),
            '<=',
            sequelize.col('stock_minimo')
          ),
          { activo: true }
        ]
      },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['cantidad', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos con bajo stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de productos con bajo stock',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar el estado de un producto (activar/desactivar)
exports.updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    if (activo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'El estado (activo) es requerido'
      });
    }
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Si estamos desactivando el producto, asegurarnos de que su cantidad sea 0
    if (!activo && producto.cantidad > 0) {
      await producto.update({ 
        activo: false,
        cantidad: 0
      });
    } else {
      await producto.update({ activo });
    }
    
    return res.status(200).json({
      success: true,
      message: `Producto ${activo ? 'activado' : 'desactivado'} exitosamente`,
      data: producto
    });
  } catch (error) {
    console.error('Error al actualizar estado del producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener el historial de precios de un producto
exports.getHistorialPrecios = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Obtener el historial de precios
    const historial = await HistorialPrecios.findAll({
      where: { producto_codigo: id },
      order: [['fecha_creacion', 'DESC']],
      include: [
        { 
          model: Usuario, 
          as: 'usuario', 
          attributes: ['id', 'username', 'nombre_completo'] 
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: historial
    });
  } catch (error) {
    console.error('Error al obtener historial de precios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de precios',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener códigos de barra de un producto
exports.getCodigosBarras = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Obtener los códigos de barras
    const codigos = await CodigoBarras.findAll({
      where: { producto_codigo: id },
      order: [['principal', 'DESC'], ['fecha_creacion', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: codigos
    });
  } catch (error) {
    console.error('Error al obtener códigos de barras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los códigos de barras',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Registrar código de barras para un producto
exports.registrarCodigoBarras = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, tipo = 'EAN13', principal = false } = req.body;
    
    // Validar datos de entrada
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'El código de barras es requerido'
      });
    }
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar si este código ya existe para otro producto
    const codigoExistente = await CodigoBarras.findOne({
      where: { codigo }
    });
    
    if (codigoExistente && codigoExistente.producto_codigo !== id) {
      return res.status(400).json({
        success: false,
        message: 'Este código de barras ya está registrado para otro producto'
      });
    }
    
    // Si queremos establecer este código como principal, primero desmarcar cualquier otro código principal
    if (principal) {
      await CodigoBarras.update(
        { principal: false },
        { where: { producto_codigo: id, principal: true } }
      );
    }
    
    // Crear o actualizar el código de barras
    const [codigoBarras, created] = await CodigoBarras.findOrCreate({
      where: { codigo },
      defaults: {
        producto_codigo: id,
        tipo,
        principal
      }
    });
    
    if (!created) {
      // Si ya existía para este mismo producto, actualizarlo
      await codigoBarras.update({
        tipo,
        principal
      });
    }
    
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Código de barras registrado exitosamente' : 'Código de barras actualizado exitosamente',
      data: codigoBarras
    });
  } catch (error) {
    console.error('Error al registrar código de barras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar el código de barras',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar código de barras
exports.eliminarCodigoBarras = async (req, res) => {
  try {
    const { id, codigoId } = req.params;
    
    // Verificar si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Buscar el código de barras
    const codigoBarras = await CodigoBarras.findByPk(codigoId);
    
    if (!codigoBarras) {
      return res.status(404).json({
        success: false,
        message: 'Código de barras no encontrado'
      });
    }
    
    // Verificar que el código pertenezca al producto
    if (codigoBarras.producto_codigo !== id) {
      return res.status(403).json({
        success: false,
        message: 'El código de barras no pertenece a este producto'
      });
    }
    
    // Eliminar el código de barras
    await codigoBarras.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Código de barras eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar código de barras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el código de barras',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Buscar producto por código de barras
exports.buscarPorCodigoBarras = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Buscar el código de barras
    const codigoBarras = await CodigoBarras.findOne({
      where: { codigo }
    });
    
    if (!codigoBarras) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún producto con este código de barras'
      });
    }
    
    // Obtener el producto asociado
    const producto = await Producto.findByPk(codigoBarras.producto_codigo, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ]
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Añadir campo precio_venta para devolver al frontend
    producto.dataValues.precio_venta = producto.precio;
    
    return res.status(200).json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('Error al buscar producto por código de barras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al buscar el producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Duplicar un producto existente
exports.duplicarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_codigo, nuevo_nombre } = req.body;
    
    // Validaciones básicas
    if (!nuevo_codigo || !nuevo_nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nuevo código y nombre son obligatorios'
      });
    }
    
    // Verificar si el producto origen existe
    const productoOrigen = await Producto.findByPk(id);
    if (!productoOrigen) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar que el nuevo código no exista
    const productoExistente = await Producto.findOne({ where: { codigo: nuevo_codigo } });
    if (productoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese código'
      });
    }
    
    // Crear el nuevo producto copiando los datos del original
    const nuevoProducto = await Producto.create({
      codigo: nuevo_codigo,
      nombre: nuevo_nombre,
      descripcion: productoOrigen.descripcion,
      precio_compra: productoOrigen.precio_compra,
      precio: productoOrigen.precio,
      stock_minimo: productoOrigen.stock_minimo,
      categoria_id: productoOrigen.categoria_id,
      unidad_medida: productoOrigen.unidad_medida,
      imagen_url: null, // No copiar la imagen
      activo: true,
      cantidad: 0 // Iniciar con stock en 0
    });
    
    // Obtener el producto recién creado con los datos de la categoría
    const productoCompleto = await Producto.findByPk(nuevoProducto.codigo, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ]
    });
    
    // Añadir campo precio_venta para devolver al frontend
    productoCompleto.dataValues.precio_venta = productoCompleto.precio;
    
    return res.status(201).json({
      success: true,
      message: 'Producto duplicado exitosamente',
      data: productoCompleto
    });
  } catch (error) {
    console.error('Error al duplicar producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al duplicar el producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Descargar plantilla para productos
exports.descargarPlantilla = async (req, res) => {
  try {
    const { format } = req.query;
    
    if (format !== 'csv' && format !== 'excel') {
      return res.status(400).json({
        success: false,
        message: 'Formato no válido. Use "csv" o "excel"'
      });
    }

    // Campos comunes para ambos formatos
    const campos = [
      'codigo', 'nombre', 'descripcion', 'precio_compra', 'precio_venta', 
      'stock_inicial', 'stock_minimo', 'categoria_id', 'unidad_medida'
    ];

    // Datos de ejemplo para la plantilla con formato de moneda colombiana
    const ejemplos = [
      { 
        codigo: 'PROD001', 
        nombre: 'Producto Ejemplo 1', 
        descripcion: 'Descripción del producto ejemplo 1',
        precio_compra: 100000.00,  // 100.000 COP
        precio_venta: 150000.00,   // 150.000 COP
        stock_inicial: 10,
        stock_minimo: 5,
        categoria_id: 1,
        unidad_medida: 'unidad'
      },
      { 
        codigo: 'PROD002', 
        nombre: 'Producto Ejemplo 2', 
        descripcion: 'Descripción del producto ejemplo 2',
        precio_compra: 200000.00,  // 200.000 COP
        precio_venta: 300000.00,   // 300.000 COP
        stock_inicial: 20,
        stock_minimo: 8,
        categoria_id: 2,
        unidad_medida: 'kg'
      }
    ];

    // Obtener todas las categorías disponibles
    const categorias = await Categoria.findAll({
      order: [['nombre', 'ASC']]
    });

    // Función para formatear valores como moneda colombiana
    const formatearMonedaCOP = (valor) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(valor);
    };

    // Generar plantilla según el formato solicitado
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.csv"');
      
      // Generar encabezado CSV
      let csvContent = campos.join(',') + '\n';
      
      // Agregar filas de ejemplo
      ejemplos.forEach(producto => {
        // Crear una copia del producto para formatear los precios solo en la salida CSV
        const productoFormateado = { ...producto };
        // Formatear los precios como moneda colombiana para CSV
        productoFormateado.precio_compra = formatearMonedaCOP(producto.precio_compra);
        productoFormateado.precio_venta = formatearMonedaCOP(producto.precio_venta);
        
        csvContent += campos.map(campo => {
          const valor = productoFormateado[campo];
          // Escapar campos con comas, comillas o saltos de línea
          if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"') || valor.includes('\n'))) {
            return `"${valor.replace(/"/g, '""')}"`;
          }
          return valor;
        }).join(',') + '\n';
      });
      
      // Agregar una sección de ayuda con las categorías disponibles
      csvContent += '\n\n# Categorías disponibles:\n';
      csvContent += 'id,nombre\n';
      
      categorias.forEach(categoria => {
        csvContent += `${categoria.id},${categoria.nombre}\n`;
      });
      
      return res.send(csvContent);
    } else {
      // Formato Excel
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Productos');
      
      // Agregar encabezados
      worksheet.columns = campos.map(campo => ({
        header: campo,
        key: campo,
        width: 15
      }));
      
      // Agregar filas de ejemplo (los datos originales sin formato)
      worksheet.addRows(ejemplos);
      
      // Aplicar formato de moneda colombiana a las celdas de precios
      worksheet.getRows(2, ejemplos.length).forEach(row => {
        // Aplicar formato a precio_compra (columna E - índice 4)
        row.getCell(5).numFmt = '"$"#,##0;[Red]-"$"#,##0';
        
        // Aplicar formato a precio_venta (columna F - índice 5)
        row.getCell(6).numFmt = '"$"#,##0;[Red]-"$"#,##0';
      });
      
      // Agregar una segunda hoja con las categorías disponibles
      const categoriasSheet = workbook.addWorksheet('Categorías');
      
      // Configurar encabezados para la hoja de categorías
      categoriasSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Nombre', key: 'nombre', width: 30 }
      ];
      
      // Agregar datos de categorías
      categoriasSheet.addRows(categorias.map(cat => ({ 
        id: cat.id, 
        nombre: cat.nombre 
      })));
      
      // Dar formato a la tabla de categorías
      categoriasSheet.getRow(1).font = { bold: true };
      categoriasSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      
      // Agregar una nota de ayuda en la hoja de productos
      worksheet.getCell('A' + (ejemplos.length + 3)).value = 'Nota: Para ver las categorías disponibles, revise la hoja "Categorías"';
      worksheet.getCell('A' + (ejemplos.length + 3)).font = { bold: true, italic: true };
      worksheet.mergeCells('A' + (ejemplos.length + 3) + ':I' + (ejemplos.length + 3));
      
      // Agregar nota sobre el formato de moneda
      worksheet.getCell('A' + (ejemplos.length + 4)).value = 'Los precios están en formato de moneda colombiana (COP)';
      worksheet.getCell('A' + (ejemplos.length + 4)).font = { italic: true };
      worksheet.mergeCells('A' + (ejemplos.length + 4) + ':I' + (ejemplos.length + 4));
      
      // Establecer encabezados de respuesta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
      
      // Enviar el archivo
      return workbook.xlsx.write(res)
        .then(() => {
          res.end();
        });
    }
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar la plantilla',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Exportar productos a CSV o Excel
exports.exportarProductos = async (req, res) => {
  try {
    const { format, search, categoriaId } = req.query;
    
    if (format !== 'csv' && format !== 'excel') {
      return res.status(400).json({
        success: false,
        message: 'Formato no válido. Use "csv" o "excel"'
      });
    }

    // Construir condiciones de búsqueda
    let where = {};
    
    // Filtrar por búsqueda
    if (search) {
      where = {
        [Op.or]: [
          { nombre: { [Op.like]: `%${search}%` } },
          { codigo: { [Op.like]: `%${search}%` } },
          { descripcion: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    // Filtrar por categoría
    if (categoriaId) {
      where.categoria_id = categoriaId;
    }
    
    // Obtener productos con su categoría
    const productos = await Producto.findAll({
      where,
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['nombre', 'ASC']]
    });
    
    // Preparar datos para exportación
    const productosFormateados = productos.map(producto => ({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria: producto.categoria ? producto.categoria.nombre : 'Sin categoría',
      categoria_id: producto.categoria_id,
      precio_compra: parseFloat(producto.precio_compra || 0).toFixed(2),
      precio_venta: parseFloat(producto.precio || 0).toFixed(2),
      stock: producto.cantidad,
      stock_minimo: producto.stock_minimo,
      unidad_medida: producto.unidad_medida || 'unidad',
      activo: producto.activo ? 'Sí' : 'No'
    }));

    // Campos para exportar
    const campos = [
      'codigo', 'nombre', 'descripcion', 'categoria', 'categoria_id', 
      'precio_compra', 'precio_venta', 'stock', 'stock_minimo', 
      'unidad_medida', 'activo'
    ];

    const fechaActual = new Date().toISOString().split('T')[0];
    
    // Exportar según el formato solicitado
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="productos-${fechaActual}.csv"`);
      
      // Generar encabezado CSV
      let csvContent = campos.join(',') + '\n';
      
      // Agregar filas de datos
      productosFormateados.forEach(producto => {
        csvContent += campos.map(campo => {
          // Manejar celdas que podrían contener comas o saltos de línea
          const valor = producto[campo] != null ? producto[campo].toString() : '';
          if (valor.includes(',') || valor.includes('\n') || valor.includes('"')) {
            return `"${valor.replace(/"/g, '""')}"`;
          }
          return valor;
        }).join(',') + '\n';
      });
      
      return res.send(csvContent);
    } else {
      // Formato Excel
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Productos');
      
      // Agregar encabezados
      worksheet.columns = campos.map(campo => ({
        header: campo,
        key: campo,
        width: 15
      }));
      
      // Agregar filas de datos
      worksheet.addRows(productosFormateados);
      
      // Establecer encabezados de respuesta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="productos-${fechaActual}.xlsx`);
      
      // Enviar el archivo
      return workbook.xlsx.write(res)
        .then(() => {
          res.end();
        });
    }
  } catch (error) {
    console.error('Error al exportar productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al exportar productos',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Importar productos desde CSV o Excel
exports.importarProductos = async (req, res) => {
  try {
    // Configuración de multer para archivos CSV/Excel
    const storage = multer.diskStorage({
      destination: function(req, file, cb) {
        cb(null, 'temp');
      },
      filename: function(req, file, cb) {
        cb(null, `import-${Date.now()}-${file.originalname}`);
      }
    });

    const fileFilter = function(req, file, cb) {
      // Verificar por extensión y tipo MIME
      const filetypes = /csv|xlsx|xls/;
      const mimetypes = /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/vnd.ms-excel|text\/csv|application\/csv/;
      
      // Comprobar la extensión del archivo
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      // Comprobar el tipo MIME del archivo
      const mimetype = mimetypes.test(file.mimetype);
      
      console.log("Extensión:", path.extname(file.originalname).toLowerCase());
      console.log("MIME type:", file.mimetype);
      
      if (mimetype || extname) {
        return cb(null, true);
      }
      cb(new Error('Solo se permiten archivos CSV o Excel (XLSX/XLS)'));
    };

    const upload = multer({ 
      storage: storage,
      fileFilter: fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB
    }).single('file');

    // Procesar la carga del archivo
    upload(req, res, async function(err) {
      if (err) {
        console.error('Error al subir archivo:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha seleccionado ningún archivo'
        });
      }

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      console.log("Archivo recibido:", req.file.originalname);
      console.log("Extensión:", fileExt);
      console.log("MIME type:", req.file.mimetype);
      
      let productos = [];
      
      try {
        // Procesar según el formato
        if (fileExt === '.csv' || req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/csv') {
          // Procesar CSV
          productos = await procesarCSV(filePath);
        } else if (fileExt === '.xlsx' || fileExt === '.xls' || 
                  req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  req.file.mimetype === 'application/vnd.ms-excel') {
          // Procesar Excel
          productos = await procesarExcel(filePath);
        } else {
          await fs.unlink(filePath);
          return res.status(400).json({
            success: false,
            message: 'Formato de archivo no soportado'
          });
        }
        
        // Validar datos
        const errores = validarDatosProductos(productos);
        if (errores.length > 0) {
          // Eliminar archivo temporal
          await fs.unlink(filePath);
          
          // Crear estructura de errores para que el frontend pueda procesarla
          const erroresDetallados = errores.map((error, index) => {
            // Intentar extraer código y número de fila
            const filaMatch = error.match(/Fila (\d+):/);
            const fila = filaMatch ? parseInt(filaMatch[1]) : index + 2;
            
            // Determinar el código del producto (si está disponible)
            let codigo = 'Desconocido';
            if (fila > 1 && productos[fila - 2] && productos[fila - 2].codigo) {
              codigo = productos[fila - 2].codigo;
            }
            
            // Determinar el nombre del producto (si está disponible)
            let nombre = 'Producto sin nombre';
            if (fila > 1 && productos[fila - 2] && productos[fila - 2].nombre) {
              nombre = productos[fila - 2].nombre;
            }
            
            return {
              codigo,
              nombre,
              mensaje: error,
              detalles: "Error de validación en los datos",
              fila: fila
            };
          });
          
          return res.status(400).json({
            success: false,
            message: 'El archivo contiene errores',
            errors: errores,
            detalle: {
              errores: erroresDetallados
            },
            data: {
              procesados: productos.length,
              creados: 0,
              actualizados: 0,
              errores: errores.length
            }
          });
        }
        
        // Importar productos a la base de datos
        const resultado = await importarProductosDB(productos, req.user ? req.user.id : 1);
        
        // Eliminar archivo temporal
        await fs.unlink(filePath);
        
        return res.status(200).json({
          success: true,
          message: 'Productos importados exitosamente',
          data: resultado
        });
      } catch (error) {
        console.error('Error al procesar archivo:', error);
        
        // Asegurarse de eliminar el archivo temporal en caso de error
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error('Error al eliminar archivo temporal:', unlinkError);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error al procesar el archivo: ' + error.message,
          errors: [error.message], // Asegurar que siempre haya un array de errores
          data: {
            procesados: productos.length,
            creados: 0,
            actualizados: 0, 
            errores: productos.length
          }
        });
      }
    });
  } catch (error) {
    console.error('Error al importar productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al importar productos',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      errors: [error.message], // Asegurar que siempre haya un array de errores
      data: {
        procesados: 0,
        creados: 0,
        actualizados: 0,
        errores: 1
      }
    });
  }
};

// Funciones auxiliares para importación

// Procesar archivo CSV
async function procesarCSV(filePath) {
  return new Promise((resolve, reject) => {
    const productos = [];
    
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, ignoreEmpty: true }))
      .on('error', error => reject(error))
      .on('data', row => productos.push(row))
      .on('end', () => resolve(productos));
  });
}

// Procesar archivo Excel
async function procesarExcel(filePath) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const productos = [];
  
  // Obtener encabezados
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value;
  });
  
  // Procesar filas de datos
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Ignorar la fila de encabezados
      const producto = {};
      row.eachCell((cell, colNumber) => {
        producto[headers[colNumber - 1]] = cell.value;
      });
      productos.push(producto);
    }
  });
  
  return productos;
}

// Validar datos de productos
function validarDatosProductos(productos) {
  const errores = [];
  
  productos.forEach((producto, index) => {
    const rowNumber = index + 2; // +2 porque la primera fila son encabezados y el índice empieza en 0
    
    // Validar campos requeridos
    if (!producto.codigo) {
      errores.push(`Fila ${rowNumber}: Código de producto requerido`);
    }
    
    if (!producto.nombre) {
      errores.push(`Fila ${rowNumber}: Nombre de producto requerido`);
    }
    
    if (!producto.categoria_id) {
      errores.push(`Fila ${rowNumber}: ID de categoría requerido`);
    }
    
    // Validar que los valores numéricos sean válidos
    if (isNaN(parseFloat(producto.precio_compra))) {
      errores.push(`Fila ${rowNumber}: Precio de compra debe ser un número`);
    }
    
    if (isNaN(parseFloat(producto.precio_venta))) {
      errores.push(`Fila ${rowNumber}: Precio de venta debe ser un número`);
    }
    
    if (isNaN(parseInt(producto.stock_inicial))) {
      errores.push(`Fila ${rowNumber}: Stock inicial debe ser un número`);
    }
    
    if (isNaN(parseInt(producto.stock_minimo))) {
      errores.push(`Fila ${rowNumber}: Stock mínimo debe ser un número`);
    }
  });
  
  return errores;
}

// Importar productos a la base de datos
async function importarProductosDB(productos, usuarioId) {
  const resultado = {
    creados: 0,
    actualizados: 0,
    errores: 0
  };
  
  // Añadir detalle de cada producto procesado
  const detalle = {
    procesados: [],
    creados: [],
    actualizados: [],
    errores: []
  };
  
  for (const producto of productos) {
    try {
      // Registrar el producto en procesados
      detalle.procesados.push({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria_id,
        estado: 'Procesando'
      });
      
      // Verificar si el producto ya existe
      const productoExistente = await Producto.findOne({
        where: { codigo: producto.codigo }
      });
      
      // Verificar si la categoría existe
      const categoria = await Categoria.findByPk(producto.categoria_id);
      if (!categoria) {
        console.error(`Categoría con ID ${producto.categoria_id} no encontrada`);
        resultado.errores++;
        detalle.errores.push({
          codigo: producto.codigo,
          nombre: producto.nombre,
          mensaje: `Error: La categoría con ID ${producto.categoria_id} no existe en el sistema`,
          detalles: "La categoría especificada no está registrada",
          sugerencia: "Verifique el ID de categoría y asegúrese de que exista en el sistema"
        });
        continue;
      }
      
      // Convertir valores numéricos
      const precioCompra = parseFloat(producto.precio_compra) || 0;
      const precioVenta = parseFloat(producto.precio_venta) || 0;
      const stockInicial = parseInt(producto.stock_inicial) || 0;
      const stockMinimo = parseInt(producto.stock_minimo) || 5;
      
      if (productoExistente) {
        // Guardar valores originales para el registro de cambios
        const precioCompraOriginal = parseFloat(productoExistente.precio_compra) || 0;
        const precioVentaOriginal = parseFloat(productoExistente.precio) || 0;
        const stockOriginal = parseInt(productoExistente.cantidad) || 0;
        
        // Determinar qué campos se van a actualizar
        const camposActualizados = [];
        if (producto.nombre && producto.nombre !== productoExistente.nombre) {
          camposActualizados.push('nombre');
        }
        if ((producto.descripcion || '') !== (productoExistente.descripcion || '')) {
          camposActualizados.push('descripción');
        }
        if (Math.abs(precioCompra - precioCompraOriginal) > 0.01) {
          camposActualizados.push('precio_compra');
        }
        if (Math.abs(precioVenta - precioVentaOriginal) > 0.01) {
          camposActualizados.push('precio_venta');
        }
        if (stockMinimo !== productoExistente.stock_minimo) {
          camposActualizados.push('stock_minimo');
        }
        if (parseInt(producto.categoria_id) !== productoExistente.categoria_id) {
          camposActualizados.push('categoria');
        }
        
        // Actualizar producto existente
        await productoExistente.update({
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precio_compra: precioCompra,
          precio: precioVenta,
          stock_minimo: stockMinimo,
          categoria_id: producto.categoria_id,
          unidad_medida: producto.unidad_medida || productoExistente.unidad_medida || 'unidad'
        });
        
        // Registrar historial de precios si cambiaron
        if (Math.abs(precioCompra - precioCompraOriginal) > 0.01) {
          await HistorialPrecios.create({
            producto_codigo: productoExistente.codigo,
            precio_anterior: precioCompraOriginal,
            precio_nuevo: precioCompra,
            tipo_precio: 'compra',
            usuario_id: usuarioId,
            motivo: 'Actualización por importación'
          });
        }
        
        if (Math.abs(precioVenta - precioVentaOriginal) > 0.01) {
          await HistorialPrecios.create({
            producto_codigo: productoExistente.codigo,
            precio_anterior: precioVentaOriginal,
            precio_nuevo: precioVenta,
            tipo_precio: 'venta',
            usuario_id: usuarioId,
            motivo: 'Actualización por importación'
          });
        }
        
        resultado.actualizados++;
        
        // Registrar detalle del producto actualizado
        detalle.actualizados.push({
          codigo: productoExistente.codigo,
          nombre: productoExistente.nombre,
          campos_actualizados: camposActualizados.join(', '),
          precio_anterior: precioVentaOriginal,
          precio_nuevo: precioVenta,
          stock_anterior: stockOriginal,
          stock_nuevo: stockOriginal // No modificamos stock en actualizaciones
        });
        
      } else {
        // Crear nuevo producto
        const nuevoProducto = await Producto.create({
          codigo: producto.codigo,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precio_compra: precioCompra,
          precio: precioVenta,
          cantidad: stockInicial,
          stock_minimo: stockMinimo,
          categoria_id: producto.categoria_id,
          unidad_medida: producto.unidad_medida || 'unidad',
          activo: true
        });
        
        // Registrar historial de precios para el nuevo producto
        await HistorialPrecios.create({
          producto_codigo: nuevoProducto.codigo,
          precio_anterior: 0,
          precio_nuevo: precioCompra,
          tipo_precio: 'compra',
          usuario_id: usuarioId,
          motivo: 'Importación de producto'
        });
        
        await HistorialPrecios.create({
          producto_codigo: nuevoProducto.codigo,
          precio_anterior: 0,
          precio_nuevo: precioVenta,
          tipo_precio: 'venta',
          usuario_id: usuarioId,
          motivo: 'Importación de producto'
        });
        
        resultado.creados++;
        
        // Registrar detalle del producto creado
        detalle.creados.push({
          codigo: nuevoProducto.codigo,
          nombre: nuevoProducto.nombre,
          categoria: categoria.nombre,
          precio: precioVenta,
          stock: stockInicial
        });
      }
      
      // Actualizar el estado en procesados
      const indiceProducto = detalle.procesados.findIndex(p => p.codigo === producto.codigo);
      if (indiceProducto !== -1) {
        detalle.procesados[indiceProducto].estado = productoExistente ? 'Actualizado' : 'Creado';
      }
      
    } catch (error) {
      console.error(`Error al procesar producto ${producto.codigo}:`, error);
      resultado.errores++;
      
      // Registrar error detallado
      detalle.errores.push({
        codigo: producto.codigo || 'Desconocido',
        nombre: producto.nombre || 'Producto sin nombre',
        mensaje: `Error al procesar: ${error.message}`,
        detalles: error.name === 'SequelizeValidationError' ? 
          'Error de validación: Verifique que los datos cumplen con el formato requerido' : 
          'Error interno al procesar el producto',
        tipo_error: error.name
      });
      
      // Actualizar el estado en procesados si existe
      const indiceProducto = detalle.procesados.findIndex(p => p.codigo === producto.codigo);
      if (indiceProducto !== -1) {
        detalle.procesados[indiceProducto].estado = 'Error';
      }
    }
  }
  
  // Adjuntar detalles al resultado
  resultado.detalle = detalle;
  
  return resultado;
}