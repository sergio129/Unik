// Controlador para la gestión de usuarios
const Usuario = require('../models/usuario.model');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Añadimos la importación de operadores

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
      telefono, cargo, departamento, direccion, fecha_nacimiento,
      biografia, habilidades, redes_sociales
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
    
    // Procesar habilidades y redes sociales como JSON si son strings
    let habilidadesData = habilidades;
    if (typeof habilidades === 'string' && habilidades) {
      try {
        habilidadesData = JSON.parse(habilidades);
      } catch (e) {
        habilidadesData = habilidades.split(',').map(h => h.trim()).filter(h => h !== '');
      }
    }
    
    let redesSocialesData = redes_sociales;
    if (typeof redes_sociales === 'string' && redes_sociales) {
      try {
        redesSocialesData = JSON.parse(redes_sociales);
      } catch (e) {
        redesSocialesData = {};
      }
    }
    
    // Validar la fecha de nacimiento
    let fechaNacimientoValida = null;
    if (fecha_nacimiento) {
      // Intentar parsear la fecha
      const fechaParsed = new Date(fecha_nacimiento);
      // Verificar si la fecha es válida
      if (!isNaN(fechaParsed.getTime())) {
        // Formatear la fecha en formato YYYY-MM-DD para MySQL
        fechaNacimientoValida = fechaParsed.toISOString().split('T')[0];
      }
    }
    
    // Crear nuevo usuario con todos los campos
    const newUser = await Usuario.create({
      username,
      password, // El hash se genera en el hook beforeCreate
      email,
      nombre_completo,
      rol: rol || 'vendedor', // Por defecto es vendedor si no se especifica
      telefono,
      cargo,
      departamento,
      direccion,
      fecha_nacimiento: fechaNacimientoValida,
      biografia,
      habilidades: habilidadesData,
      redes_sociales: redesSocialesData
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
        departamento: newUser.departamento,
        direccion: newUser.direccion,
        fecha_nacimiento: newUser.fecha_nacimiento,
        biografia: newUser.biografia
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
      telefono, cargo, departamento, direccion, fecha_nacimiento,
      biografia, habilidades, redes_sociales
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
    
    // Procesar habilidades y redes sociales si están presentes
    let habilidadesData = undefined;
    if (habilidades !== undefined) {
      if (typeof habilidades === 'string') {
        try {
          habilidadesData = JSON.parse(habilidades);
        } catch (e) {
          habilidadesData = habilidades.split(',').map(h => h.trim()).filter(h => h !== '');
        }
      } else {
        habilidadesData = habilidades;
      }
    }
    
    let redesSocialesData = undefined;
    if (redes_sociales !== undefined) {
      if (typeof redes_sociales === 'string') {
        try {
          redesSocialesData = JSON.parse(redes_sociales);
        } catch (e) {
          redesSocialesData = {};
        }
      } else {
        redesSocialesData = redes_sociales;
      }
    }
    
    // Validar la fecha de nacimiento
    let fechaNacimientoValida = null;
    if (fecha_nacimiento) {
      // Intentar parsear la fecha
      const fechaParsed = new Date(fecha_nacimiento);
      // Verificar si la fecha es válida
      if (!isNaN(fechaParsed.getTime())) {
        // Formatear la fecha en formato YYYY-MM-DD para MySQL
        fechaNacimientoValida = fechaParsed.toISOString().split('T')[0];
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
    if (direccion !== undefined) updateData.direccion = direccion;
    if (fecha_nacimiento !== undefined) updateData.fecha_nacimiento = fechaNacimientoValida;
    if (biografia !== undefined) updateData.biografia = biografia;
    if (habilidadesData !== undefined) updateData.habilidades = habilidadesData;
    if (redesSocialesData !== undefined) updateData.redes_sociales = redesSocialesData;
    
    // Si hay nueva contraseña, hashearla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Actualizar usuario
    await usuario.update(updateData);
    
    // Preparar los datos para la respuesta
    const respuestaData = {
      id: usuario.id,
      username: updateData.username || usuario.username,
      email: updateData.email || usuario.email,
      nombre_completo: updateData.nombre_completo || usuario.nombre_completo,
      rol: updateData.rol || usuario.rol,
      telefono: updateData.telefono !== undefined ? updateData.telefono : usuario.telefono,
      cargo: updateData.cargo !== undefined ? updateData.cargo : usuario.cargo,
      departamento: updateData.departamento !== undefined ? updateData.departamento : usuario.departamento,
      direccion: updateData.direccion !== undefined ? updateData.direccion : usuario.direccion,
      fecha_nacimiento: updateData.fecha_nacimiento !== undefined ? updateData.fecha_nacimiento : usuario.fecha_nacimiento,
      biografia: updateData.biografia !== undefined ? updateData.biografia : usuario.biografia
    };
    
    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: respuestaData
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
          [Op.gte]: lastMonth
        }
      }
    });
    
    // Usuarios activos (que han iniciado sesión en el último mes)
    const activeUsers = await Usuario.count({
      where: {
        ultimo_acceso: {
          [Op.gte]: lastMonth
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
          [Op.gte]: lastYear
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
          [Op.gte]: lastYear
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