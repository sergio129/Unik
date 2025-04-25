/**
 * Migración para crear la tabla 'movimientos_inventario'
 */
async function initMovimientos(sequelize) {
  try {
    console.log('Creando tabla de movimientos de inventario...');
    
    // Primero verificamos la definición exacta de la columna 'codigo' en la tabla 'productos'
    const [columnInfo] = await sequelize.query(`
      SHOW FULL COLUMNS FROM productos WHERE Field = 'codigo';
    `);
    
    if (columnInfo && columnInfo.length > 0) {
      const codigoColumnInfo = columnInfo[0];
      console.log(`Información de la columna 'codigo': ${JSON.stringify(codigoColumnInfo)}`);
      
      // Usamos la misma definición de tipo, CHARACTER SET y COLLATE
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS movimientos_inventario (
          id INT AUTO_INCREMENT PRIMARY KEY,
          producto_codigo VARCHAR(50) CHARACTER SET ${codigoColumnInfo.Collation.split('_')[0]} COLLATE ${codigoColumnInfo.Collation} NOT NULL,
          tipo_movimiento ENUM('entrada', 'salida', 'ajuste') NOT NULL,
          cantidad INT NOT NULL,
          stock_anterior INT NOT NULL,
          stock_nuevo INT NOT NULL,
          motivo VARCHAR(255),
          usuario_id INT NOT NULL,
          documento_referencia VARCHAR(100),
          precio_unitario DECIMAL(10, 2),
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (producto_codigo) REFERENCES productos(codigo) ON DELETE RESTRICT,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      // Alternativa si no podemos obtener la información de la columna
      console.log('No se pudo obtener información de la columna codigo. Usando definición alternativa...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS movimientos_inventario (
          id INT AUTO_INCREMENT PRIMARY KEY,
          producto_codigo VARCHAR(50) NOT NULL,
          tipo_movimiento ENUM('entrada', 'salida', 'ajuste') NOT NULL,
          cantidad INT NOT NULL,
          stock_anterior INT NOT NULL,
          stock_nuevo INT NOT NULL,
          motivo VARCHAR(255),
          usuario_id INT NOT NULL,
          documento_referencia VARCHAR(100),
          precio_unitario DECIMAL(10, 2),
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_producto_codigo (producto_codigo),
          INDEX idx_usuario_id (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      // Agregamos las relaciones después de crear la tabla, si es posible
      try {
        await sequelize.query(`
          ALTER TABLE movimientos_inventario 
          ADD CONSTRAINT fk_movimientos_productos 
          FOREIGN KEY (producto_codigo) 
          REFERENCES productos(codigo) 
          ON DELETE RESTRICT;
        `);
        
        await sequelize.query(`
          ALTER TABLE movimientos_inventario 
          ADD CONSTRAINT fk_movimientos_usuarios 
          FOREIGN KEY (usuario_id) 
          REFERENCES usuarios(id) 
          ON DELETE CASCADE;
        `);
      } catch (alterError) {
        console.error('Error al crear las relaciones:', alterError);
        console.log('La tabla fue creada pero sin restricciones de clave foránea.');
      }
    }
    
    console.log('Tabla de movimientos de inventario creada exitosamente');
    
    return true;
  } catch (error) {
    console.error('Error al crear tabla de movimientos de inventario:', error);
    throw error;
  }
}

module.exports = initMovimientos;