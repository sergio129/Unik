// Middleware de autenticación para Prisma
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

// Middleware para verificar si el usuario está autenticado
exports.authenticateToken = async (req, res, next) => {
  try {
    // Obtener el token del header de autorización o cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    try {
      // Verificar token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unika_secret_key');
      
      // Verificar que el usuario existe y está activo
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          nombre_completo: true,
          rol: true,
          activo: true
        }
      });

      if (!usuario || !usuario.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido o desactivado'
        });
      }

      // Adjuntar información del usuario a la request
      req.user = usuario;
      req.usuario = usuario; // Compatibilidad con código existente
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles específicos
exports.authorizeRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción'
      });
    }

    next();
  };
};

// Middleware para verificar que el usuario es administrador
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador'
    });
  }

  next();
};

// Middleware para verificar que el usuario puede acceder a su propio perfil o es admin
exports.requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  const userId = parseInt(req.params.id);
  if (req.user.id !== userId && req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'No tiene permisos para acceder a este recurso'
    });
  }

  next();
};

// Middleware opcional - no requiere autenticación pero la verifica si está presente
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unika_secret_key');
      
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          nombre_completo: true,
          rol: true,
          activo: true
        }
      });

      if (usuario && usuario.activo) {
        req.user = usuario;
        req.usuario = usuario;
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Error en autenticación opcional:', error);
    req.user = null;
    next();
  }
};

// Compatibilidad con código existente
exports.authenticate = exports.authenticateToken;

module.exports = exports;
