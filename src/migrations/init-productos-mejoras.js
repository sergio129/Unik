const { DataTypes } = require('sequelize');

/**
 * Migración para las mejoras de productos
 */
async function initProductosMejoras(sequelize) {
  try {
    console.log('Creando tablas para mejoras de productos...');
    
    // Crear tabla de unidades de medida
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS unidades_medida (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        abreviatura VARCHAR(10) NOT NULL,
        factor_conversion DECIMAL(10,4) DEFAULT 1,
        unidad_base_id INT,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_nombre (nombre),
        UNIQUE KEY uk_abreviatura (abreviatura),
        FOREIGN KEY (unidad_base_id) REFERENCES unidades_medida(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Crear tabla de códigos de barras
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS codigos_barras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(100) NOT NULL,
        producto_codigo VARCHAR(50) NOT NULL,
        tipo ENUM('EAN13', 'CODE128', 'QR', 'CUSTOM') NOT NULL DEFAULT 'EAN13',
        principal BOOLEAN DEFAULT false,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_codigo (codigo),
        FOREIGN KEY (producto_codigo) REFERENCES productos(codigo) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Crear tabla de historial de precios
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS historial_precios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto_codigo VARCHAR(50) NOT NULL,
        precio_anterior DECIMAL(10,2),
        precio_nuevo DECIMAL(10,2) NOT NULL,
        tipo_precio ENUM('compra', 'venta') NOT NULL,
        motivo VARCHAR(255),
        usuario_id INT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_codigo) REFERENCES productos(codigo) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Crear tabla de productos compuestos (kits)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS productos_compuestos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto_padre_codigo VARCHAR(50) NOT NULL,
        producto_hijo_codigo VARCHAR(50) NOT NULL,
        cantidad DECIMAL(10,3) NOT NULL DEFAULT 1,
        unidad_medida_id INT NOT NULL,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_padre_codigo) REFERENCES productos(codigo) ON DELETE CASCADE,
        FOREIGN KEY (producto_hijo_codigo) REFERENCES productos(codigo) ON DELETE CASCADE,
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Agregar columnas necesarias a la tabla de productos
    const [tipoProductoExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'tipo_producto'
    `);

    if (tipoProductoExists[0].count === 0) {
      await sequelize.query(`
        ALTER TABLE productos 
        ADD COLUMN tipo_producto ENUM('simple', 'compuesto') NOT NULL DEFAULT 'simple',
        ADD COLUMN unidad_medida_id INT,
        ADD FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id);
      `);
    }

    // Insertar unidades de medida básicas
    await sequelize.query(`
      INSERT IGNORE INTO unidades_medida (nombre, abreviatura) VALUES 
      ('Unidad', 'un'),
      ('Kilogramo', 'kg'),
      ('Gramo', 'g'),
      ('Litro', 'l'),
      ('Mililitro', 'ml'),
      ('Metro', 'm'),
      ('Centímetro', 'cm'),
      ('Pieza', 'pza');
    `);

    console.log('Mejoras de productos instaladas correctamente');
  } catch (error) {
    console.error('Error al crear mejoras de productos:', error);
    throw error;
  }
}

module.exports = initProductosMejoras;