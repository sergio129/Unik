// Controlador para clientes
const Cliente = require('../models/cliente.model');
const { Op, Sequelize } = require('sequelize');
const db = require('../utils/database');
const sequelize = db.sequelize;

// Obtener todos los clientes
exports.getAllClientes = async (req, res) => {
  try {
    // Verificar tipo de filtro seleccionado
    const mostrarInactivos = req.query.includeInactivos === 'true';
    const soloInactivos = req.query.soloInactivos === 'true';
    
    // Preparar las condiciones de búsqueda según el filtro
    let whereCondition = {};
    
    if (soloInactivos) {
      // Solo mostrar inactivos
      whereCondition = { activo: false };
    } else if (!mostrarInactivos) {
      // Por defecto, solo mostrar activos
      whereCondition = { activo: true };
    }
    // Si mostrarInactivos es true, no se aplica filtro y se muestran todos
    
    const clientes = await Cliente.findAll({
      where: whereCondition,
      order: [['nombre', 'ASC']],
      // Definir explícitamente los atributos que se seleccionarán
      attributes: ['id', 'nombre', 'documento', 'tipo_documento', 'direccion', 'telefono', 'email', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    });
    
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error al obtener los clientes', error: error.message });
  }
};

// Obtener cliente por ID
exports.getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id, {
      // Definir explícitamente los atributos que se seleccionarán
      attributes: ['id', 'nombre', 'documento', 'tipo_documento', 'direccion', 'telefono', 'email', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    });
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ message: 'Error al obtener el cliente', error: error.message });
  }
};

// Buscar clientes
exports.searchClientes = async (req, res) => {
  try {
    const { buscar, limit = 10 } = req.query;
    if (!buscar) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere un término de búsqueda' 
      });
    }

    // Verificar tipo de filtro seleccionado
    const mostrarInactivos = req.query.includeInactivos === 'true';
    const soloInactivos = req.query.soloInactivos === 'true';

    // Preparar término de búsqueda (eliminar espacios en blanco y caracteres especiales)
    const terminoBusqueda = buscar.trim();

    // Crear un array para las condiciones de búsqueda
    const whereConditions = [];

    // Buscar documentos que contengan el término en cualquier parte
    whereConditions.push({
      documento: { 
        [Op.like]: `%${terminoBusqueda}%` // Contiene el término de búsqueda
      }
    });

    // Añadir búsqueda por nombre como segunda opción
    whereConditions.push({
      nombre: { 
        [Op.like]: `%${terminoBusqueda}%` 
      }
    });

    // Preparar condición de estado según el filtro
    let estadoCondition = {};
    if (soloInactivos) {
      estadoCondition = { activo: false };
    } else if (!mostrarInactivos) {
      estadoCondition = { activo: true };
    }

    // Buscar con OR entre las condiciones
    const clientes = await Cliente.findAll({
      where: {
        [Op.or]: whereConditions,
        ...estadoCondition // Aplicar filtro de estado
      },
      order: [
        [sequelize.literal(`CASE 
          WHEN documento = '${terminoBusqueda}' THEN 1
          WHEN documento LIKE '${terminoBusqueda}%' THEN 2
          ELSE 3
        END`), 'ASC'], // Ordenar por relevancia
        ['nombre', 'ASC'] // Después por nombre
      ],
      limit: parseInt(limit),
      attributes: ['id', 'nombre', 'documento', 'tipo_documento', 'direccion', 'telefono', 'email', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    });

    res.json({
      success: true,
      data: clientes,
      count: clientes.length
    });
  } catch (error) {
    console.error('Error al buscar clientes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al buscar clientes', 
      error: error.message 
    });
  }
};

// Crear un nuevo cliente
exports.createCliente = async (req, res) => {
  try {
    const { nombre, tipo_documento, documento, direccion, telefono, email } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
    }
    
    // Verificar si ya existe un cliente con el mismo documento
    if (documento) {
      const clienteExistente = await Cliente.findOne({ 
        where: { documento },
        attributes: ['id', 'nombre', 'documento']
      });
      if (clienteExistente) {
        return res.status(400).json({ message: 'Ya existe un cliente con este documento' });
      }
    }
    
    // Crear objeto con datos obligatorios
    const datosCliente = {
      nombre,
      documento,
      direccion,
      telefono,
      email,
      activo: true
    };
    
    // Añadir tipo_documento solo si la columna existe en la base de datos
    if (tipo_documento) {
      datosCliente.tipo_documento = tipo_documento;
    }
    
    const nuevoCliente = await Cliente.create(datosCliente);
    
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ message: 'Error al crear el cliente', error: error.message });
  }
};

// Actualizar un cliente
exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo_documento, documento, direccion, telefono, email, activo } = req.body;
    
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificar si hay otro cliente con el mismo documento (si se está cambiando)
    if (documento && documento !== cliente.documento) {
      const clienteExistente = await Cliente.findOne({ 
        where: { documento },
        attributes: ['id', 'nombre', 'documento']
      });
      if (clienteExistente) {
        return res.status(400).json({ message: 'Ya existe otro cliente con este documento' });
      }
    }
    
    // Crear objeto con datos para actualizar
    const datosActualizar = {
      nombre,
      documento,
      direccion,
      telefono,
      email,
      activo: activo !== undefined ? activo : cliente.activo
    };
    
    // Añadir tipo_documento solo si la columna existe en la base de datos
    if (tipo_documento) {
      datosActualizar.tipo_documento = tipo_documento;
    }
    
    await cliente.update(datosActualizar);
    
    // Obtener cliente actualizado excluyendo explícitamente tipo_documento 
    // para asegurar que funcione si la columna no existe
    const clienteActualizado = await Cliente.findByPk(id, {
      attributes: ['id', 'nombre', 'documento', 'direccion', 'telefono', 'email', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    });
    
    res.json(clienteActualizado);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'Error al actualizar el cliente', error: error.message });
  }
};

// Eliminar un cliente (desactivar)
exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // En lugar de eliminar, marcamos como inactivo
    await cliente.update({ activo: false });
    
    res.json({ message: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'Error al eliminar el cliente', error: error.message });
  }
};