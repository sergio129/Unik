// Controlador para gestión de pedidos a proveedores con Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Obtener todos los pedidos a proveedores con filtros opcionales
const obtenerPedidos = async (req, res) => {
    try {
        const { 
            estado, 
            proveedor_id,
            fecha_inicio,
            fecha_fin,
            page = 1,
            limit = 20
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const whereConditions = {};
        
        if (estado) {
            whereConditions.estado = estado;
        }
        
        if (proveedor_id) {
            whereConditions.proveedor_id = parseInt(proveedor_id);
        }
        
        if (fecha_inicio && fecha_fin) {
            whereConditions.fecha_pedido = {
                gte: new Date(fecha_inicio),
                lte: new Date(fecha_fin)
            };
        }
        
        const [pedidos, total] = await Promise.all([
            prisma.pedido.findMany({
                where: whereConditions,
                include: {
                    proveedor: {
                        select: { id: true, nombre: true, telefono: true }
                    },
                    detalles: {
                        include: {
                            producto: {
                                select: { codigo: true, nombre: true }
                            }
                        }
                    },
                    seguimientos: {
                        include: {
                            usuario: {
                                select: { id: true, nombre_completo: true }
                            }
                        },
                        orderBy: { fecha: 'desc' },
                        take: 3
                    }
                },
                orderBy: { fecha_pedido: 'desc' },
                skip: offset,
                take: parseInt(limit)
            }),
            prisma.pedido.count({ where: whereConditions })
        ]);
        
        return res.status(200).json({
            success: true,
            data: pedidos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener pedidos',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener pedido por ID
const obtenerPedidoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) },
            include: {
                proveedor: true,
                detalles: {
                    include: {
                        producto: {
                            select: { codigo: true, nombre: true, precio_compra: true }
                        }
                    }
                },
                seguimientos: {
                    include: {
                        usuario: {
                            select: { id: true, nombre_completo: true, email: true }
                        }
                    },
                    orderBy: { fecha: 'asc' }
                }
            }
        });
        
        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: pedido
        });
    } catch (error) {
        console.error('Error al obtener pedido por ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener pedido',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Crear nuevo pedido
const crearPedido = async (req, res) => {
    try {
        const {
            proveedor_id,
            fecha_entrega_estimada,
            prioridad = 'media',
            origen = 'manual',
            direccion_entrega,
            notas,
            detalles
        } = req.body;
        
        // Validar datos requeridos
        if (!proveedor_id) {
            return res.status(400).json({
                success: false,
                message: 'El campo proveedor_id es requerido'
            });
        }
        
        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere al menos un producto en el pedido'
            });
        }
        
        const resultado = await prisma.$transaction(async (tx) => {
            // Verificar que el proveedor existe
            const proveedor = await tx.proveedor.findUnique({
                where: { id: parseInt(proveedor_id) }
            });
            
            if (!proveedor) {
                throw new Error('Proveedor no encontrado');
            }
            
            // Generar código único para el pedido
            const fecha = new Date();
            const yearMonth = fecha.toISOString().slice(2, 4) + 
                             (fecha.getMonth() + 1).toString().padStart(2, '0');
            
            const ultimoPedido = await tx.pedido.findFirst({
                where: {
                    codigo: {
                        startsWith: `PP${yearMonth}`
                    }
                },
                orderBy: { codigo: 'desc' }
            });
            
            let secuencial = 1;
            if (ultimoPedido) {
                const ultimoSecuencial = parseInt(ultimoPedido.codigo.slice(-4));
                secuencial = ultimoSecuencial + 1;
            }
            
            const codigoPedido = `PP${yearMonth}${secuencial.toString().padStart(4, '0')}`;
            
            // Crear el pedido
            const nuevoPedido = await tx.pedido.create({
                data: {
                    codigo: codigoPedido,
                    proveedor_id: parseInt(proveedor_id),
                    fecha_pedido: new Date(),
                    fecha_entrega_estimada: fecha_entrega_estimada ? new Date(fecha_entrega_estimada) : null,
                    estado: 'pendiente',
                    prioridad: prioridad,
                    origen: origen,
                    direccion_entrega: direccion_entrega || null,
                    notas: notas || null,
                    usuario_id: req.user?.id || 1
                }
            });
            
            // Crear detalles del pedido
            for (const detalle of detalles) {
                const producto = await tx.producto.findUnique({
                    where: { codigo: detalle.producto_codigo }
                });
                
                if (!producto) {
                    throw new Error(`Producto con código ${detalle.producto_codigo} no encontrado`);
                }
                
                await tx.detallePedido.create({
                    data: {
                        pedido_id: nuevoPedido.id,
                        producto_codigo: detalle.producto_codigo,
                        cantidad: parseInt(detalle.cantidad),
                        estado: 'pendiente',
                        notas: detalle.notas || null
                    }
                });
            }
            
            // Crear registro inicial de seguimiento
            await tx.seguimientoPedido.create({
                data: {
                    pedido_id: nuevoPedido.id,
                    estado_anterior: null,
                    estado_nuevo: 'pendiente',
                    fecha: new Date(),
                    usuario_id: req.user?.id || 1,
                    comentario: 'Pedido a proveedor creado'
                }
            });
            
            return nuevoPedido;
        });
        
        // Obtener el pedido completo para respuesta
        const pedidoCompleto = await prisma.pedido.findUnique({
            where: { id: resultado.id },
            include: {
                proveedor: {
                    select: { id: true, nombre: true, telefono: true }
                },
                detalles: {
                    include: {
                        producto: {
                            select: { codigo: true, nombre: true }
                        }
                    }
                }
            }
        });
        
        return res.status(201).json({
            success: true,
            message: 'Pedido a proveedor creado exitosamente',
            data: pedidoCompleto
        });
    } catch (error) {
        console.error('Error al crear pedido:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Actualizar pedido
const actualizarPedido = async (req, res) => {
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
        
        const resultado = await prisma.$transaction(async (tx) => {
            // Verificar que el pedido existe
            const pedidoExistente = await tx.pedido.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!pedidoExistente) {
                throw new Error('Pedido no encontrado');
            }
            
            // Verificar que el pedido no esté completado o cancelado
            if (pedidoExistente.estado === 'completado' || pedidoExistente.estado === 'cancelado') {
                throw new Error(`No se puede modificar un pedido en estado ${pedidoExistente.estado}`);
            }
            
            // Si se enviaron detalles, actualizar
            if (detalles && Array.isArray(detalles)) {
                // Eliminar detalles antiguos
                await tx.detallePedido.deleteMany({
                    where: { pedido_id: parseInt(id) }
                });
                
                // Crear nuevos detalles
                for (const detalle of detalles) {
                    const producto = await tx.producto.findUnique({
                        where: { codigo: detalle.producto_codigo }
                    });
                    
                    if (!producto) {
                        throw new Error(`Producto con código ${detalle.producto_codigo} no encontrado`);
                    }
                    
                    await tx.detallePedido.create({
                        data: {
                            pedido_id: parseInt(id),
                            producto_codigo: detalle.producto_codigo,
                            cantidad: parseInt(detalle.cantidad),
                            estado: 'pendiente',
                            notas: detalle.notas || null
                        }
                    });
                }
            }
            
            // Actualizar datos básicos del pedido
            const datosActualizacion = {};
            
            if (proveedor_id !== undefined) datosActualizacion.proveedor_id = parseInt(proveedor_id);
            if (fecha_entrega_estimada !== undefined) {
                datosActualizacion.fecha_entrega_estimada = fecha_entrega_estimada ? new Date(fecha_entrega_estimada) : null;
            }
            if (prioridad !== undefined) datosActualizacion.prioridad = prioridad;
            if (origen !== undefined) datosActualizacion.origen = origen;
            if (direccion_entrega !== undefined) datosActualizacion.direccion_entrega = direccion_entrega;
            if (notas !== undefined) datosActualizacion.notas = notas;
            
            if (Object.keys(datosActualizacion).length > 0) {
                await tx.pedido.update({
                    where: { id: parseInt(id) },
                    data: datosActualizacion
                });
            }
            
            // Crear entrada en el historial de seguimiento
            await tx.seguimientoPedido.create({
                data: {
                    pedido_id: parseInt(id),
                    estado_anterior: pedidoExistente.estado,
                    estado_nuevo: pedidoExistente.estado,
                    fecha: new Date(),
                    usuario_id: req.user?.id || 1,
                    comentario: 'Pedido actualizado'
                }
            });
            
            return true;
        });
        
        // Obtener el pedido actualizado
        const pedidoActualizado = await prisma.pedido.findUnique({
            where: { id: parseInt(id) },
            include: {
                proveedor: {
                    select: { id: true, nombre: true, telefono: true }
                },
                detalles: {
                    include: {
                        producto: {
                            select: { codigo: true, nombre: true }
                        }
                    }
                }
            }
        });
        
        return res.status(200).json({
            success: true,
            message: 'Pedido actualizado exitosamente',
            data: pedidoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Cambiar estado del pedido
const cambiarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, comentario } = req.body;
        
        if (!estado) {
            return res.status(400).json({
                success: false,
                message: 'El estado es requerido'
            });
        }
        
        const estadosValidos = ['pendiente', 'en_proceso', 'completado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }
        
        const resultado = await prisma.$transaction(async (tx) => {
            // Verificar que el pedido existe
            const pedido = await tx.pedido.findUnique({
                where: { id: parseInt(id) },
                include: { detalles: true }
            });
            
            if (!pedido) {
                throw new Error('Pedido no encontrado');
            }
            
            const estadoAnterior = pedido.estado;
            
            // Actualizar estado del pedido
            await tx.pedido.update({
                where: { id: parseInt(id) },
                data: { 
                    estado: estado,
                    ...(estado === 'completado' && { 
                        notas_recepcion: comentario || 'Pedido recibido correctamente' 
                    })
                }
            });
            
            // Si el pedido se completa, actualizar el inventario
            if (estado === 'completado') {
                for (const detalle of pedido.detalles) {
                    const producto = await tx.producto.findUnique({
                        where: { codigo: detalle.producto_codigo }
                    });
                    
                    if (producto) {
                        const stockAnterior = producto.cantidad;
                        const stockNuevo = stockAnterior + detalle.cantidad;
                        
                        // Actualizar stock
                        await tx.producto.update({
                            where: { codigo: detalle.producto_codigo },
                            data: { cantidad: stockNuevo }
                        });
                        
                        // Registrar movimiento de inventario
                        await tx.movimientoInventario.create({
                            data: {
                                producto_codigo: detalle.producto_codigo,
                                tipo_movimiento: 'entrada',
                                cantidad: detalle.cantidad,
                                stock_anterior: stockAnterior,
                                stock_nuevo: stockNuevo,
                                motivo: `Recepción Pedido Proveedor #${pedido.codigo}`,
                                usuario_id: req.user?.id || 1,
                                documento_referencia: pedido.codigo
                            }
                        });
                    }
                }
            }
            
            // Registrar seguimiento
            await tx.seguimientoPedido.create({
                data: {
                    pedido_id: parseInt(id),
                    estado_anterior: estadoAnterior,
                    estado_nuevo: estado,
                    fecha: new Date(),
                    usuario_id: req.user?.id || 1,
                    comentario: comentario || `Estado cambiado a ${estado}`
                }
            });
            
            return true;
        });
        
        return res.status(200).json({
            success: true,
            message: 'Estado del pedido actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado del pedido:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Eliminar pedido
const eliminarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        
        const resultado = await prisma.$transaction(async (tx) => {
            // Verificar que el pedido existe
            const pedido = await tx.pedido.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!pedido) {
                throw new Error('Pedido no encontrado');
            }
            
            // Solo permitir eliminar pedidos pendientes
            if (pedido.estado !== 'pendiente') {
                throw new Error('Solo se pueden eliminar pedidos en estado pendiente');
            }
            
            // Eliminar seguimientos
            await tx.seguimientoPedido.deleteMany({
                where: { pedido_id: parseInt(id) }
            });
            
            // Eliminar detalles
            await tx.detallePedido.deleteMany({
                where: { pedido_id: parseInt(id) }
            });
            
            // Eliminar el pedido
            await tx.pedido.delete({
                where: { id: parseInt(id) }
            });
            
            return true;
        });
        
        return res.status(200).json({
            success: true,
            message: 'Pedido eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Registrar seguimiento
const registrarSeguimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario, tipo = 'general' } = req.body;
        
        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        
        await prisma.seguimientoPedido.create({
            data: {
                pedido_id: parseInt(id),
                estado_anterior: pedido.estado,
                estado_nuevo: pedido.estado,
                fecha: new Date(),
                usuario_id: req.user?.id || 1,
                comentario: comentario || 'Seguimiento registrado',
                tipo: tipo
            }
        });
        
        return res.status(201).json({
            success: true,
            message: 'Seguimiento registrado correctamente'
        });
    } catch (error) {
        console.error('Error al registrar seguimiento:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener estadísticas
const obtenerEstadisticas = async (req, res) => {
    try {
        const [totalPedidos, porEstado, pedidosRecientes] = await Promise.all([
            prisma.pedido.count(),
            prisma.pedido.groupBy({
                by: ['estado'],
                _count: true
            }),
            prisma.pedido.findMany({
                orderBy: { fecha_pedido: 'desc' },
                take: 5,
                include: {
                    proveedor: {
                        select: { nombre: true }
                    }
                }
            })
        ]);
        
        return res.status(200).json({
            success: true,
            data: {
                total_pedidos: totalPedidos,
                por_estado: porEstado.map(item => ({
                    estado: item.estado,
                    cantidad: item._count
                })),
                pedidos_recientes: pedidosRecientes
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Buscar pedidos
const buscarPedidos = async (req, res) => {
    try {
        const { q, estado, proveedor_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const whereConditions = {};
        
        if (q) {
            whereConditions.OR = [
                { codigo: { contains: q, mode: 'insensitive' } },
                { notas: { contains: q, mode: 'insensitive' } }
            ];
        }
        
        if (estado) {
            whereConditions.estado = estado;
        }
        
        if (proveedor_id) {
            whereConditions.proveedor_id = parseInt(proveedor_id);
        }
        
        const [pedidos, total] = await Promise.all([
            prisma.pedido.findMany({
                where: whereConditions,
                include: {
                    proveedor: {
                        select: { id: true, nombre: true }
                    }
                },
                orderBy: { fecha_pedido: 'desc' },
                skip: offset,
                take: parseInt(limit)
            }),
            prisma.pedido.count({ where: whereConditions })
        ]);
        
        return res.status(200).json({
            success: true,
            data: pedidos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error al buscar pedidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

module.exports = {
    obtenerPedidos,
    obtenerPedidoPorId,
    crearPedido,
    actualizarPedido,
    cambiarEstadoPedido,
    eliminarPedido,
    registrarSeguimiento,
    obtenerEstadisticas,
    buscarPedidos
};
