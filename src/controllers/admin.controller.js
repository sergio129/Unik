/**
 * Controlador para funciones administrativas
 * Incluye limpieza de base de datos y otras funciones administrativas
 */

const db = require('../config/db.config');
const { sequelize } = db;

/**
 * Limpieza completa de base de datos
 * Elimina todos los datos relacionados con productos, pedidos y transacciones
 */
exports.limpiarBaseDatos = async (req, res) => {
  // Verificar que el usuario es administrador
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      mensaje: 'No tiene permisos para realizar esta acción'
    });
  }

  // Verificar la confirmación
  const { confirmacion, codigo_seguridad } = req.body;
  if (confirmacion !== 'CONFIRMAR_BORRADO_TOTAL') {
    return res.status(400).json({
      success: false,
      mensaje: 'La confirmación no es correcta'
    });
  }

  // Verificar código de seguridad (puedes implementar la lógica que necesites)
  // Esta es una validación simple, puedes hacer algo más complejo según tus requisitos
  if (!codigo_seguridad || codigo_seguridad !== process.env.ADMIN_SECURITY_CODE) {
    return res.status(400).json({
      success: false,
      mensaje: 'El código de seguridad no es correcto'
    });
  }

  const transaction = await sequelize.transaction();
  const resultados = {};

  try {
    // Desactivar restricciones de clave foránea temporalmente
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

    // 1. Eliminar detalles de pedidos
    const [, detallesPedido] = await sequelize.query('DELETE FROM detalles_pedido', { transaction });
    resultados.detalles_pedido = detallesPedido;

    // 2. Eliminar pedidos
    const [, pedidos] = await sequelize.query('DELETE FROM pedidos', { transaction });
    resultados.pedidos = pedidos;

    // 3. Eliminar historial de precios
    const [, historialPrecios] = await sequelize.query('DELETE FROM historial_precios', { transaction });
    resultados.historial_precios = historialPrecios;

    // 4. Eliminar movimientos de inventario (usando el nombre correcto de la tabla)
    const [, movimientos] = await sequelize.query('DELETE FROM movimientos_inventario', { transaction });
    resultados.movimientos_inventario = movimientos;

    // 5. Eliminar códigos de barras
    const [, codigosBarras] = await sequelize.query('DELETE FROM codigos_barras', { transaction });
    resultados.codigos_barras = codigosBarras;

    // 6. Eliminar productos
    const [, productos] = await sequelize.query('DELETE FROM productos', { transaction });
    resultados.productos = productos;

    // Reiniciar los contadores de AUTO_INCREMENT
    await sequelize.query('ALTER TABLE detalles_pedido AUTO_INCREMENT = 1', { transaction });
    await sequelize.query('ALTER TABLE pedidos AUTO_INCREMENT = 1', { transaction });
    await sequelize.query('ALTER TABLE historial_precios AUTO_INCREMENT = 1', { transaction });
    await sequelize.query('ALTER TABLE movimientos_inventario AUTO_INCREMENT = 1', { transaction });
    await sequelize.query('ALTER TABLE codigos_barras AUTO_INCREMENT = 1', { transaction });
    await sequelize.query('ALTER TABLE productos AUTO_INCREMENT = 1', { transaction });

    // Volver a activar restricciones de clave foránea
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

    // Confirmar la transacción
    await transaction.commit();

    // Registrar la actividad
    if (req.registrarActividad) {
      req.registrarActividad('Limpió completamente la base de datos', 'admin');
    }

    return res.json({
      success: true,
      mensaje: 'Base de datos limpiada correctamente',
      resultado: resultados
    });
  } catch (error) {
    // Si hay error, deshacer la transacción
    await transaction.rollback();
    console.error('Error al limpiar la base de datos:', error);
    return res.status(500).json({
      success: false,
      mensaje: 'Error al limpiar la base de datos',
      error: error.message
    });
  }
};

/**
 * Limpieza selectiva de productos 
 * Permite desactivar productos o eliminar los que no están en uso
 */
exports.limpiarProductos = async (req, res) => {
  // Verificar que el usuario es administrador
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      mensaje: 'No tiene permisos para realizar esta acción'
    });
  }

  // Verificar la confirmación
  const { confirmacion, tipo } = req.body;
  if (confirmacion !== 'CONFIRMAR_BORRADO_PRODUCTOS') {
    return res.status(400).json({
      success: false,
      mensaje: 'La confirmación no es correcta'
    });
  }

  const transaction = await sequelize.transaction();
  const resultados = {};

  try {
    if (tipo === 'deactivate') {
      // Opción 1: Desactivar todos los productos y establecer stock a 0
      const [, result] = await sequelize.query(
        'UPDATE productos SET activo = 0, stock = 0',
        { transaction }
      );
      
      resultados.desactivados = result;
      resultados.eliminados = 0;
      resultados.no_afectados = 0;
    } else if (tipo === 'selective') {
      // Opción 2: Eliminación selectiva
      // Paso 1: Identificar productos que están en uso en pedidos
      const [productosEnUso] = await sequelize.query(`
        SELECT DISTINCT p.codigo 
        FROM productos p
        INNER JOIN detalles_pedido dp ON p.codigo = dp.producto_codigo
      `, { transaction });
      
      const codigosEnUso = productosEnUso.map(p => p.codigo);
      
      // Paso 2: Desactivar productos en uso (no eliminarlos)
      let resultDesactivados = 0;
      if (codigosEnUso.length > 0) {
        const [, result] = await sequelize.query(`
          UPDATE productos 
          SET activo = 0, stock = 0 
          WHERE codigo IN (${codigosEnUso.map(c => `'${c}'`).join(',')})
        `, { transaction });
        
        resultDesactivados = result;
      }
      
      // Paso 3: Eliminar productos que NO están en uso
      const [, resultEliminados] = await sequelize.query(`
        DELETE FROM productos 
        WHERE codigo NOT IN (
          SELECT DISTINCT producto_codigo FROM detalles_pedido
        )
      `, { transaction });
      
      resultados.desactivados = resultDesactivados;
      resultados.eliminados = resultEliminados;
      resultados.no_afectados = 0;
    }

    // Confirmar la transacción
    await transaction.commit();

    // Registrar la actividad
    if (req.registrarActividad) {
      req.registrarActividad(`Realizó limpieza de productos - tipo: ${tipo}`, 'admin');
    }

    return res.json({
      success: true,
      mensaje: 'Limpieza de productos completada correctamente',
      resultado: resultados
    });
  } catch (error) {
    // Si hay error, deshacer la transacción
    await transaction.rollback();
    console.error('Error al limpiar productos:', error);
    return res.status(500).json({
      success: false,
      mensaje: 'Error al limpiar productos',
      error: error.message
    });
  }
};