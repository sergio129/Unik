// Controlador para clientes con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    
    const clientes = await prisma.cliente.findMany({
      where: whereCondition,
      orderBy: [{ nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        numero_documento: true,
        tipo_documento: true,
        direccion: true,
        telefono: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
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
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        nombre: true,
        numero_documento: true,
        tipo_documento: true,
        direccion: true,
        telefono: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
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

    // Preparar condición de estado según el filtro
    let estadoCondition = {};
    if (soloInactivos) {
      estadoCondition = { activo: false };
    } else if (!mostrarInactivos) {
      estadoCondition = { activo: true };
    }

    // Buscar con OR entre las condiciones
    const clientes = await prisma.cliente.findMany({
      where: {
        AND: [
          estadoCondition,
          {
            OR: [
              {
                numero_documento: {
                  contains: terminoBusqueda,
                  mode: 'insensitive'
                }
              },
              {
                nombre: {
                  contains: terminoBusqueda,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      orderBy: [
        { nombre: 'asc' }
      ],
      take: parseInt(limit),
      select: {
        id: true,
        nombre: true,
        numero_documento: true,
        tipo_documento: true,
        direccion: true,
        telefono: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
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
    console.log('📝 Datos recibidos para crear cliente:', req.body);
    const { nombre, tipo_documento, numero_documento, documento, direccion, telefono, email } = req.body;
    
    // Permitir tanto 'numero_documento' como 'documento' para compatibilidad
    const docNumber = numero_documento || documento;
    
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
    }
    
    if (!docNumber) {
      return res.status(400).json({ message: 'El número de documento es obligatorio' });
    }
    
    // Verificar si ya existe un cliente con el mismo documento
    if (docNumber) {
      const clienteExistente = await prisma.cliente.findUnique({ 
        where: { numero_documento: docNumber },
        select: {
          id: true,
          nombre: true,
          numero_documento: true
        }
      });
      
      if (clienteExistente) {
        return res.status(400).json({ message: 'Ya existe un cliente con este documento' });
      }
    }
    
    // Crear objeto con datos obligatorios
    const datosCliente = {
      nombre,
      numero_documento: docNumber,
      tipo_documento: tipo_documento || 'CC',
      direccion,
      telefono,
      email,
      activo: true
    };
    
    const nuevoCliente = await prisma.cliente.create({
      data: datosCliente,
      select: {
        id: true,
        nombre: true,
        numero_documento: true,
        tipo_documento: true,
        direccion: true,
        telefono: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
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
    const { nombre, tipo_documento, numero_documento, direccion, telefono, email, activo } = req.body;
    
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificar si hay otro cliente con el mismo documento (si se está cambiando)
    if (numero_documento && numero_documento !== cliente.numero_documento) {
      const clienteExistente = await prisma.cliente.findUnique({ 
        where: { numero_documento },
        select: {
          id: true,
          nombre: true,
          numero_documento: true
        }
      });
      
      if (clienteExistente) {
        return res.status(400).json({ message: 'Ya existe otro cliente con este documento' });
      }
    }
    
    // Crear objeto con datos para actualizar
    const datosActualizar = {
      nombre,
      numero_documento,
      tipo_documento,
      direccion,
      telefono,
      email,
      activo: activo !== undefined ? activo : cliente.activo
    };
    
    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: datosActualizar,
      select: {
        id: true,
        nombre: true,
        numero_documento: true,
        tipo_documento: true,
        direccion: true,
        telefono: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
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
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // En lugar de eliminar, marcamos como inactivo
    await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { activo: false }
    });
    
    res.json({ message: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'Error al eliminar el cliente', error: error.message });
  }
};
