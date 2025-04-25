const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Sesion = require('../models/sesion.model');

// Controlador para el login de usuarios
exports.login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporcione un nombre de usuario y contraseña'
      });
    }

    // Buscar usuario por username
    const usuario = await Usuario.findByUsername(username);
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await usuario.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el rol del usuario coincide con el rol seleccionado
    if (role && usuario.rol !== role) {
      return res.status(403).json({
        success: false,
        message: `No tiene permisos para ingresar como ${role === 'admin' ? 'administrador' : 
                  role === 'vendedor' ? 'asesor/vendedor' : 'inventario'}`
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Calcular fecha de expiración
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const expiration = new Date();
    if (expiresIn.endsWith('d')) {
      expiration.setDate(expiration.getDate() + parseInt(expiresIn));
    } else if (expiresIn.endsWith('h')) {
      expiration.setHours(expiration.getHours() + parseInt(expiresIn));
    } else {
      expiration.setDate(expiration.getDate() + 1); // Por defecto 1 día
    }

    // Registrar sesión en base de datos
    await Sesion.create({
      usuario_id: usuario.id,
      token,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      fecha_expiracion: expiration
    });

    // Actualizar último acceso
    await Usuario.updateLastAccess(usuario.id);

    // Responder con token y datos del usuario
    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Cerrar sesión
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    // Desactivar sesión en base de datos
    await Sesion.deactivate(token);

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Registrar nuevo usuario (solo administradores)
exports.register = async (req, res) => {
  try {
    // Verificar si el usuario actual es administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear usuarios'
      });
    }

    const { username, password, email, nombre_completo, rol } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de usuario y contraseña son obligatorios'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }

    // Crear nuevo usuario
    const newUser = await Usuario.create({
      username,
      password,
      email,
      nombre_completo,
      rol
    });

    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nombre_completo: newUser.nombre_completo,
        rol: newUser.rol
      }
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener información del usuario actual
exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'nombre_completo', 'rol']
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      user: usuario
    });
  } catch (error) {
    console.error('Error en me:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener sesiones activas del usuario
exports.activeSessions = async (req, res) => {
  try {
    const sessions = await Sesion.getActiveSessions(req.user.id);
    
    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error al obtener sesiones activas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};