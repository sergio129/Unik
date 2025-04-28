// Controlador para la gestión de usuarios
const Usuario = require('../models/usuario.model');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: [
        'id', 'username', 'email', 'nombre_completo', 'rol', 
        'fecha_creacion', 'ultimo_acceso', 'telefono', 'cargo', 'departamento'
      ]
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
      attributes: [
        'id', 'username', 'email', 'nombre_completo', 'rol', 
        'fecha_creacion', 'ultimo_acceso', 'telefono', 'cargo', 'departamento'
      ]
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
    const { 
      username, password, email, nombre_completo, rol,
      telefono, cargo, departamento 
    } = req.body;
    
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
    
    // Crear nuevo usuario con campos extendidos
    const newUser = await Usuario.create({
      username,
      password, // El hash se genera en el hook beforeCreate
      email,
      nombre_completo,
      rol: rol || 'vendedor', // Por defecto es vendedor si no se especifica
      telefono,
      cargo,
      departamento
    });
    
    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nombre_completo: newUser.nombre_completo,
        rol: newUser.rol,
        telefono: newUser.telefono,
        cargo: newUser.cargo,
        departamento: newUser.departamento
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
    const { 
      username, password, email, nombre_completo, rol,
      telefono, cargo, departamento 
    } = req.body;
    
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
    
    // Preparar datos a actualizar, incluyendo campos extendidos
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (nombre_completo) updateData.nombre_completo = nombre_completo;
    if (rol) updateData.rol = rol;
    
    // Campos extendidos del perfil
    if (telefono !== undefined) updateData.telefono = telefono;
    if (cargo !== undefined) updateData.cargo = cargo;
    if (departamento !== undefined) updateData.departamento = departamento;
    
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
        rol: updateData.rol || usuario.rol,
        telefono: updateData.telefono !== undefined ? updateData.telefono : usuario.telefono,
        cargo: updateData.cargo !== undefined ? updateData.cargo : usuario.cargo,
        departamento: updateData.departamento !== undefined ? updateData.departamento : usuario.departamento
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

// Obtener estadísticas de usuarios
exports.getUserStats = async (req, res) => {
  try {
    // Cantidad total de usuarios
    const totalUsers = await Usuario.count();
    
    // Usuarios por rol
    const usersByRole = await Usuario.findAll({
      attributes: ['rol', [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'count']],
      group: 'rol'
    });
    
    // Usuarios creados en el último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const newUsers = await Usuario.count({
      where: {
        fecha_creacion: {
          [Usuario.sequelize.Op.gte]: lastMonth
        }
      }
    });
    
    // Usuarios activos (que han iniciado sesión en el último mes)
    const activeUsers = await Usuario.count({
      where: {
        ultimo_acceso: {
          [Usuario.sequelize.Op.gte]: lastMonth
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.rol] = parseInt(item.get('count'));
          return acc;
        }, {}),
        newUsers,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener datos para gráficos de usuarios
exports.getUserCharts = async (req, res) => {
  try {
    // Usuarios creados por mes en el último año
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    
    const usersByMonth = await Usuario.findAll({
      attributes: [
        [Usuario.sequelize.fn('DATE_FORMAT', Usuario.sequelize.col('fecha_creacion'), '%Y-%m'), 'month'],
        [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'count']
      ],
      where: {
        fecha_creacion: {
          [Usuario.sequelize.Op.gte]: lastYear
        }
      },
      group: [Usuario.sequelize.fn('DATE_FORMAT', Usuario.sequelize.col('fecha_creacion'), '%Y-%m')]
    });
    
    // Actividad de usuarios (logins) por mes
    const activityByMonth = await Usuario.findAll({
      attributes: [
        [Usuario.sequelize.fn('DATE_FORMAT', Usuario.sequelize.col('ultimo_acceso'), '%Y-%m'), 'month'],
        [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'count']
      ],
      where: {
        ultimo_acceso: {
          [Usuario.sequelize.Op.gte]: lastYear
        }
      },
      group: [Usuario.sequelize.fn('DATE_FORMAT', Usuario.sequelize.col('ultimo_acceso'), '%Y-%m')]
    });
    
    return res.status(200).json({
      success: true,
      data: {
        usersByMonth: usersByMonth.map(item => ({
          month: item.get('month'),
          count: parseInt(item.get('count'))
        })),
        activityByMonth: activityByMonth.map(item => ({
          month: item.get('month'),
          count: parseInt(item.get('count'))
        }))
      }
    });
  } catch (error) {
    console.error('Error al obtener datos para gráficos de usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos para gráficos de usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};