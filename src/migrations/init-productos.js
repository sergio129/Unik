/**
 * Migración para alterar la tabla de productos existente
 */
async function initProductos(sequelize) {
  try {
    console.log('Verificando y modificando tabla de productos existente...');
    
    // Verificar si la tabla existe
    const [tablaExiste] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'productos'
    `);
    
    if (tablaExiste[0].count === 0) {
      console.log('La tabla de productos no existe. Creando tabla...');
      
      // Crear la tabla con la estructura solicitada
      await sequelize.query(`
        CREATE TABLE productos (
          codigo VARCHAR(50) PRIMARY KEY,
          lote VARCHAR(50) NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          precio DECIMAL(10, 2) NOT NULL,
          cantidad INT NOT NULL,
          peso DECIMAL(10, 2),
          volumen DECIMAL(10, 2),
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Tabla de productos creada exitosamente');
    }
    
    // Verificar si las columnas nuevas existen y agregarlas si no
    console.log('Verificando columnas adicionales necesarias...');

    // Verificar columna categoria_id
    const [categoriaIdExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'categoria_id'
    `);
    
    if (categoriaIdExists[0].count === 0) {
      console.log('Agregando columna categoria_id...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN categoria_id INT NULL,
        ADD CONSTRAINT fk_categoria 
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
      `);
    }
    
    // Verificar columna stock_minimo
    const [stockMinimoExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'stock_minimo'
    `);
    
    if (stockMinimoExists[0].count === 0) {
      console.log('Agregando columna stock_minimo...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN stock_minimo INT NOT NULL DEFAULT 5
      `);
    }
    
    // Verificar columna activo
    const [activoExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'activo'
    `);
    
    if (activoExists[0].count === 0) {
      console.log('Agregando columna activo...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE
      `);
    }
    
    // Verificar columna imagen_url
    const [imagenExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'imagen_url'
    `);
    
    if (imagenExists[0].count === 0) {
      console.log('Agregando columna imagen_url...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN imagen_url VARCHAR(255) NULL
      `);
    }
    
    // Verificar columna unidad_medida
    const [unidadMedidaExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'unidad_medida'
    `);
    
    if (unidadMedidaExists[0].count === 0) {
      console.log('Agregando columna unidad_medida...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidad'
      `);
    }
    
    // Verificar columna precio_compra
    const [precioCompraExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'precio_compra'
    `);
    
    if (precioCompraExists[0].count === 0) {
      console.log('Agregando columna precio_compra...');
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN precio_compra DECIMAL(10, 2) NULL
      `);
    }
    
    // Para mantener la compatibilidad con el modelo de Sequelize, renombrar cantidad a stock si es necesario
    // Primero vemos si existe stock
    const [stockExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'stock'
    `);
    
    // Si no existe stock pero sí existe cantidad, creamos un alias/vista
    if (stockExists[0].count === 0) {
      console.log('Se utilizará la columna cantidad como stock');
      // No hacemos cambio físico, lo manejaremos en el modelo
    }
    
    console.log('La tabla de productos ha sido actualizada correctamente');
    
    return true;
  } catch (error) {
    console.error('Error al actualizar tabla de productos:', error);
    throw error;
  }
}

module.exports = initProductos;