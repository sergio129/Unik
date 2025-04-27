const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Sesion = require('../models/sesion.model');

// Middleware para verificar si el usuario está autenticado
exports.authenticate = async (req, res, next) => {
  try {
    // Obtener el token del header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No hay token de autenticación'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verificar token JWT especificando algoritmos permitidos (previene ataque 'none')
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); // Asume HS256, ajusta si usas otro
      req.user = decoded;

      // Verificar si la sesión está activa en la base de datos
      const session = await Sesion.verifyToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Sesión inválida o expirada'
        });
      }

      // Verificar si el usuario existe
      const user = await Usuario.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    console.error('Error en authenticate middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};

// Middleware para verificar roles específicos
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    const { rol } = req.user;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a este recurso'
      });
    }

    next();
  };
};