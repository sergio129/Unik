// Controlador para actividad del sistema con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener actividad reciente
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Por ahora, solo retornamos una respuesta básica
    // TODO: Implementar lógica completa de actividad reciente
    res.json({
      success: true,
      data: [],
      message: 'Actividad reciente - En desarrollo'
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividad reciente',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener top categorías
exports.getTopCategorias = async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      select: {
        id: true,
        nombre: true,
        productos: {
          select: {
            id: true,
            stock: true,
            precio: true
          },
          where: {
            activo: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    const categoriasConStats = categorias.map(categoria => ({
      id: categoria.id,
      nombre: categoria.nombre,
      total_productos: categoria.productos.length,
      stock_total: categoria.productos.reduce((sum, p) => sum + (p.stock || 0), 0),
      valor_total: categoria.productos.reduce((sum, p) => sum + ((p.stock || 0) * parseFloat(p.precio || 0)), 0)
    }));

    // Ordenar por número de productos descendente
    categoriasConStats.sort((a, b) => b.total_productos - a.total_productos);

    res.json({
      success: true,
      data: categoriasConStats.slice(0, 10) // Top 10
    });
  } catch (error) {
    console.error('Error al obtener top categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
