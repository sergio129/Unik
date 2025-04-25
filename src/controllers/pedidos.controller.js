/**
 * Controlador para gestión de pedidos a proveedores
 * Rediseñado para manejar exclusivamente pedidos a proveedores
 */
const { Op } = require('sequelize');
const { sequelize } = require('../utils/database');
const Pedido = require('../models/pedido.model');
const DetallePedido = require('../models/detalle-pedido.model');
const SeguimientoPedido = require('../models/seguimiento-pedido.model');
const Producto = require('../models/producto.model');
const Usuario = require('../models/usuario.model');
const MovimientoInventario = require('../models/movimiento.model');
const Proveedor = require('../models/proveedor.model');
const whatsappService = require('../services/whatsappService');

/**
 * Obtiene todos los pedidos a proveedores con filtros opcionales
 */
const obtenerPedidos = async (req, res) => {
    try {
        // Extraer parámetros de consulta para filtrado
        const { 
            estado, 
            proveedor_id,
            fecha_inicio, 
            fecha_fin,
            prioridad,
            page = 1,
            limit = 100
        } = req.query;

        // Construir condiciones de filtrado
        const where = {};
        
        if (estado) {
            where.estado = estado;
        }
        
        if (proveedor_id) {
            where.proveedor_id = proveedor_id;
        }
        
        if (prioridad) {
            where.prioridad = prioridad;
        }
        
        // Filtrar por rango de fechas si se especifican
        if (fecha_inicio || fecha_fin) {
            where.fecha_pedido = {};
            
            if (fecha_inicio) {
                where.fecha_pedido[Op.gte] = new Date(fecha_inicio);
            }
            
            if (fecha_fin) {
                // Ajustar fecha_fin al final del día para incluir todo el día
                const endDate = new Date(fecha_fin);
                endDate.setHours(23, 59, 59, 999);
                where.fecha_pedido[Op.lte] = endDate;
            }
        }

        // Calcular offset para paginación
        const offset = (page - 1) * limit;
        
        // Obtener pedidos con sus relaciones
        const pedidos = await Pedido.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    attributes: ['id', 'nombre_completo']
                }
            ],
            order: [['fecha_pedido', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // Calcular metadatos de paginación
        const totalPages = Math.ceil(pedidos.count / limit);
        
        return res.status(200).json({
            success: true,
            message: 'Pedidos obtenidos exitosamente',
            data: {
                pedidos: pedidos.rows,
                pagination: {
                    totalItems: pedidos.count,
                    totalPages,
                    currentPage: parseInt(page),
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener pedidos',
            error: error.message
        });
    }
};

/**
 * Obtiene un pedido específico por su ID junto con sus detalles y seguimientos
 */
const obtenerPedidoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener pedido básico sin incluir relaciones complejas
        const pedido = await Pedido.findByPk(id);
        
        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        
        // Obtener detalles del pedido
        const detallesPedido = await DetallePedido.findAll({
            where: { pedido_id: id }
        });
        
        // Obtener seguimientos del pedido
        const seguimientosPedido = await SeguimientoPedido.findAll({
            where: { pedido_id: id },
            order: [['fecha', 'ASC']]
        });
        
        // Obtener todos los IDs de usuarios mencionados en seguimientos
        const usuarioIds = [...new Set(seguimientosPedido.map(s => s.usuario_id).filter(id => id))];
        
        // Obtener usuarios relacionados en una consulta separada
        let usuarios = [];
        if (usuarioIds.length > 0) {
            usuarios = await Usuario.findAll({
                where: {
                    id: {
                        [Op.in]: usuarioIds
                    }
                },
                attributes: ['id', 'nombre_completo', 'email']
            });
        }
        
        // Obtener códigos de productos
        const codigosProductos = detallesPedido.map(d => d.producto_codigo);
        
        // Obtener información de productos relacionados - CORREGIDO: seleccionando 'codigo' en lugar de 'id'
        const productos = await Producto.findAll({
            where: {
                codigo: {
                    [Op.in]: codigosProductos
                }
            },
            attributes: ['codigo', 'nombre'] // Corregido: no incluimos 'id' que no existe
        });
        
        // Construir objeto de respuesta
        const pedidoData = pedido.toJSON();
        
        // Agregar detalles con información de productos
        pedidoData.detalles = detallesPedido.map(detalle => {
            const detalleData = detalle.toJSON();
            const producto = productos.find(p => p.codigo === detalle.producto_codigo);
            
            return {
                ...detalleData,
                codigo_producto: producto ? producto.codigo : null,
                nombre_producto: producto ? producto.nombre : null
            };
        });
        
        // Agregar seguimientos con información de usuarios
        pedidoData.seguimientos = seguimientosPedido.map(seguimiento => {
            const seguimientoData = seguimiento.toJSON();
            const usuario = usuarios.find(u => u.id === seguimiento.usuario_id);
            
            return {
                ...seguimientoData,
                usuario: usuario ? {
                    id: usuario.id,
                    nombre: usuario.nombre_completo,
                    email: usuario.email
                } : null
            };
        });
        
        return res.status(200).json({
            success: true,
            message: 'Pedido obtenido exitosamente',
            data: pedidoData
        });
    } catch (error) {
        console.error('Error al obtener pedido por ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener pedido',
            error: error.message
        });
    }
};

/**
 * Crea un nuevo pedido a proveedor con sus detalles
 */
const crearPedido = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            proveedor_id,
            fecha_entrega_estimada,
            prioridad,
            origen,
            direccion_entrega,
            notas,
            persona_contacto,       // Ahora capturamos estos campos adicionales
            condiciones_pago,
            metodo_envio,
            notas_adicionales,
            detalles
        } = req.body;
        
        // Validar datos requeridos
        if (!proveedor_id) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'El campo proveedor_id es requerido'
            });
        }
        
        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Se requiere al menos un producto en el pedido'
            });
        }
        
        // Validar el formato para cada detalle
        for (const detalle of detalles) {
            if (!detalle.producto_id || !detalle.cantidad || detalle.cantidad <= 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Cada detalle debe tener producto_id y cantidad > 0'
                });
            }
        }
        
        // Generar código único para el pedido - Formato para proveedores: PP + YYMM + número secuencial
        const fecha = new Date();
        const yearMonth = fecha.toISOString().slice(2, 4) + 
                         (fecha.getMonth() + 1).toString().padStart(2, '0');
        
        const ultimoPedido = await Pedido.findOne({
            where: {
                codigo: {
                    [Op.like]: `PP${yearMonth}%`
                }
            },
            order: [['codigo', 'DESC']],
            transaction: t
        });
        
        let secuencial = 1;
        if (ultimoPedido) {
            const ultimoSecuencial = parseInt(ultimoPedido.codigo.slice(-4));
            secuencial = ultimoSecuencial + 1;
        }
        
        const codigoPedido = `PP${yearMonth}${secuencial.toString().padStart(4, '0')}`;
        
        // Asegurarnos de tener siempre un usuario_id válido (usar 1 como valor por defecto)
        const usuario_id = req.usuario && req.usuario.id ? req.usuario.id : 1;
        
        // Crear el pedido incluyendo los campos adicionales
        const pedido = await Pedido.create({
            codigo: codigoPedido,
            proveedor_id,
            tipo: 'proveedor', // Añadido campo tipo
            fecha_pedido: new Date(),
            fecha_entrega_estimada: fecha_entrega_estimada ? new Date(fecha_entrega_estimada) : null,
            estado: 'pendiente',
            prioridad: prioridad || 'media',
            origen: origen || 'tienda',
            direccion_entrega,
            notas,
            persona_contacto,       // Incluimos estos campos en el objeto de creación
            condiciones_pago,
            metodo_envio,
            notas_adicionales,
            usuario_id: usuario_id // Usar el ID de usuario válido
        }, { 
            transaction: t,
            fields: [
                'codigo', 'proveedor_id', 'tipo', 'fecha_pedido', 'fecha_entrega_estimada', 
                'estado', 'prioridad', 'origen', 'direccion_entrega', 'notas', 
                'persona_contacto', 'condiciones_pago', 'metodo_envio', 'notas_adicionales',
                'usuario_id'
            ]
        });
        
        // Crear los detalles del pedido sin información de precios
        const productosParaNotificacion = [];
        for (const detalle of detalles) {
            // El producto_id es en realidad el código del producto, buscar por código en lugar de por ID
            const codigoProducto = detalle.producto_id;
            const producto = await Producto.findOne({ 
                where: { codigo: codigoProducto },
                transaction: t 
            });
            
            if (!producto) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Producto con código ${codigoProducto} no encontrado`
                });
            }
            
            await DetallePedido.create({
                pedido_id: pedido.id,
                producto_codigo: producto.codigo,
                cantidad: detalle.cantidad,
                estado: 'pendiente',
                fecha_creacion: new Date(),
                notas: detalle.notas || null
            }, { 
                transaction: t,
                fields: ['pedido_id', 'producto_codigo', 'cantidad', 'estado', 'fecha_creacion', 'notas']
            });

            // Guardar el producto para la notificación de WhatsApp
            productosParaNotificacion.push({
                nombre: producto.nombre,
                codigo: producto.codigo,
                cantidad: detalle.cantidad
            });
        }
        
        // Crear el primer registro en el historial de seguimiento
        await SeguimientoPedido.create({
            pedido_id: pedido.id,
            estado_anterior: null,
            estado_nuevo: 'pendiente',
            fecha: new Date(),
            usuario_id: usuario_id, // Usar el mismo usuario_id que en el pedido
            comentario: 'Pedido a proveedor creado'
        }, { 
            transaction: t,
            fields: ['pedido_id', 'estado_anterior', 'estado_nuevo', 'fecha', 'usuario_id', 'comentario']
        });
        
        // Confirmar la transacción
        await t.commit();
        
        // Obtener el pedido recién creado con todos sus detalles (sin usar la asociación Producto)
        const pedidoCompleto = await Pedido.findByPk(pedido.id);
        const detallesPedido = await DetallePedido.findAll({
            where: { pedido_id: pedido.id }
        });
        
        // Obtener los productos relacionados en una consulta separada
        const codigosProductos = detallesPedido.map(d => d.producto_codigo);
        const productos = await Producto.findAll({
            where: {
                codigo: {
                    [Op.in]: codigosProductos
                }
            },
            attributes: ['codigo', 'nombre'] // Corregido: solo seleccionamos los campos que existen
        });
        
        // Construir manualmente el objeto de respuesta
        const pedidoCompletoData = pedidoCompleto.toJSON();
        pedidoCompletoData.detalles = detallesPedido.map(detalle => {
            const detalleData = detalle.toJSON();
            const producto = productos.find(p => p.codigo === detalle.producto_codigo);
            
            return {
                ...detalleData,
                Producto: producto ? {
                    nombre: producto.nombre,
                    codigo: producto.codigo
                } : null
            };
        });
        
        return res.status(201).json({
            success: true,
            message: 'Pedido a proveedor creado exitosamente',
            data: pedidoCompletoData
        });
    } catch (error) {
        // Revertir la transacción en caso de error
        if (t && !t.finished) {
            await t.rollback();
        }
        
        console.error('Error al crear pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

/**
 * Actualiza un pedido existente
 */
const actualizarPedido = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const {
            proveedor_id,
            fecha_entrega_estimada,
            prioridad,
            origen,
            direccion_entrega,
            notas,
            detalles
        } = req.body;
        
        // Verificar si el pedido existe
        const pedidoExistente = await Pedido.findByPk(id, { transaction: t });
        
        if (!pedidoExistente) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        
        // Verificar que el pedido no esté en estado completado o cancelado
        if (pedidoExistente.estado === 'completado' || pedidoExistente.estado === 'cancelado') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `No se puede modificar un pedido en estado ${pedidoExistente.estado}`
            });
        }
        
        // Si se enviaron detalles, procesar los cambios
        if (detalles && Array.isArray(detalles)) {
            // Eliminar detalles antiguos
            await DetallePedido.destroy({
                where: { pedido_id: id },
                transaction: t
            });
            
            // Crear nuevos detalles sin información de precios
            for (const detalle of detalles) {
                // El producto_id es en realidad el código del producto
                const codigoProducto = detalle.producto_id;
                const producto = await Producto.findOne({ 
                    where: { codigo: codigoProducto },
                    transaction: t 
                });
                
                if (!producto) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Producto con código ${codigoProducto} no encontrado`
                    });
                }
                
                await DetallePedido.create({
                    pedido_id: id,
                    producto_codigo: producto.codigo,
                    cantidad: detalle.cantidad,
                    estado: 'pendiente',
                    fecha_creacion: new Date(),
                    notas: detalle.notas || null
                }, { transaction: t });
            }
        }
        
        // Actualizar datos básicos del pedido
        const datosActualizacion = {};
        
        if (proveedor_id !== undefined) datosActualizacion.proveedor_id = proveedor_id;
        if (fecha_entrega_estimada !== undefined) {
            datosActualizacion.fecha_entrega_estimada = fecha_entrega_estimada ? new Date(fecha_entrega_estimada) : null;
        }
        if (prioridad !== undefined) datosActualizacion.prioridad = prioridad;
        if (origen !== undefined) datosActualizacion.origen = origen;
        if (direccion_entrega !== undefined) datosActualizacion.direccion_entrega = direccion_entrega;
        if (notas !== undefined) datosActualizacion.notas = notas;
        
        if (Object.keys(datosActualizacion).length > 0) {
            await pedidoExistente.update(datosActualizacion, { transaction: t });
        }
        
        // Crear una entrada en el historial de seguimiento
        await SeguimientoPedido.create({
            pedido_id: id,
            estado_anterior: pedidoExistente.estado,
            estado_nuevo: pedidoExistente.estado,
            fecha: new Date(),
            usuario_id: req.usuario.id,
            comentario: 'Pedido actualizado'
        }, { transaction: t });
        
        // Confirmar la transacción
        await t.commit();
        
        // Obtener el pedido actualizado con todas sus relaciones
        const pedidoActualizado = await Pedido.findByPk(id, {
            include: [
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            attributes: ['id', 'nombre', 'codigo']
                        }
                    ]
                }
            ]
        });
        
        return res.status(200).json({
            success: true,
            message: 'Pedido actualizado exitosamente',
            data: pedidoActualizado
        });
    } catch (error) {
        // Revertir la transacción en caso de error
        if (t && !t.finished) {
            await t.rollback();
        }
        
        console.error('Error al actualizar pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar pedido',
            error: error.message
        });
    }
};

/**
 * Cambia el estado de un pedido
 */
const cambiarEstadoPedido = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { estado, comentario } = req.body;
        
        // Validar el nuevo estado
        const estadosValidos = ['pendiente', 'en_proceso', 'enviado', 'completado', 'cancelado']; // Añadido 'enviado'
        if (!estadosValidos.includes(estado)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }
        
        // Verificar si el pedido existe
        const pedido = await Pedido.findByPk(id, { transaction: t });
        
        if (!pedido) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        
        // Validar las transiciones de estado permitidas
        const estadoActual = pedido.estado;
        
        if (estadoActual === 'completado' || estadoActual === 'cancelado') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `No se puede cambiar el estado de un pedido ${estadoActual}`
            });
        }
        
        // Validar transición de estado
        if (estadoActual === 'pendiente' && estado === 'completado') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'No se puede cambiar de pendiente a completado directamente'
            });
        }
        
        // Crear entrada en el historial de seguimiento
        const usuarioId = req.usuario ? req.usuario.id : 1;
        await SeguimientoPedido.create({
            pedido_id: id,
            estado_anterior: estadoActual,
            estado_nuevo: estado,
            fecha: new Date(),
            usuario_id: usuarioId,
            comentario: comentario || `Cambio de estado: ${estadoActual} a ${estado}`
        }, { transaction: t });
        
        // Actualizar el estado del pedido
        await pedido.update({ 
            estado,
            notas_recepcion: estado === 'completado' ? (comentario || 'Pedido recibido correctamente') : pedido.notas_recepcion
        }, { transaction: t });
        
        // Si el pedido se completa, actualizar el inventario
        if (estado === 'completado') {
            const detalles = await DetallePedido.findAll({
                where: { pedido_id: id },
                transaction: t
            });
            
            // Al completar un pedido a proveedor, los productos ya han llegado y se añaden al inventario
            for (const detalle of detalles) {
                // Buscar el producto usando el código
                const producto = await Producto.findOne({
                    where: { codigo: detalle.producto_codigo },
                    transaction: t
                });
                
                if (producto) {
                    // Guardar el stock anterior antes de actualizar
                    const stockAnterior = producto.cantidad || 0; // Cambiado de producto.stock a producto.cantidad
                    const stockNuevo = stockAnterior + detalle.cantidad;
                    
                    // Actualizar stock (aumentar)
                    await producto.update({
                        cantidad: stockNuevo // Cambiado de stock a cantidad
                    }, { transaction: t });
                    
                    // Marcar el detalle como recibido
                    await detalle.update({
                        estado: 'recibido',
                        fecha_recepcion: new Date()
                    }, { transaction: t });
                    
                    // Registrar movimiento de inventario con todos los campos requeridos
                    await MovimientoInventario.create({
                        producto_codigo: producto.codigo,
                        tipo_movimiento: 'entrada',
                        cantidad: detalle.cantidad,
                        stock_anterior: stockAnterior,
                        stock_nuevo: stockNuevo,
                        motivo: `Recepción Pedido Proveedor #${pedido.codigo}`,
                        usuario_id: usuarioId,
                        documento_referencia: pedido.codigo
                    }, { transaction: t });
                }
            }
        }
        
        // Confirmar la transacción
        await t.commit();
        
        // Obtener datos necesarios manualmente para evitar problemas de asociación
        const pedidoActualizado = await Pedido.findByPk(id);
        const detallesPedido = await DetallePedido.findAll({
            where: { pedido_id: id }
        });
        const seguimientosPedido = await SeguimientoPedido.findAll({
            where: { pedido_id: id },
            order: [['fecha', 'ASC']]
        });
        
        // Obtener información de productos
        const codigosProductos = detallesPedido.map(d => d.producto_codigo);
        const productos = await Producto.findAll({
            where: {
                codigo: {
                    [Op.in]: codigosProductos
                }
            },
            attributes: ['codigo', 'nombre'] // Corregido: no incluimos 'id' que no existe
        });
        
        // Obtener usuarios relacionados con seguimientos
        const usuarioIds = [...new Set(seguimientosPedido.map(s => s.usuario_id).filter(id => id))];
        const usuarios = usuarioIds.length > 0 ? await Usuario.findAll({
            where: {
                id: {
                    [Op.in]: usuarioIds
                }
            },
            attributes: ['id', 'nombre_completo', 'email']
        }) : [];
        
        // Construir objeto de respuesta
        const pedidoData = pedidoActualizado.toJSON();
        
        // Agregar detalles con información de productos
        pedidoData.detalles = detallesPedido.map(detalle => {
            const detalleData = detalle.toJSON();
            const producto = productos.find(p => p.codigo === detalle.producto_codigo);
            
            return {
                ...detalleData,
                codigo_producto: producto ? producto.codigo : null,
                nombre_producto: producto ? producto.nombre : null
            };
        });
        
        // Agregar seguimientos con información de usuarios
        pedidoData.seguimientos = seguimientosPedido.map(seguimiento => {
            const seguimientoData = seguimiento.toJSON();
            const usuario = usuarios.find(u => u.id === seguimiento.usuario_id);
            
            return {
                ...seguimientoData,
                usuario: usuario ? {
                    id: usuario.id,
                    nombre: usuario.nombre_completo,
                    email: usuario.email
                } : null
            };
        });
        
        // Si se marca como completado/recibido, enviar notificación por WhatsApp
        if (estado === 'completado') {
            try {
                // Buscar información del proveedor
                const proveedor = await Proveedor.findByPk(pedido.proveedor_id);
                
                if (proveedor && proveedor.telefono) {
                    // Inicializar WhatsApp si es necesario
                    if (!global.whatsappInitialized) {
                        global.whatsappInitialized = true;
                        whatsappService.initializeWhatsApp();
                        console.log('Servicio de WhatsApp inicializado');
                    }
                    
                    // Enviar notificación al proveedor de forma asíncrona
                    whatsappService.notificarPedidoRecibido(pedidoActualizado, proveedor)
                        .then(enviado => {
                            if (enviado) {
                                console.log(`Notificación de recepción enviada al proveedor ${proveedor.nombre} (${proveedor.telefono})`);
                            } else {
                                console.log(`No se pudo enviar notificación de recepción al proveedor ${proveedor.nombre}`);
                            }
                        })
                        .catch(error => {
                            console.error('Error al enviar notificación de recepción:', error);
                        });
                }
            } catch (error) {
                console.error('Error al intentar enviar notificación de recepción por WhatsApp:', error);
                // No bloqueamos la respuesta por un error en la notificación
            }
        }
        
        return res.status(200).json({
            success: true,
            message: 'Estado del pedido actualizado exitosamente',
            data: pedidoData
        });
    } catch (error) {
        // Revertir la transacción en caso de error
        if (t && !t.finished) {
            await t.rollback();
        }
        
        console.error('Error al cambiar estado del pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del pedido',
            error: error.message
        });
    }
};

/**
 * Obtiene estadísticas resumen de pedidos a proveedores
 */
const obtenerEstadisticas = async (req, res) => {
    try {
        // Contar número total de pedidos
        const totalPedidos = await Pedido.count();
        
        // Contar pedidos por estado
        const pedidosPorEstado = await Pedido.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            group: ['estado']
        });
        
        // Pedidos por proveedor (top 5)
        const pedidosPorProveedor = await Pedido.findAll({
            attributes: [
                'proveedor_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            group: ['proveedor_id'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 5
        });
        
        // Pedidos recientes (últimos 10)
        const pedidosRecientes = await Pedido.findAll({
            order: [['fecha_pedido', 'DESC']],
            limit: 10,
            attributes: ['id', 'codigo', 'proveedor_id', 'fecha_pedido', 'fecha_entrega_estimada', 'estado', 'prioridad']
        });
        
        return res.status(200).json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: {
                totalPedidos,
                pedidosPorEstado,
                pedidosPorProveedor,
                pedidosRecientes
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

/**
 * Registra un seguimiento para un pedido específico
 */
const registrarSeguimiento = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { comentario, tipo } = req.body;
        
        // Verificar si el pedido existe
        const pedido = await Pedido.findByPk(id, { transaction: t });
        
        if (!pedido) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        // Crear seguimiento sin cambiar el estado
        const usuarioId = req.usuario ? req.usuario.id : 1;
        await SeguimientoPedido.create({
            pedido_id: id,
            estado_anterior: pedido.estado,
            estado_nuevo: pedido.estado,
            fecha: new Date(),
            usuario_id: usuarioId,
            comentario: comentario || 'Seguimiento registrado',
            tipo: tipo || 'general'
        }, { transaction: t });

        // Confirmar transacción
        await t.commit();

        return res.status(201).json({
            success: true,
            message: 'Seguimiento registrado correctamente',
            data: {
                pedido_id: id,
                estado: pedido.estado,
                fecha: new Date(),
                tipo: tipo || 'general'
            }
        });
    } catch (error) {
        // Revertir la transacción en caso de error
        if (t && !t.finished) {
            await t.rollback();
        }
        
        console.error('Error al registrar seguimiento:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar seguimiento',
            error: error.message
        });
    }
};

/**
 * Obtiene la tendencia de pedidos para un rango de fechas (últimos 30 días por defecto)
 */
const obtenerTendencia = async (req, res) => {
    try {
        // Extraer parámetros para filtrar por fecha
        const { fecha_inicio, fecha_fin } = req.query;
        
        // Establecer fechas por defecto si no se proporcionan (últimos 30 días)
        const fechaFin = fecha_fin ? new Date(fecha_fin) : new Date();
        const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date(fechaFin);
        fechaInicio.setDate(fechaInicio.getDate() - 30); // 30 días atrás por defecto
        
        // Asegurar que la fecha final incluya todo el día
        fechaFin.setHours(23, 59, 59, 999);
        
        // Realizar consulta para obtener el conteo de pedidos por día
        const tendencia = await Pedido.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('fecha_pedido')), 'fecha'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            where: {
                fecha_pedido: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            group: [sequelize.fn('DATE', sequelize.col('fecha_pedido'))],
            order: [[sequelize.fn('DATE', sequelize.col('fecha_pedido')), 'ASC']]
        });
        
        return res.status(200).json({
            success: true,
            message: 'Tendencia de pedidos obtenida exitosamente',
            data: {
                tendencia: tendencia.map(item => ({
                    fecha: item.getDataValue('fecha'),
                    total: parseInt(item.getDataValue('total'))
                }))
            }
        });
    } catch (error) {
        console.error('Error al obtener tendencia de pedidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tendencia de pedidos',
            error: error.message
        });
    }
};

/**
 * Obtiene la distribución de pedidos por estado
 */
const obtenerPorEstado = async (req, res) => {
    try {
        // Contar pedidos por estado
        const porEstado = await Pedido.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            group: ['estado'],
            order: [[sequelize.literal('total'), 'DESC']]
        });
        
        return res.status(200).json({
            success: true,
            message: 'Distribución por estado obtenida exitosamente',
            data: {
                porEstado: porEstado.map(item => ({
                    estado: item.estado,
                    total: parseInt(item.getDataValue('total'))
                }))
            }
        });
    } catch (error) {
        console.error('Error al obtener distribución por estado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener distribución por estado',
            error: error.message
        });
    }
};

/**
 * Obtiene la distribución de pedidos por proveedor
 */
const obtenerPorProveedor = async (req, res) => {
    try {
        // Extraer límite opcional
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);
        
        // Obtener pedidos por proveedor
        const resultados = await Pedido.findAll({
            attributes: [
                'proveedor_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            group: ['proveedor_id'],
            order: [[sequelize.literal('total'), 'DESC']],
            limit: limitNum
        });
        
        // Obtener nombres de proveedores en una sola consulta adicional
        const proveedorIds = resultados.map(item => item.proveedor_id);
        const proveedores = await Proveedor.findAll({
            where: {
                id: {
                    [Op.in]: proveedorIds
                }
            },
            attributes: ['id', 'nombre']
        });
        
        // Combinar los datos
        const porProveedor = resultados.map(item => {
            const proveedor = proveedores.find(p => p.id === item.proveedor_id);
            return {
                proveedor_id: item.proveedor_id,
                nombre_proveedor: proveedor ? proveedor.nombre : `Proveedor ID: ${item.proveedor_id}`,
                total: parseInt(item.getDataValue('total'))
            };
        });
        
        return res.status(200).json({
            success: true,
            message: 'Distribución por proveedor obtenida exitosamente',
            data: {
                porProveedor
            }
        });
    } catch (error) {
        console.error('Error al obtener distribución por proveedor:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener distribución por proveedor',
            error: error.message
        });
    }
};

/**
 * Obtiene KPIs (indicadores clave de rendimiento) para el dashboard
 */
const obtenerKPIs = async (req, res) => {
    try {
        const hoy = new Date();
        
        // KPI 1: Tiempo promedio de entrega (días entre fecha_pedido y fecha de recepción real)
        const tiempoPromedioQuery = await sequelize.query(`
            SELECT AVG(DATEDIFF(sp.fecha, p.fecha_pedido)) as promedio
            FROM pedidos p
            INNER JOIN SeguimientoPedidos sp ON p.id = sp.pedido_id
            WHERE sp.estado_nuevo = 'completado'
            AND p.estado = 'completado'
            AND DATEDIFF(CURDATE(), p.fecha_pedido) <= 90
        `, { type: sequelize.QueryTypes.SELECT });
        
        // KPI 2: Tasa de cumplimiento (pedidos entregados a tiempo / total completados)
        const totalCompletados = await Pedido.count({
            where: { estado: 'completado' }
        });
        
        const entregadosATiempo = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM pedidos p
            INNER JOIN SeguimientoPedidos sp ON p.id = sp.pedido_id
            WHERE sp.estado_nuevo = 'completado'
            AND p.estado = 'completado'
            AND sp.fecha <= p.fecha_entrega_estimada
        `, { type: sequelize.QueryTypes.SELECT });
        
        // KPI 3: Próximas entregas (pedidos con fecha_entrega_estimada en los próximos 7 días)
        const proximaSemana = new Date(hoy);
        proximaSemana.setDate(proximaSemana.getDate() + 7);
        
        const proximasEntregas = await Pedido.count({
            where: {
                fecha_entrega_estimada: {
                    [Op.between]: [hoy, proximaSemana]
                },
                estado: {
                    [Op.notIn]: ['completado', 'cancelado']
                }
            }
        });
        
        // KPI 4: Pedidos retrasados (fecha_entrega_estimada < hoy y no completados)
        const pedidosRetrasados = await Pedido.count({
            where: {
                fecha_entrega_estimada: {
                    [Op.lt]: hoy
                },
                estado: {
                    [Op.notIn]: ['completado', 'cancelado']
                }
            }
        });
        
        // Calcular tasa de cumplimiento
        let tasaCumplimiento = 0;
        if (totalCompletados > 0) {
            tasaCumplimiento = Math.round((entregadosATiempo[0]?.total || 0) / totalCompletados * 100);
        }
        
        return res.status(200).json({
            success: true,
            message: 'KPIs obtenidos exitosamente',
            data: {
                tiempoPromedio: Math.round(tiempoPromedioQuery[0]?.promedio || 0),
                tasaCumplimiento,
                proximasEntregas,
                pedidosRetrasados
            }
        });
    } catch (error) {
        console.error('Error al obtener KPIs:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener KPIs',
            error: error.message
        });
    }
};

module.exports = {
    obtenerPedidos,
    obtenerPedidoPorId,
    crearPedido,
    actualizarPedido,
    cambiarEstadoPedido,
    obtenerEstadisticas,
    registrarSeguimiento,
    obtenerTendencia,
    obtenerPorEstado,
    obtenerPorProveedor,
    obtenerKPIs
};