// Controlador para la gestión de categorías
const Categoria = require('../models/categoria.model');
const Producto = require('../models/producto.model');
const { Op } = require('sequelize');
const { sequelize } = require('../utils/database');

// Obtener todas las categorías
exports.getAllCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.findAll({
      order: [['nombre', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener una categoría por ID
exports.getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: categoria
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información de la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear una nueva categoría
exports.createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }
    
    // Verificar si ya existe una categoría con el mismo nombre
    const categoriaExistente = await Categoria.findOne({ where: { nombre } });
    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }
    
    // Buscar el primer ID disponible (hueco en la secuencia)
    const [result] = await sequelize.query(`
      SELECT t1.id + 1 AS next_id
      FROM categorias t1
      LEFT JOIN categorias t2 ON t1.id + 1 = t2.id
      WHERE t2.id IS NULL
      ORDER BY t1.id
      LIMIT 1
    `);

    let nextId = null;
    if (result && result.length > 0) {
      nextId = result[0].next_id;
    }

    // Si no hay huecos, o la tabla está vacía, dejar que autoincrement asigne el ID
    let nuevaCategoria;
    if (nextId) {
      nuevaCategoria = await Categoria.create({
        id: nextId,
        nombre,
        descripcion,
        activo: true
      });
    } else {
      nuevaCategoria = await Categoria.create({
        nombre,
        descripcion,
        activo: true
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: nuevaCategoria
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar una categoría
exports.updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si ya existe otra categoría con el mismo nombre
    if (nombre && nombre !== categoria.nombre) {
      const categoriaExistente = await Categoria.findOne({ where: { nombre } });
      if (categoriaExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con ese nombre'
        });
      }
    }
    
    // Actualizar la categoría
    const categoriaActualizada = await categoria.update({
      nombre: nombre || categoria.nombre,
      descripcion: descripcion !== undefined ? descripcion : categoria.descripcion,
      activo: activo !== undefined ? activo : categoria.activo
    });
    
    return res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: categoriaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar una categoría
exports.deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si hay productos asociados a esta categoría
    const productosAsociados = await Producto.count({ where: { categoria_id: id } });
    if (productosAsociados > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${productosAsociados} productos asociados. Considere desactivarla en su lugar.`
      });
    }
    
    // Eliminar la categoría
    await categoria.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener productos por categoría
exports.getProductosByCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener los productos de esta categoría
    const productos = await Producto.findAll({
      where: { categoria_id: id },
      order: [['nombre', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener productos por categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Activar múltiples categorías
exports.bulkActivate = async (req, res) => {
  try {
    const { ids } = req.body;
    
    // Validar que se proporcionen IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs para activar categorías'
      });
    }

    // Actualizar en bloque todas las categorías seleccionadas
    const [affectedRows] = await Categoria.update(
      { activo: true },
      { where: { id: { [Op.in]: ids } } }
    );
    
    return res.status(200).json({
      success: true,
      message: `${affectedRows} categorías activadas exitosamente`,
      affectedRows
    });
  } catch (error) {
    console.error('Error al activar categorías en bloque:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al activar las categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Desactivar múltiples categorías
exports.bulkDeactivate = async (req, res) => {
  try {
    const { ids } = req.body;
    
    // Validar que se proporcionen IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs para desactivar categorías'
      });
    }

    // Actualizar en bloque todas las categorías seleccionadas
    const [affectedRows] = await Categoria.update(
      { activo: false },
      { where: { id: { [Op.in]: ids } } }
    );
    
    return res.status(200).json({
      success: true,
      message: `${affectedRows} categorías desactivadas exitosamente`,
      affectedRows
    });
  } catch (error) {
    console.error('Error al desactivar categorías en bloque:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al desactivar las categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar múltiples categorías
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    
    // Validar que se proporcionen IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs para eliminar categorías'
      });
    }

    // Verificar productos asociados a estas categorías
    const productosAsociados = await Producto.findAll({
      where: { categoria_id: { [Op.in]: ids } },
      attributes: ['categoria_id'],
      group: ['categoria_id'],
    });

    if (productosAsociados.length > 0) {
      // Hay categorías con productos asociados
      const categoriasConProductos = productosAsociados.map(p => p.categoria_id);
      
      return res.status(400).json({
        success: false,
        message: `No se pueden eliminar algunas categorías porque tienen productos asociados. Considere desactivarlas en su lugar.`,
        categoriasConProductos
      });
    }

    // Eliminar en bloque todas las categorías seleccionadas
    const affectedRows = await Categoria.destroy({
      where: { id: { [Op.in]: ids } }
    });
    
    return res.status(200).json({
      success: true,
      message: `${affectedRows} categorías eliminadas exitosamente`,
      affectedRows
    });
  } catch (error) {
    console.error('Error al eliminar categorías en bloque:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar las categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};