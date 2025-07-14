// Controlador de autenticación con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validaciones básicas
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos'
      });
    }
    
    // Buscar usuario por username o email
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: username.trim().toLowerCase() }
        ]
      }
    });
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Verificar que el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado. Contacte al administrador'
      });
    }
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acceso: new Date() }
    });
    
    // Generar JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'unika_secret_key',
      { expiresIn: '8h' }
    );
    
    // Configurar cookie httpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });
    
    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: usuario.id,
          username: usuario.username,
          email: usuario.email,
          nombre_completo: usuario.nombre_completo,
          rol: usuario.rol
        },
        token: token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Logout de usuario
exports.logout = async (req, res) => {
  try {
    // Limpiar cookie del token
    res.clearCookie('token');
    
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Registro de nuevo usuario (solo para administradores)
exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      nombre_completo,
      rol = 'empleado',
      telefono,
      direccion
    } = req.body;
    
    // Validaciones básicas
    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos básicos son requeridos'
      });
    }
    
    // Verificar que no existe usuario con mismo username o email
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim().toLowerCase() }
        ]
      }
    });
    
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese username o email'
      });
    }
    
    // Validar que la contraseña tiene al menos 6 caracteres
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Validar email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
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
        activo: true,
        telefono: telefono?.trim() || null,
        direccion: direccion?.trim() || null
      },
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        created_at: true
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Verificar token y obtener datos del usuario
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unika_secret_key');
    
    // Obtener datos actuales del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        ultimo_acceso: true
      }
    });
    
    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o desactivado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    console.error('Error verificando token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña del usuario autenticado
exports.cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    if (!password_actual || !password_nuevo) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la contraseña actual y la nueva contraseña'
      });
    }
    
    if (password_nuevo.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Obtener usuario con contraseña
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId }
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
      where: { id: userId },
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

// Solicitar restablecimiento de contraseña
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }
    
    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    
    // Siempre responder exitosamente para evitar enumeración de usuarios
    if (!usuario) {
      return res.status(200).json({
        success: true,
        message: 'Si el email existe, se enviará un enlace de restablecimiento'
      });
    }
    
    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
    
    // Guardar token en base de datos
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        reset_password_token: resetToken,
        reset_password_expires: resetTokenExpiry
      }
    });
    
    // TODO: Aquí se enviaría el email con el enlace de restablecimiento
    // Para desarrollo, devolvemos el token
    return res.status(200).json({
      success: true,
      message: 'Si el email existe, se enviará un enlace de restablecimiento',
      ...(process.env.NODE_ENV === 'development' && { reset_token: resetToken })
    });
  } catch (error) {
    console.error('Error solicitando restablecimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Restablecer contraseña con token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Buscar usuario por token válido
    const usuario = await prisma.usuario.findFirst({
      where: {
        reset_password_token: token,
        reset_password_expires: {
          gt: new Date()
        }
      }
    });
    
    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    
    // Hash de la nueva contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Actualizar contraseña y limpiar tokens
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: passwordHash,
        reset_password_token: null,
        reset_password_expires: null
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }
    
    // Verificar token (puede estar expirado)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'unika_secret_key');
    } catch (error) {
      if (error.name !== 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }
      // Si está expirado, decodificar sin verificar
      decoded = jwt.decode(token);
    }
    
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
    
    // Generar nuevo token
    const nuevoToken = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'unika_secret_key',
      { expiresIn: '8h' }
    );
    
    // Configurar nueva cookie
    res.cookie('token', nuevoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });
    
    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        user: usuario,
        token: nuevoToken
      }
    });
  } catch (error) {
    console.error('Error renovando token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = exports;
