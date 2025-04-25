// Controlador para la gestión de usuarios
const Usuario = require('../models/usuario.model');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'username', 'email', 'nombre_completo', 'rol', 'fecha_creacion', 'ultimo_acceso']
    });
    
    return res.status(200).json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id', 'username', 'email', 'nombre_completo', 'rol', 'fecha_creacion', 'ultimo_acceso']
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
      message: 'Error al obtener información del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Crear un nuevo usuario
exports.createUser = async (req, res) => {
  try {
    const { username, password, email, nombre_completo, rol } = req.body;
    
    // Validación básica
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de usuario y contraseña son obligatorios'
      });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }
    
    // Crear nuevo usuario
    const newUser = await Usuario.create({
      username,
      password, // El hash se genera en el hook beforeCreate
      email,
      nombre_completo,
      rol: rol || 'vendedor' // Por defecto es vendedor si no se especifica
    });
    
    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nombre_completo: newUser.nombre_completo,
        rol: newUser.rol
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Actualizar un usuario existente
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, nombre_completo, rol } = req.body;
    
    // Verificar si el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar si el nuevo username ya está en uso por otro usuario
    if (username && username !== usuario.username) {
      const existingUser = await Usuario.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
    }
    
    // Preparar datos a actualizar
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (nombre_completo) updateData.nombre_completo = nombre_completo;
    if (rol) updateData.rol = rol;
    
    // Si hay nueva contraseña, hashearla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Actualizar usuario
    await usuario.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: {
        id: usuario.id,
        username: updateData.username || usuario.username,
        email: updateData.email || usuario.email,
        nombre_completo: updateData.nombre_completo || usuario.nombre_completo,
        rol: updateData.rol || usuario.rol
      }
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar que no se pueda eliminar al usuario actual (quien hace la petición)
    if (req.user.id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario'
      });
    }
    
    // Eliminar usuario
    await usuario.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Cambiar contraseña de un usuario
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    
    // Solo el propio usuario puede cambiar su contraseña (a menos que sea admin)
    const isOwnUser = req.user.id.toString() === id;
    const isAdmin = req.user.rol === 'admin';
    
    if (!isOwnUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cambiar la contraseña de este usuario'
      });
    }
    
    // Verificar si el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si es el propio usuario, verificar la contraseña actual
    if (isOwnUser && !isAdmin) {
      const isMatch = await usuario.comparePassword(current_password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
      }
    }
    
    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    
    // Actualizar contraseña
    await usuario.update({ password: hashedPassword });
    
    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};