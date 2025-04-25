/**
 * Controlador para gestión de proveedores
 */
const { Op } = require('sequelize');
const Proveedor = require('../models/proveedor.model');
const Pedido = require('../models/pedido.model');

/**
 * Obtiene todos los proveedores con filtros opcionales
 */
const obtenerProveedores = async (req, res) => {
    try {
        // Extraer parámetros de consulta para filtrado
        const { 
            nombre, 
            activo,
            page = 1,
            limit = 50
        } = req.query;

        // Construir condiciones de filtrado
        const where = {};
        
        if (nombre) {
            where.nombre = {
                [Op.like]: `%${nombre}%`
            };
        }
        
        if (activo !== undefined) {
            where.activo = activo === 'true' || activo === true;
        }

        // Calcular offset para paginación
        const offset = (page - 1) * limit;
        
        // Obtener proveedores
        const proveedores = await Proveedor.findAndCountAll({
            where,
            order: [['nombre', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // Calcular metadatos de paginación
        const totalPages = Math.ceil(proveedores.count / limit);
        
        return res.status(200).json({
            success: true,
            message: 'Proveedores obtenidos exitosamente',
            data: {
                proveedores: proveedores.rows,
                pagination: {
                    totalItems: proveedores.count,
                    totalPages,
                    currentPage: parseInt(page),
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener proveedores',
            error: error.message
        });
    }
};

/**
 * Obtiene un proveedor específico por su ID
 */
const obtenerProveedorPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const proveedor = await Proveedor.findByPk(id);
        
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Proveedor obtenido exitosamente',
            data: proveedor
        });
    } catch (error) {
        console.error('Error al obtener proveedor por ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener proveedor',
            error: error.message
        });
    }
};

/**
 * Crea un nuevo proveedor
 */
const crearProveedor = async (req, res) => {
    try {
        const {
            nombre,
            nit,
            contacto,
            telefono,
            email,
            direccion,
            ciudad,
            pais,
            notas,
            activo
        } = req.body;
        
        // Validar datos requeridos
        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del proveedor es requerido'
            });
        }
        
        // Verificar si ya existe un proveedor con el mismo NIT
        if (nit) {
            const proveedorExistente = await Proveedor.findOne({ where: { nit } });
            if (proveedorExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un proveedor con este NIT'
                });
            }
        }
        
        // Crear el proveedor
        const proveedor = await Proveedor.create({
            nombre,
            nit,
            contacto,
            telefono,
            email,
            direccion,
            ciudad,
            pais,
            notas,
            activo: activo !== undefined ? activo : true
        });
        
        return res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            data: proveedor
        });
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear proveedor',
            error: error.message
        });
    }
};

/**
 * Actualiza un proveedor existente
 */
const actualizarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            nit,
            contacto,
            telefono,
            email,
            direccion,
            ciudad,
            pais,
            notas,
            activo
        } = req.body;
        
        // Verificar si el proveedor existe
        const proveedor = await Proveedor.findByPk(id);
        
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }
        
        // Verificar si ya existe otro proveedor con el mismo NIT
        if (nit && nit !== proveedor.nit) {
            const proveedorExistente = await Proveedor.findOne({ where: { nit } });
            if (proveedorExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe otro proveedor con este NIT'
                });
            }
        }
        
        // Actualizar el proveedor
        await proveedor.update({
            nombre: nombre !== undefined ? nombre : proveedor.nombre,
            nit: nit !== undefined ? nit : proveedor.nit,
            contacto: contacto !== undefined ? contacto : proveedor.contacto,
            telefono: telefono !== undefined ? telefono : proveedor.telefono,
            email: email !== undefined ? email : proveedor.email,
            direccion: direccion !== undefined ? direccion : proveedor.direccion,
            ciudad: ciudad !== undefined ? ciudad : proveedor.ciudad,
            pais: pais !== undefined ? pais : proveedor.pais,
            notas: notas !== undefined ? notas : proveedor.notas,
            activo: activo !== undefined ? activo : proveedor.activo
        });
        
        return res.status(200).json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            data: proveedor
        });
    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar proveedor',
            error: error.message
        });
    }
};

/**
 * Elimina un proveedor (desactivación lógica)
 */
const eliminarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el proveedor existe
        const proveedor = await Proveedor.findByPk(id);
        
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }
        
        // Verificar si el proveedor tiene pedidos asociados
        const pedidosAsociados = await Pedido.count({ 
            where: { proveedor_id: id }
        });
        
        if (pedidosAsociados > 0) {
            // Desactivar el proveedor en lugar de eliminarlo
            await proveedor.update({ activo: false });
            
            return res.status(200).json({
                success: true,
                message: 'Proveedor desactivado exitosamente porque tiene pedidos asociados',
                data: { 
                    proveedor,
                    pedidosAsociados 
                }
            });
        } else {
            // Eliminar el proveedor si no tiene pedidos
            await proveedor.destroy();
            
            return res.status(200).json({
                success: true,
                message: 'Proveedor eliminado exitosamente',
                data: { id }
            });
        }
    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar proveedor',
            error: error.message
        });
    }
};

/**
 * Obtiene estadísticas sobre un proveedor específico
 */
const obtenerEstadisticasProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el proveedor existe
        const proveedor = await Proveedor.findByPk(id);
        
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }
        
        // Obtener total de pedidos
        const totalPedidos = await Pedido.count({
            where: { proveedor_id: id }
        });
        
        // Obtener pedidos por estado
        const pedidosPorEstado = await Pedido.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            where: { proveedor_id: id },
            group: ['estado']
        });
        
        // Obtener valor total de pedidos
        const valorTotal = await Pedido.sum('total', {
            where: { proveedor_id: id }
        });
        
        // Obtener valor promedio de pedidos
        const valorPromedio = await Pedido.findOne({
            attributes: [
                [sequelize.fn('AVG', sequelize.col('total')), 'promedio']
            ],
            where: { proveedor_id: id }
        });
        
        // Pedidos recientes con este proveedor
        const pedidosRecientes = await Pedido.findAll({
            where: { proveedor_id: id },
            order: [['fecha_pedido', 'DESC']],
            limit: 5
        });
        
        return res.status(200).json({
            success: true,
            message: 'Estadísticas del proveedor obtenidas exitosamente',
            data: {
                proveedor,
                estadisticas: {
                    totalPedidos,
                    pedidosPorEstado,
                    valorTotal: valorTotal || 0,
                    valorPromedio: valorPromedio.getDataValue('promedio') || 0,
                    pedidosRecientes
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del proveedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del proveedor',
            error: error.message
        });
    }
};

module.exports = {
    obtenerProveedores,
    obtenerProveedorPorId,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    obtenerEstadisticasProveedor
};