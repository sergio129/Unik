// Controlador para la gestión de categorías
const Categoria = require('../models/categoria.model');
const Producto = require('../models/producto.model');
const { Op } = require('sequelize');
const { sequelize } = require('../utils/database');
const db = require('../config/db.config'); // Importamos db correctamente para poder usar db.query

// Obtener todas las categorías
exports.getAllCategorias = async (req, res) => {
  try {
    const includeSubcategorias = req.query.hierarchy === 'true';
    
    if (includeSubcategorias) {
      // Obtener categorías en formato jerárquico (con subcategorías anidadas)
      const categoriasRaiz = await Categoria.findAll({
        where: { categoria_padre_id: null },
        include: [
          {
            model: Categoria,
            as: 'subcategorias',
            include: [
              {
                model: Categoria,
                as: 'subcategorias'
              }
            ]
          }
        ],
        order: [
          ['nombre', 'ASC'],
          [{ model: Categoria, as: 'subcategorias' }, 'nombre', 'ASC'],
          [{ model: Categoria, as: 'subcategorias' }, { model: Categoria, as: 'subcategorias' }, 'nombre', 'ASC']
        ]
      });
      
      return res.status(200).json({
        success: true,
        data: categoriasRaiz
      });
    } else {
      // Obtener todas las categorías en formato plano (con información de categoría padre)
      const categorias = await Categoria.findAll({
        include: [
          {
            model: Categoria,
            as: 'categoria_padre',
            attributes: ['id', 'nombre']
          }
        ],
        order: [['nivel', 'ASC'], ['nombre', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        data: categorias
      });
    }
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
    const includeSubcategorias = req.query.subcategorias === 'true';
    
    let options = {
      include: [
        {
          model: Categoria,
          as: 'categoria_padre',
          attributes: ['id', 'nombre']
        }
      ]
    };
    
    if (includeSubcategorias) {
      options.include.push({
        model: Categoria,
        as: 'subcategorias',
        attributes: ['id', 'nombre', 'descripcion', 'activo', 'nivel']
      });
    }
    
    const categoria = await Categoria.findByPk(id, options);
    
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
    const { nombre, descripcion, categoria_padre_id } = req.body;
    
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
    
    // Determinar nivel jerárquico
    let nivel = 1;
    
    if (categoria_padre_id) {
      // Verificar si existe la categoría padre
      const categoriaPadre = await Categoria.findByPk(categoria_padre_id);
      if (!categoriaPadre) {
        return res.status(400).json({
          success: false,
          message: 'La categoría padre especificada no existe'
        });
      }
      
      // El nivel es el nivel del padre + 1
      nivel = categoriaPadre.nivel + 1;
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
        categoria_padre_id: categoria_padre_id || null,
        nivel,
        activo: true
      });
    } else {
      nuevaCategoria = await Categoria.create({
        nombre,
        descripcion,
        categoria_padre_id: categoria_padre_id || null,
        nivel,
        activo: true
      });
    }
    
    return res.status(201).json({
      success: true,
      message: categoria_padre_id ? 'Subcategoría creada exitosamente' : 'Categoría creada exitosamente',
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
    const { nombre, descripcion, activo, categoria_padre_id } = req.body;
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si no se está asignando la categoría a sí misma como padre
    if (categoria_padre_id && parseInt(categoria_padre_id) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Una categoría no puede ser su propia subcategoría'
      });
    }
    
    // Verificar que no se esté asignando como padre una de sus subcategorías (evitar ciclos)
    if (categoria_padre_id) {
      const esSubcategoria = await esParteDeCiclo(id, categoria_padre_id);
      if (esSubcategoria) {
        return res.status(400).json({
          success: false,
          message: 'No se puede asignar como padre a una categoría que ya es subcategoría de esta categoría'
        });
      }
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
    
    // Determinar nuevo nivel jerárquico si cambia el padre
    let nivel = categoria.nivel;
    
    if (categoria_padre_id !== undefined && categoria_padre_id !== categoria.categoria_padre_id) {
      if (categoria_padre_id === null) {
        // Si se convierte en categoría raíz
        nivel = 1;
      } else {
        // Si tiene un nuevo padre
        const nuevoPadre = await Categoria.findByPk(categoria_padre_id);
        if (!nuevoPadre) {
          return res.status(400).json({
            success: false,
            message: 'La categoría padre especificada no existe'
          });
        }
        nivel = nuevoPadre.nivel + 1;
      }
      
      // Actualizar niveles de todas las subcategorías
      await actualizarNivelesSubcategorias(id, nivel);
    }
    
    // Actualizar la categoría
    const categoriaActualizada = await categoria.update({
      nombre: nombre || categoria.nombre,
      descripcion: descripcion !== undefined ? descripcion : categoria.descripcion,
      activo: activo !== undefined ? activo : categoria.activo,
      categoria_padre_id: categoria_padre_id !== undefined ? categoria_padre_id : categoria.categoria_padre_id,
      nivel
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
    
    // Verificar si hay subcategorías
    const subcategoriasCount = await Categoria.count({ 
      where: { categoria_padre_id: id }
    });
    
    if (subcategoriasCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${subcategoriasCount} subcategorías. Debe eliminar las subcategorías primero.`
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

// Obtener productos por categoría (incluye subcategorías)
exports.getProductosByCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const incluirSubcategorias = req.query.incluir_subcategorias === 'true';
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    let categoriasIds = [id];
    
    // Si se solicitan productos de subcategorías, obtener IDs de todas las subcategorías
    if (incluirSubcategorias) {
      const subcategoriasIds = await obtenerSubcategoriasIds(id);
      categoriasIds = [...categoriasIds, ...subcategoriasIds];
    }
    
    // Obtener los productos de esta(s) categoría(s)
    const productos = await Producto.findAll({
      where: { categoria_id: { [Op.in]: categoriasIds } },
      order: [['nombre', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: productos,
      total: productos.length,
      categorias_incluidas: categoriasIds.length
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

// Obtener subcategorías de una categoría
exports.getSubcategorias = async (req, res) => {
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
    
    // Obtener subcategorías directas
    const subcategorias = await Categoria.findAll({
      where: { categoria_padre_id: id },
      order: [['nombre', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: subcategorias,
      count: subcategorias.length
    });
  } catch (error) {
    console.error('Error al obtener subcategorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener subcategorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Mover una categoría y todas sus subcategorías
exports.moveCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_padre_id } = req.body;
    
    // Verificar si la categoría existe
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Si se especifica un nuevo padre, verificar que exista
    let nuevoPadre = null;
    let nuevoNivel = 1; // Valor predeterminado si no hay padre
    
    if (nuevo_padre_id !== null) {
      nuevoPadre = await Categoria.findByPk(nuevo_padre_id);
      if (!nuevoPadre) {
        return res.status(400).json({
          success: false,
          message: 'La categoría padre especificada no existe'
        });
      }
      
      // Verificar que no se esté intentando mover a una de sus propias subcategorías
      const esSubcategoria = await esParteDeCiclo(id, nuevo_padre_id);
      if (esSubcategoria) {
        return res.status(400).json({
          success: false,
          message: 'No se puede mover una categoría a una de sus propias subcategorías'
        });
      }
      
      nuevoNivel = nuevoPadre.nivel + 1;
    }
    
    // Actualizar la categoría
    await categoria.update({
      categoria_padre_id: nuevo_padre_id,
      nivel: nuevoNivel
    });
    
    // Actualizar niveles de todas las subcategorías
    await actualizarNivelesSubcategorias(id, nuevoNivel);
    
    return res.status(200).json({
      success: true,
      message: 'Categoría movida exitosamente',
      data: await Categoria.findByPk(id)
    });
  } catch (error) {
    console.error('Error al mover categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al mover la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Funciones auxiliares
// Función recursiva para verificar si hay ciclos en la jerarquía
async function esParteDeCiclo(categoriaId, posiblePadreId) {
  if (parseInt(categoriaId) === parseInt(posiblePadreId)) {
    return true;
  }
  
  const subcategorias = await Categoria.findAll({
    where: { categoria_padre_id: categoriaId },
    attributes: ['id']
  });
  
  for (const sub of subcategorias) {
    if (await esParteDeCiclo(sub.id, posiblePadreId)) {
      return true;
    }
  }
  
  return false;
}

// Función recursiva para obtener los IDs de todas las subcategorías
async function obtenerSubcategoriasIds(categoriaId) {
  const subcategorias = await Categoria.findAll({
    where: { categoria_padre_id: categoriaId },
    attributes: ['id']
  });
  
  let ids = subcategorias.map(s => s.id);
  
  for (const sub of subcategorias) {
    const subIds = await obtenerSubcategoriasIds(sub.id);
    ids = [...ids, ...subIds];
  }
  
  return ids;
}

// Función recursiva para actualizar los niveles de todas las subcategorías
async function actualizarNivelesSubcategorias(categoriaId, nivelPadre) {
  const subcategorias = await Categoria.findAll({
    where: { categoria_padre_id: categoriaId }
  });
  
  const nuevoNivel = nivelPadre + 1;
  
  for (const sub of subcategorias) {
    await sub.update({ nivel: nuevoNivel });
    await actualizarNivelesSubcategorias(sub.id, nuevoNivel);
  }
}

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

/**
 * Obtiene las categorías con más productos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getCategoriasConMasProductos = async (req, res) => {
  try {
    const limit = req.query.limit || 5; // Por defecto, devolver las 5 principales

    // Usar sequelize para la consulta en lugar de raw query
    const results = await sequelize.query(`
      SELECT 
        c.id, 
        c.nombre, 
        COUNT(p.codigo) AS productos_count 
      FROM 
        categorias c
      LEFT JOIN 
        productos p ON p.categoria_id = c.id
      WHERE 
        c.activo = true
      GROUP BY 
        c.id, c.nombre
      HAVING 
        productos_count > 0
      ORDER BY 
        productos_count DESC
      LIMIT :limit
    `, {
      replacements: { limit: parseInt(limit) },
      type: sequelize.QueryTypes.SELECT
    });
    
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de categorías',
      error: error.message
    });
  }
};

// Contar categorías
exports.countCategorias = async (req, res) => {
  try {
    // Obtener el total de categorías activas
    const count = await Categoria.count({
      where: {
        activo: true
      }
    });
    
    return res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error al contar categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el conteo de categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};