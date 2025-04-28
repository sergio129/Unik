const Usuario = require('../models/usuario.model');
const fs = require('fs');
const path = require('path');
const { validarJWT } = require('../middlewares/auth.middleware');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configurar almacenamiento para archivos subidos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/perfiles');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar un nombre de archivo único
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `perfil-${uniqueSuffix}${extension}`);
  }
});

// Filtro para permitir solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Controladores para el perfil de usuario
const perfilController = {
  // Obtener perfil del usuario autenticado
  obtenerPerfil: async (req, res) => {
    try {
      const userId = req.usuario.id;
      const usuario = await Usuario.findByPk(userId, {
        attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] }
      });
      
      if (!usuario) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Usuario no encontrado'
        });
      }
      
      return res.json({
        ok: true,
        usuario
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });
    }
  },
  
  // Obtener perfil de cualquier usuario (para administradores)
  obtenerPerfilPorId: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Verificar si el usuario solicitante es administrador
      const usuarioAdmin = req.usuario.rol === 'admin';
      
      // Si no es administrador y no es su propio perfil, denegar acceso
      if (!usuarioAdmin && req.usuario.id !== parseInt(userId)) {
        return res.status(403).json({
          ok: false,
          mensaje: 'No tiene permisos para ver este perfil'
        });
      }
      
      const usuario = await Usuario.findByPk(userId, {
        attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] }
      });
      
      if (!usuario) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Usuario no encontrado'
        });
      }
      
      return res.json({
        ok: true,
        usuario
      });
    } catch (error) {
      console.error('Error al obtener perfil por ID:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });
    }
  },
  
  // Actualizar perfil del usuario
  actualizarPerfil: async (req, res) => {
    try {
      const userId = req.usuario.id;
      const {
        email,
        nombre_completo,
        telefono,
        cargo,
        departamento,
        fecha_nacimiento,
        direccion,
        biografia,
        redes_sociales,
        habilidades,
        preferencias
      } = req.body;
      
      // Buscar usuario
      const usuario = await Usuario.findByPk(userId);
      
      if (!usuario) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Usuario no encontrado'
        });
      }
      
      // Actualizar datos básicos
      const datosActualizados = {
        email: email || usuario.email,
        nombre_completo: nombre_completo || usuario.nombre_completo,
        telefono: telefono || usuario.telefono,
        cargo: cargo || usuario.cargo,
        departamento: departamento || usuario.departamento,
        fecha_nacimiento: fecha_nacimiento || usuario.fecha_nacimiento,
        direccion: direccion || usuario.direccion,
        biografia: biografia || usuario.biografia
      };
      
      // Manejar campos JSON
      if (redes_sociales) {
        datosActualizados.redes_sociales = typeof redes_sociales === 'string' 
          ? JSON.parse(redes_sociales) 
          : redes_sociales;
      }
      
      if (habilidades) {
        datosActualizados.habilidades = typeof habilidades === 'string' 
          ? JSON.parse(habilidades) 
          : habilidades;
      }
      
      if (preferencias) {
        datosActualizados.preferencias = typeof preferencias === 'string' 
          ? JSON.parse(preferencias) 
          : preferencias;
      }
      
      // Actualizar usuario
      await usuario.update(datosActualizados);
      
      return res.json({
        ok: true,
        mensaje: 'Perfil actualizado correctamente',
        usuario: {
          ...usuario.get(),
          password: undefined,
          reset_token: undefined,
          reset_token_expiry: undefined
        }
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });
    }
  },
  
  // Subir foto de perfil
  subirFotoPerfil: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          mensaje: 'No se ha proporcionado ninguna imagen'
        });
      }
      
      const userId = req.usuario.id;
      const usuario = await Usuario.findByPk(userId);
      
      if (!usuario) {
        // Eliminar archivo subido si el usuario no existe
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          ok: false,
          mensaje: 'Usuario no encontrado'
        });
      }
      
      // Si ya había una foto anterior, eliminarla
      if (usuario.foto_perfil) {
        const rutaAnterior = path.join(__dirname, '../../public', usuario.foto_perfil);
        if (fs.existsSync(rutaAnterior)) {
          fs.unlinkSync(rutaAnterior);
        }
      }
      
      // Guardar la ruta relativa en la base de datos
      const rutaRelativa = `/uploads/perfiles/${path.basename(req.file.path)}`;
      await usuario.update({ foto_perfil: rutaRelativa });
      
      return res.json({
        ok: true,
        mensaje: 'Foto de perfil actualizada correctamente',
        rutaFoto: rutaRelativa
      });
    } catch (error) {
      console.error('Error al subir foto de perfil:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });
    }
  },
  
  // Eliminar foto de perfil
  eliminarFotoPerfil: async (req, res) => {
    try {
      const userId = req.usuario.id;
      const usuario = await Usuario.findByPk(userId);
      
      if (!usuario) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Usuario no encontrado'
        });
      }
      
      // Si hay foto de perfil, eliminarla
      if (usuario.foto_perfil) {
        const rutaFoto = path.join(__dirname, '../../public', usuario.foto_perfil);
        if (fs.existsSync(rutaFoto)) {
          fs.unlinkSync(rutaFoto);
        }
        
        // Actualizar usuario
        await usuario.update({ foto_perfil: null });
      }
      
      return res.json({
        ok: true,
        mensaje: 'Foto de perfil eliminada correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar foto de perfil:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });
    }
  }
};

module.exports = {
  perfilController,
  upload
};