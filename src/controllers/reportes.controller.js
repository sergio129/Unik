// Controlador para los reportes de inventario
const { sequelize } = require('../utils/database');
const { Op } = require('sequelize');
const Producto = require('../models/producto.model');
const Categoria = require('../models/categoria.model');
const Movimiento = require('../models/movimiento.model');
const moment = require('moment');

// Función auxiliar para calcular la variación de stock
async function calcularVariacionStock() {
    try {
        // Calcular stock actual total
        const stockActualResult = await Producto.sum('cantidad', {
            where: { activo: true }
        });
        const stockActual = stockActualResult || 0;
        
        // Calcular stock hace un mes (simulado usando movimientos)
        const fechaInicio = moment().subtract(60, 'days').startOf('day');
        const fechaFin = moment().subtract(30, 'days').endOf('day');
        
        // Obtener movimientos del último mes
        const movimientosUltimoMes = await Movimiento.findAll({
            where: {
                fecha_creacion: {
                    [Op.between]: [fechaFin.toDate(), moment().toDate()]
                }
            }
        });
        
        // Calcular cambio neto en el último mes
        const cambioNetoUltimoMes = movimientosUltimoMes.reduce((sum, m) => {
            return sum + (m.tipo_movimiento === 'entrada' ? m.cantidad : -m.cantidad);
        }, 0);
        
        // Stock estimado hace un mes
        const stockHaceUnMes = stockActual - cambioNetoUltimoMes;
        
        // Calcular variación porcentual
        if (stockHaceUnMes > 0) {
            return ((stockActual - stockHaceUnMes) / stockHaceUnMes) * 100;
        }
        
        return 0;
    } catch (error) {
        console.error('Error al calcular variación de stock:', error);
        return 0;
    }
}

// Obtener tendencias de stock
exports.getStockTrends = async (req, res) => {
    try {
        const { startDate, endDate, categoria_id } = req.query;
        const fechaInicio = startDate ? moment(startDate).startOf('day') : moment().subtract(30, 'days').startOf('day');
        const fechaFin = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

        // Filtros adicionales
        const whereClause = {};
        if (categoria_id && categoria_id !== 'all') {
            whereClause.categoria_id = categoria_id;
        }

        // Obtener los productos con más movimientos
        const topProductos = await Producto.findAll({
            where: whereClause,
            attributes: ['codigo', 'nombre'],
            include: [
                {
                    model: Movimiento,
                    as: 'movimientos',
                    attributes: [],
                    where: {
                        fecha_creacion: {
                            [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
                        }
                    }
                }
            ],
            group: ['Producto.codigo'],
            order: [
                [sequelize.fn('COUNT', sequelize.col('movimientos.id')), 'DESC']
            ],
            subQuery: false,
            limit: 5
        });

        // Para cada producto top, obtener la tendencia de stock semanal
        const stockTrends = {
            labels: [],
            datasets: [],
            kpis: {
                avgStock: 0,
                variation: '0%',
                totalStock: 0,
                criticalStock: 0
            }
        };

        // Generar las etiquetas de semanas para el período seleccionado
        let currentDate = fechaInicio.clone();
        while (currentDate.isBefore(fechaFin) || currentDate.isSame(fechaFin, 'day')) {
            stockTrends.labels.push(currentDate.format('DD/MM/YY'));
            currentDate.add(7, 'days');
        }

        // Colores para los gráficos
        const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#673AB7'];

        // Obtener datos de stock para cada producto
        let totalStock = 0;
        let criticalStock = 0;
        let sumAvgStock = 0;

        for (let i = 0; i < topProductos.length; i++) {
            const producto = topProductos[i];
            
            // Obtener movimientos del producto en el rango de fechas
            const movimientos = await Movimiento.findAll({
                where: {
                    producto_codigo: producto.codigo,
                    fecha_creacion: {
                        [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
                    }
                },
                order: [['fecha_creacion', 'ASC']]
            });

            // Calcular el stock para cada semana
            const productoActual = await Producto.findByPk(producto.codigo);
            const stockActual = productoActual.cantidad;
            const stockData = [];
            
            // Agregar al contador de stock total
            totalStock += stockActual;
            
            // Verificar si el stock está por debajo del mínimo
            if (stockActual <= productoActual.stock_minimo) {
                criticalStock++;
            }

            // Calcular datos históricos simulados basados en movimientos
            let stockSimulado = stockActual;
            for (let j = stockTrends.labels.length - 1; j >= 0; j--) {
                const fechaFinal = j < stockTrends.labels.length - 1 ? 
                    moment(stockTrends.labels[j+1], 'DD/MM/YY') : 
                    fechaFin;
                const fechaInicial = moment(stockTrends.labels[j], 'DD/MM/YY');
                
                // Calcular el cambio neto en este período
                const movsPeriodo = movimientos.filter(m => 
                    moment(m.fecha_creacion).isSameOrAfter(fechaInicial) && 
                    moment(m.fecha_creacion).isBefore(fechaFinal)
                );
                
                const cambioNeto = movsPeriodo.reduce((sum, m) => {
                    // Las salidas restan, las entradas suman
                    return sum + (m.tipo_movimiento === 'salida' ? m.cantidad : -m.cantidad);
                }, 0);
                
                // Aplicar el cambio neto al stock simulado
                stockSimulado += cambioNeto;
                stockData[j] = Math.max(0, stockSimulado); // No permitir stock negativo
            }
            
            // Calcular promedio de stock para este producto
            const avgProductStock = stockData.reduce((sum, val) => sum + val, 0) / stockData.length;
            sumAvgStock += avgProductStock;

            // Agregar dataset para este producto
            stockTrends.datasets.push({
                label: producto.nombre,
                data: stockData,
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length].replace(')', ', 0.1)').replace('rgb', 'rgba'),
                tension: 0.4
            });
        }

        // Calcular KPIs
        stockTrends.kpis.avgStock = Math.round(sumAvgStock / (topProductos.length || 1));
        stockTrends.kpis.totalStock = totalStock;
        stockTrends.kpis.criticalStock = criticalStock;

        // Calcular variación
        const variation = await calcularVariacionStock();
        stockTrends.kpis.variation = variation > 0 ? 
            `+${variation.toFixed(1)}%` : 
            `${variation.toFixed(1)}%`;

        return res.status(200).json({
            success: true,
            data: stockTrends
        });
    } catch (error) {
        console.error('Error al obtener tendencias de stock:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tendencias de stock',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener productos más y menos vendidos
exports.getTopProducts = async (req, res) => {
    try {
        const { startDate, endDate, categoria_id } = req.query;
        const fechaInicio = startDate ? moment(startDate).startOf('day') : moment().subtract(30, 'days').startOf('day');
        const fechaFin = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

        // Construir condiciones
        const whereClause = {
            tipo_movimiento: 'salida',
            fecha_creacion: {
                [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
            }
        };

        // Filtro adicional por categoría
        const productFilter = {};
        if (categoria_id && categoria_id !== 'all') {
            productFilter.categoria_id = categoria_id;
        }

        // Top productos más vendidos
        const topProducts = await Movimiento.findAll({
            where: whereClause,
            attributes: [
                'producto_codigo',
                [sequelize.fn('SUM', sequelize.col('MovimientoInventario.cantidad')), 'total_vendido']
            ],
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['nombre'],
                    where: productFilter
                }
            ],
            group: ['producto_codigo'],
            order: [[sequelize.literal('total_vendido'), 'DESC']],
            limit: 10
        });

        // Top productos menos vendidos (con al menos una venta)
        const bottomProducts = await Movimiento.findAll({
            where: whereClause,
            attributes: [
                'producto_codigo',
                [sequelize.fn('SUM', sequelize.col('MovimientoInventario.cantidad')), 'total_vendido']
            ],
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['nombre'],
                    where: productFilter
                }
            ],
            group: ['producto_codigo'],
            having: {
                total_vendido: {
                    [Op.gt]: 0
                }
            },
            order: [[sequelize.literal('total_vendido'), 'ASC']],
            limit: 10
        });

        const formattedTop = topProducts.map(p => ({
            name: p.producto.nombre,
            cantidad: parseInt(p.dataValues.total_vendido)
        }));

        const formattedBottom = bottomProducts.map(p => ({
            name: p.producto.nombre,
            cantidad: parseInt(p.dataValues.total_vendido)
        }));

        return res.status(200).json({
            success: true,
            data: {
                topProducts: formattedTop,
                bottomProducts: formattedBottom
            }
        });
    } catch (error) {
        console.error('Error al obtener productos más/menos vendidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener productos más/menos vendidos',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener análisis de rotación de inventario
exports.getRotationAnalysis = async (req, res) => {
    try {
        const { startDate, endDate, categoria_id } = req.query;
        const fechaInicio = startDate ? moment(startDate).startOf('day') : moment().subtract(90, 'days').startOf('day');
        const fechaFin = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

        // Filtro adicional por categoría
        const productFilter = {};
        if (categoria_id && categoria_id !== 'all') {
            productFilter.categoria_id = categoria_id;
        }

        // Obtener todos los productos activos con sus ventas
        const productos = await Producto.findAll({
            where: {
                ...productFilter,
                activo: true
            },
            include: [
                {
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['nombre']
                }
            ]
        });

        // Para cada producto, calcular su índice de rotación
        const rotationData = {
            rotation: [],
            highRotation: [],
            lowRotation: [],
            categoryRotation: []
        };

        // Mapeo para acumular datos por categoría
        const categorySales = {};
        const categoryStock = {};

        for (const producto of productos) {
            // Obtener ventas del producto
            const ventas = await Movimiento.findAll({
                where: {
                    producto_codigo: producto.codigo,
                    tipo_movimiento: 'salida',
                    fecha_creacion: {
                        [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
                    }
                }
            });

            // Calcular total de unidades vendidas
            const totalVendido = ventas.reduce((sum, venta) => sum + venta.cantidad, 0);
            
            // Stock promedio (simplificado, en un sistema real se calcularía con datos históricos)
            const stockPromedio = Math.max(1, (producto.cantidad + producto.stock_minimo) / 2);
            
            // Índice de rotación: ventas / stock promedio (mensualizado)
            const diasPeriodo = moment(fechaFin).diff(moment(fechaInicio), 'days');
            const mesesPeriodo = diasPeriodo / 30;
            const indiceRotacion = (totalVendido / stockPromedio) / mesesPeriodo;
            
            // Acumular datos por categoría
            const categoriaNombre = producto.categoria ? producto.categoria.nombre : 'Sin Categoría';
            if (!categorySales[categoriaNombre]) {
                categorySales[categoriaNombre] = 0;
                categoryStock[categoriaNombre] = 0;
            }
            categorySales[categoriaNombre] += totalVendido;
            categoryStock[categoriaNombre] += stockPromedio;

            // Agregar a la lista general
            rotationData.rotation.push({
                product: producto.nombre,
                value: indiceRotacion
            });

            // Clasificar productos según su rotación
            if (indiceRotacion >= 10) {
                // Alta rotación
                const diasEstimadosParaDesabastecimiento = producto.cantidad / (totalVendido / diasPeriodo);
                rotationData.highRotation.push({
                    name: producto.nombre,
                    value: indiceRotacion,
                    stock: producto.cantidad,
                    daysToStockout: Math.round(diasEstimadosParaDesabastecimiento)
                });
            } else if (indiceRotacion <= 3 && producto.cantidad > 0) {
                // Baja rotación
                const diasSinMovimiento = ventas.length > 0 ? 
                    moment().diff(moment(ventas[ventas.length - 1].fecha_creacion), 'days') : 
                    diasPeriodo;
                
                rotationData.lowRotation.push({
                    name: producto.nombre,
                    value: indiceRotacion,
                    stock: producto.cantidad,
                    daysInInventory: diasSinMovimiento
                });
            }
        }

        // Calcular rotación por categoría
        for (const categoria in categorySales) {
            if (categoryStock[categoria] > 0) {
                const diasPeriodo = moment(fechaFin).diff(moment(fechaInicio), 'days');
                const mesesPeriodo = diasPeriodo / 30;
                const indiceRotacion = (categorySales[categoria] / categoryStock[categoria]) / mesesPeriodo;
                
                rotationData.categoryRotation.push({
                    category: categoria,
                    value: indiceRotacion
                });
            }
        }

        // Ordenar resultados
        rotationData.rotation.sort((a, b) => b.value - a.value);
        rotationData.highRotation.sort((a, b) => a.daysToStockout - b.daysToStockout);
        rotationData.lowRotation.sort((a, b) => b.daysInInventory - a.daysInInventory);
        rotationData.categoryRotation.sort((a, b) => b.value - a.value);

        // Limitar a los primeros elementos
        rotationData.highRotation = rotationData.highRotation.slice(0, 3);
        rotationData.lowRotation = rotationData.lowRotation.slice(0, 3);

        return res.status(200).json({
            success: true,
            data: rotationData
        });
    } catch (error) {
        console.error('Error al obtener análisis de rotación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener análisis de rotación',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener proyecciones de stock
exports.getStockProjections = async (req, res) => {
    try {
        const { startDate, endDate, categoria_id } = req.query;
        const fechaInicio = startDate ? moment(startDate).startOf('day') : moment().subtract(90, 'days').startOf('day');
        const fechaFin = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

        // Calcular proyecciones basadas en el historial de ventas
        const diasHistoricos = moment(fechaFin).diff(moment(fechaInicio), 'days');
        
        // Filtro adicional por categoría
        const productFilter = {};
        if (categoria_id && categoria_id !== 'all') {
            productFilter.categoria_id = categoria_id;
        }

        // Obtener productos con más ventas - versión corregida de la consulta
        const topProductos = await Producto.findAll({
            where: {
                ...productFilter,
                activo: true
            },
            include: [
                {
                    model: Movimiento,
                    as: 'movimientos',
                    attributes: [],
                    where: {
                        tipo_movimiento: 'salida',
                        fecha_creacion: {
                            [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
                        }
                    },
                    required: true
                }
            ],
            group: ['Producto.codigo'],
            subQuery: false, // Importante para evitar errores de columna no encontrada
            order: [
                [sequelize.literal('COUNT(movimientos.id)'), 'DESC']
            ],
            limit: 4
        });

        // Generar etiquetas para las próximas 6 semanas
        const projectionLabels = [];
        let currentDate = moment();
        for (let i = 0; i < 6; i++) {
            projectionLabels.push(currentDate.format('DD/MM/YY'));
            currentDate.add(7, 'days');
        }

        // Datos para proyecciones
        const projectionData = {
            projections: {
                labels: projectionLabels,
                datasets: []
            },
            stockoutRisk: [],
            purchaseForecast: [],
            seasonal: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: []
            }
        };

        // Colores para los gráficos
        const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

        // Para cada producto top, calcular proyecciones
        for (let i = 0; i < topProductos.length; i++) {
            const producto = topProductos[i];
            
            // Obtener ventas históricas para calcular la tasa de consumo diario
            const ventas = await Movimiento.findAll({
                where: {
                    producto_codigo: producto.codigo,
                    tipo_movimiento: 'salida',
                    fecha_creacion: {
                        [Op.between]: [fechaInicio.toDate(), fechaFin.toDate()]
                    }
                }
            });

            const totalVendido = ventas.reduce((sum, venta) => sum + venta.cantidad, 0);
            const tasaDiariaDeConsumo = totalVendido / diasHistoricos;
            
            // Proyectar stock futuro
            const stockActual = producto.cantidad;
            const stockProjection = [];
            
            let stockProyectado = stockActual;
            for (let j = 0; j < projectionLabels.length; j++) {
                stockProyectado = Math.max(0, Math.round(stockProyectado - (tasaDiariaDeConsumo * 7)));
                stockProjection.push(stockProyectado);
            }
            
            // Agregar dataset para este producto
            projectionData.projections.datasets.push({
                label: producto.nombre,
                data: stockProjection,
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length].replace(')', ', 0.1)').replace('rgb', 'rgba'),
                borderDash: [5, 5],
                tension: 0.4
            });
            
            // Calcular riesgo de desabastecimiento
            if (tasaDiariaDeConsumo > 0) {
                const diasParaDesabastecimiento = Math.round(stockActual / tasaDiariaDeConsumo);
                const fechaDesabastecimiento = moment().add(diasParaDesabastecimiento, 'days');
                
                // Sólo incluir si el desabastecimiento ocurriría en menos de 60 días
                if (diasParaDesabastecimiento <= 60) {
                    projectionData.stockoutRisk.push({
                        name: producto.nombre,
                        currentStock: stockActual,
                        estimatedStockoutDate: fechaDesabastecimiento.format('DD/MM/YY'),
                        daysToStockout: diasParaDesabastecimiento
                    });
                }
                
                // Sugerencia de compra (para 30 días de stock)
                const cantidadSugerida = Math.ceil(tasaDiariaDeConsumo * 30);
                projectionData.purchaseForecast.push({
                    name: producto.nombre,
                    suggested: cantidadSugerida,
                    estimatedConsumption: `${tasaDiariaDeConsumo.toFixed(1)} unidades/día`
                });
            }
        }

        // Ordenar riesgos de desabastecimiento
        projectionData.stockoutRisk.sort((a, b) => a.daysToStockout - b.daysToStockout);

        // Generar datos estacionales simulados
        // En un sistema real, esto vendría de un análisis histórico por mes
        const categorias = await Categoria.findAll({
            where: {
                id: {
                    [Op.in]: topProductos.map(p => p.categoria_id).filter(id => id != null)
                }
            }
        });

        const patrones = [
            [80, 85, 90, 95, 100, 110, 115, 120, 100, 95, 90, 85],
            [120, 110, 100, 90, 85, 80, 75, 80, 90, 100, 110, 125],
            [95, 90, 85, 90, 95, 100, 120, 130, 120, 110, 100, 90]
        ];

        // Generar datos estacionales para cada categoría principal
        for (let i = 0; i < Math.min(categorias.length, patrones.length); i++) {
            projectionData.seasonal.datasets.push({
                label: categorias[i].nombre,
                data: patrones[i],
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length].replace(')', ', 0.1)').replace('rgb', 'rgba'),
                fill: true
            });
        }

        return res.status(200).json({
            success: true,
            data: projectionData
        });
    } catch (error) {
        console.error('Error al obtener proyecciones de stock:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener proyecciones de stock',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Exportar datos para Excel o PDF
exports.exportData = async (req, res) => {
    try {
        const { format, reportType } = req.query;
        
        // Validar parámetros
        if (!format || !reportType) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere especificar el formato y tipo de reporte'
            });
        }
        
        // En un caso real, aquí se generaría el archivo en el formato requerido
        // Para esta implementación, simplemente devolvemos una respuesta de éxito
        
        return res.status(200).json({
            success: true,
            message: `Exportación ${format} generada para ${reportType}`,
            data: {
                download_url: `/api/reportes/download/${reportType}_${Date.now()}.${format}`
            }
        });
    } catch (error) {
        console.error('Error al exportar datos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al exportar datos',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Configurar alertas de stock
exports.configureAlerts = async (req, res) => {
    try {
        const { thresholds } = req.body;
        
        // En un sistema real, aquí se guardarían las configuraciones de alertas
        // Para esta implementación, simplemente devolvemos una respuesta de éxito
        
        return res.status(200).json({
            success: true,
            message: 'Configuración de alertas actualizada',
            data: thresholds
        });
    } catch (error) {
        console.error('Error al configurar alertas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al configurar alertas',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};

// Obtener alertas activas
exports.getAlerts = async (req, res) => {
    try {
        // Obtener productos con stock bajo
        const productosStockBajo = await Producto.findAll({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.col('cantidad'),
                        '<=',
                        sequelize.col('stock_minimo')
                    ),
                    { activo: true }
                ]
            },
            include: [
                { model: Categoria, as: 'categoria', attributes: ['nombre'] }
            ],
            order: [
                [sequelize.literal('cantidad / stock_minimo'), 'ASC']
            ]
        });
        
        // Obtener productos con baja rotación (simulado)
        // En un sistema real, esto se basaría en un análisis de movimientos
        const productosBajaRotacion = await Producto.findAll({
            where: {
                cantidad: {
                    [Op.gt]: sequelize.col('stock_minimo')
                },
                activo: true
            },
            order: [['cantidad', 'DESC']],
            limit: 5
        });
        
        // Mapear productos a formato de alerta
        const alertas = {
            stockBajo: productosStockBajo.map(p => ({
                id: p.codigo,
                nombre: p.nombre,
                categoria: p.categoria ? p.categoria.nombre : 'Sin categoría',
                stock_actual: p.cantidad,
                stock_minimo: p.stock_minimo,
                porcentaje: (p.cantidad / p.stock_minimo) * 100,
                tipo: 'stock_bajo',
                mensaje: `Stock por debajo del mínimo (${p.cantidad}/${p.stock_minimo})`
            })),
            bajaRotacion: productosBajaRotacion.map(p => ({
                id: p.codigo,
                nombre: p.nombre,
                stock_actual: p.cantidad,
                tipo: 'baja_rotacion',
                mensaje: 'Producto con poca rotación y alto nivel de stock'
            }))
        };
        
        return res.status(200).json({
            success: true,
            data: alertas
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener alertas',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};