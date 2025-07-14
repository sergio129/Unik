// Controlador para gestión de usuarios con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Obtener todos los usuarios
exports.getAllUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 20, activo, rol, buscar } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereConditions = {};
    
    if (activo !== undefined) {
      whereConditions.activo = activo === 'true';
    }
    
    if (rol) {
      whereConditions.rol = rol;
    }
    
    if (buscar) {
      whereConditions.OR = [
        { nombre_completo: { contains: buscar, mode: 'insensitive' } },
        { email: { contains: buscar, mode: 'insensitive' } },
        { username: { contains: buscar, mode: 'insensitive' } }
      ];
    }
    
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where: whereConditions,
        select: {
          id: true,
          username: true,
          email: true,
          nombre_completo: true,
          rol: true,
          activo: true,
          ultimo_acceso: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.usuario.count({ where: whereConditions })
    ]);
    
    return res.status(200).json({
      success: true,
      data: usuarios,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener usuario por ID
exports.getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        ultimo_acceso: true,
        createdAt: true,
        updatedAt: true,
        perfil: true
      }
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear nuevo usuario
exports.createUsuario = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      nombre_completo,
      rol = 'empleado',
      activo = true
    } = req.body;
    
    // Validaciones básicas
    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        success: false,
        message: 'Los campos username, email, password y nombre_completo son obligatorios'
      });
    }
    
    // Verificar que no existe usuario con mismo username o email
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim() }
        ]
      }
    });
    
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese username o email'
      });
    }
    
    // Validar rol
    const rolesValidos = ['admin', 'empleado', 'vendedor'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no válido'
      });
    }
    
    // Hash de la contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Crear usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: passwordHash,
        nombre_completo: nombre_completo.trim(),
        rol: rol,
        activo: Boolean(activo)
      },
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar usuario
exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      nombre_completo,
      rol,
      activo
    } = req.body;
    
    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar duplicados de username/email si se están cambiando
    if (username || email) {
      const condiciones = [];
      if (username && username !== usuarioExistente.username) {
        condiciones.push({ username: username.trim() });
      }
      if (email && email !== usuarioExistente.email) {
        condiciones.push({ email: email.trim().toLowerCase() });
      }
      
      if (condiciones.length > 0) {
        const duplicado = await prisma.usuario.findFirst({
          where: {
            AND: [
              { id: { not: parseInt(id) } },
              { OR: condiciones }
            ]
          }
        });
        
        if (duplicado) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro usuario con ese username o email'
          });
        }
      }
    }
    
    // Preparar datos de actualización
    const datosActualizacion = {};
    
    if (username) datosActualizacion.username = username.trim();
    if (email) datosActualizacion.email = email.trim().toLowerCase();
    if (nombre_completo) datosActualizacion.nombre_completo = nombre_completo.trim();
    if (rol) datosActualizacion.rol = rol;
    if (activo !== undefined) datosActualizacion.activo = Boolean(activo);
    
    // Hash de nueva contraseña si se proporciona
    if (password) {
      const saltRounds = 12;
      datosActualizacion.password = await bcrypt.hash(password, saltRounds);
    }
    
    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: datosActualizacion,
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        updatedAt: true
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar que no es el único administrador
    if (usuario.rol === 'admin') {
      const totalAdmins = await prisma.usuario.count({
        where: { rol: 'admin', activo: true }
      });
      
      if (totalAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el único administrador del sistema'
        });
      }
    }
    
    // En lugar de eliminar físicamente, desactivar el usuario
    const usuarioDesactivado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: false },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        activo: true
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: usuarioDesactivado
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_actual, password_nuevo } = req.body;
    
    if (!password_actual || !password_nuevo) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la contraseña actual y la nueva contraseña'
      });
    }
    
    // Obtener usuario con contraseña
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(password_actual, usuario.password);
    if (!passwordValida) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual no es correcta'
      });
    }
    
    // Hash de la nueva contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password_nuevo, saltRounds);
    
    // Actualizar contraseña
    await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { password: passwordHash }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar perfil del usuario autenticado
exports.updatePerfil = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const {
      nombre_completo,
      email
    } = req.body;
    
    // Verificar email único si se está cambiando
    if (email) {
      const usuarioConEmail = await prisma.usuario.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            { email: email.trim().toLowerCase() }
          ]
        }
      });
      
      if (usuarioConEmail) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con ese email'
        });
      }
    }
    
    // Actualizar datos del perfil
    const datosActualizacion = {};
    if (nombre_completo) datosActualizacion.nombre_completo = nombre_completo.trim();
    if (email) datosActualizacion.email = email.trim().toLowerCase();
    
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: userId },
      data: datosActualizacion,
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        perfil: true
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener estadísticas de usuarios
exports.getEstadisticasUsuarios = async (req, res) => {
  try {
    const [total, activos, porRol, recientes] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { activo: true } }),
      prisma.usuario.groupBy({
        by: ['rol'],
        _count: true
      }),
      prisma.usuario.findMany({
        where: { activo: true },
        select: {
          id: true,
          username: true,
          nombre_completo: true,
          rol: true,
          ultimo_acceso: true
        },
        orderBy: { ultimo_acceso: 'desc' },
        take: 10
      })
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        total,
        activos,
        inactivos: total - activos,
        por_rol: porRol.map(item => ({
          rol: item.rol,
          cantidad: item._count
        })),
        usuarios_recientes: recientes
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

// Buscar usuarios
exports.searchUsuarios = async (req, res) => {
  try {
    const { q, rol, activo, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereConditions = {};
    
    if (q) {
      whereConditions.OR = [
        { nombre_completo: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (rol) {
      whereConditions.rol = rol;
    }
    
    if (activo !== undefined) {
      whereConditions.activo = activo === 'true';
    }
    
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where: whereConditions,
        select: {
          id: true,
          username: true,
          email: true,
          nombre_completo: true,
          rol: true,
          activo: true,
          ultimo_acceso: true
        },
        orderBy: { nombre_completo: 'asc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.usuario.count({ where: whereConditions })
    ]);
    
    return res.status(200).json({
      success: true,
      data: usuarios,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

module.exports = exports;
