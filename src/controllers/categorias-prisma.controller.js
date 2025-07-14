// Controlador para la gestión de categorías con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Obtener todas las categorías
exports.getAllCategorias = async (req, res) => {
  try {
    const includeSubcategorias = req.query.hierarchy === 'true';
    
    if (includeSubcategorias) {
      // Obtener categorías en formato jerárquico (con subcategorías anidadas)
      const categoriasRaiz = await prisma.categoria.findMany({
        where: { categoria_padre_id: null },
        include: {
          subcategorias: {
            include: {
              subcategorias: true,
              productos: true
            },
            orderBy: { nombre: 'asc' }
          },
          productos: true
        },
        orderBy: { nombre: 'asc' }
      });
      
      return res.status(200).json({
        success: true,
        data: categoriasRaiz
      });
    } else {
      // Obtener todas las categorías en formato plano
      const categorias = await prisma.categoria.findMany({
        include: {
          categoria_padre: {
            select: { id: true, nombre: true }
          },
          productos: true,
          subcategorias: true
        },
        orderBy: { nombre: 'asc' }
      });
      
      // Agregar información adicional
      const categoriasConInfo = categorias.map(categoria => ({
        ...categoria,
        productos_count: categoria.productos.length,
        subcategorias_count: categoria.subcategorias.length,
        nivel: categoria.categoria_padre_id ? 
          (categoria.categoria_padre?.categoria_padre_id ? 3 : 2) : 1
      }));
      
      return res.status(200).json({
        success: true,
        data: categoriasConInfo
      });
    }
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener categoría por ID
exports.getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoria = await prisma.categoria.findUnique({
      where: { id: parseInt(id) },
      include: {
        categoria_padre: {
          select: { id: true, nombre: true }
        },
        subcategorias: {
          include: {
            productos: true
          }
        },
        productos: true
      }
    });
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Agregar información adicional
    const categoriaConInfo = {
      ...categoria,
      productos_count: categoria.productos.length,
      subcategorias_count: categoria.subcategorias.length
    };
    
    return res.status(200).json({
      success: true,
      data: categoriaConInfo
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear nueva categoría
exports.createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, categoria_padre_id, activo = true } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }
    
    // Verificar si ya existe una categoría con el mismo nombre
    const categoriaExistente = await prisma.categoria.findFirst({
      where: { 
        nombre: nombre.trim(),
        categoria_padre_id: categoria_padre_id || null
      }
    });
    
    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre en el mismo nivel'
      });
    }
    
    // Verificar que la categoría padre existe si se especifica
    if (categoria_padre_id) {
      const categoriaPadre = await prisma.categoria.findUnique({
        where: { id: parseInt(categoria_padre_id) }
      });
      
      if (!categoriaPadre) {
        return res.status(400).json({
          success: false,
          message: 'La categoría padre especificada no existe'
        });
      }
    }
    
    // Crear la nueva categoría
    const nuevaCategoria = await prisma.categoria.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        categoria_padre_id: categoria_padre_id ? parseInt(categoria_padre_id) : null,
        activo: Boolean(activo)
      },
      include: {
        categoria_padre: {
          select: { id: true, nombre: true }
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: nuevaCategoria
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar categoría
exports.updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria_padre_id, activo } = req.body;
    
    // Verificar que la categoría existe
    const categoriaExistente = await prisma.categoria.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!categoriaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Validar que no se esté intentando hacer la categoría padre de sí misma
    if (categoria_padre_id && parseInt(categoria_padre_id) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Una categoría no puede ser padre de sí misma'
      });
    }
    
    // Verificar que no hay duplicados en el mismo nivel
    if (nombre && nombre.trim() !== categoriaExistente.nombre) {
      const duplicado = await prisma.categoria.findFirst({
        where: {
          nombre: nombre.trim(),
          categoria_padre_id: categoria_padre_id || null,
          id: { not: parseInt(id) }
        }
      });
      
      if (duplicado) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre en el mismo nivel'
        });
      }
    }
    
    // Actualizar la categoría
    const categoriaActualizada = await prisma.categoria.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre && { nombre: nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(categoria_padre_id !== undefined && { 
          categoria_padre_id: categoria_padre_id ? parseInt(categoria_padre_id) : null 
        }),
        ...(activo !== undefined && { activo: Boolean(activo) })
      },
      include: {
        categoria_padre: {
          select: { id: true, nombre: true }
        },
        productos: true
      }
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
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar categoría
exports.deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la categoría existe
    const categoria = await prisma.categoria.findUnique({
      where: { id: parseInt(id) },
      include: {
        productos: true,
        subcategorias: true
      }
    });
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar que no tiene productos asociados
    if (categoria.productos.length > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${categoria.productos.length} producto(s) asociado(s)`
      });
    }
    
    // Verificar que no tiene subcategorías
    if (categoria.subcategorias.length > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${categoria.subcategorias.length} subcategoría(s)`
      });
    }
    
    // Eliminar la categoría
    await prisma.categoria.delete({
      where: { id: parseInt(id) }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Buscar categorías
exports.searchCategorias = async (req, res) => {
  try {
    const { q, activo, categoria_padre_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereConditions = {};
    
    // Filtro de búsqueda
    if (q) {
      whereConditions.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    // Filtro por estado
    if (activo !== undefined) {
      whereConditions.activo = activo === 'true';
    }
    
    // Filtro por categoría padre
    if (categoria_padre_id) {
      whereConditions.categoria_padre_id = parseInt(categoria_padre_id);
    }
    
    const [categorias, total] = await Promise.all([
      prisma.categoria.findMany({
        where: whereConditions,
        include: {
          categoria_padre: {
            select: { id: true, nombre: true }
          },
          productos: true,
          subcategorias: true
        },
        orderBy: { nombre: 'asc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.categoria.count({ where: whereConditions })
    ]);
    
    // Agregar información adicional
    const categoriasConInfo = categorias.map(categoria => ({
      ...categoria,
      productos_count: categoria.productos.length,
      subcategorias_count: categoria.subcategorias.length
    }));
    
    return res.status(200).json({
      success: true,
      data: categoriasConInfo,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al buscar categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener productos de una categoría
exports.getProductosCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Verificar que la categoría existe
    const categoria = await prisma.categoria.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    const whereConditions = {
      categoria_id: parseInt(id)
    };
    
    // Filtro de búsqueda
    if (search) {
      whereConditions.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereConditions,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          precio: true,
          stock: true,
          activo: true
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
      categoria: categoria,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener productos de categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener estadísticas de categorías
exports.getEstadisticasCategorias = async (req, res) => {
  try {
    // Categorías con más productos
    const categoriasConMasProductos = await prisma.categoria.findMany({
      include: {
        productos: {
          where: { activo: true }
        }
      },
      orderBy: {
        productos: {
          _count: 'desc'
        }
      },
      take: 5
    });
    
    // Formatear resultados
    const topCategorias = categoriasConMasProductos.map(cat => ({
      id: cat.id,
      nombre: cat.nombre,
      productos_count: cat.productos.length
    }));
    
    // Categorías más activas (por movimientos recientes)
    const categoriasActivas = await prisma.$queryRaw`
      SELECT c.id, c.nombre, COUNT(m.id) as movimientos_count
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
      WHERE m.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY c.id, c.nombre
      ORDER BY movimientos_count DESC
      LIMIT 5
    `;
    
    return res.status(200).json({
      success: true,
      data: {
        categorias_con_mas_productos: topCategorias,
        categorias_mas_activas: categoriasActivas
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

// Operaciones masivas
exports.bulkUpdateCategorias = async (req, res) => {
  try {
    const { ids, action, data } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs válido'
      });
    }
    
    let result;
    
    switch (action) {
      case 'activate':
        result = await prisma.categoria.updateMany({
          where: { id: { in: ids.map(id => parseInt(id)) } },
          data: { activo: true }
        });
        break;
        
      case 'deactivate':
        result = await prisma.categoria.updateMany({
          where: { id: { in: ids.map(id => parseInt(id)) } },
          data: { activo: false }
        });
        break;
        
      case 'delete':
        // Verificar que ninguna categoría tenga productos o subcategorías
        const categoriasConRelaciones = await prisma.categoria.findMany({
          where: { id: { in: ids.map(id => parseInt(id)) } },
          include: {
            productos: true,
            subcategorias: true
          }
        });
        
        const categoriasConProductos = categoriasConRelaciones.filter(cat => 
          cat.productos.length > 0 || cat.subcategorias.length > 0
        );
        
        if (categoriasConProductos.length > 0) {
          return res.status(400).json({
            success: false,
            message: `No se pueden eliminar ${categoriasConProductos.length} categoría(s) porque tienen productos o subcategorías asociadas`
          });
        }
        
        result = await prisma.categoria.deleteMany({
          where: { id: { in: ids.map(id => parseInt(id)) } }
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Acción no válida'
        });
    }
    
    return res.status(200).json({
      success: true,
      message: `Operación ${action} realizada exitosamente`,
      affected: result.count
    });
  } catch (error) {
    console.error('Error en operación masiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
