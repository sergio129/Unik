/**
 * Migración para crear la tabla 'categorias'
 */
async function initCategorias(sequelize) {
  try {
    console.log('Creando tabla de categorías...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT TRUE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Tabla de categorías creada exitosamente');
    
    // Verificar si hay categorías, si no, crear algunas por defecto
    const [categorias] = await sequelize.query('SELECT COUNT(*) as count FROM categorias');
    
    if (categorias[0].count === 0) {
      console.log('Creando categorías por defecto...');
      
      await sequelize.query(`
        INSERT INTO categorias (nombre, descripcion) VALUES 
        ('General', 'Categoría general para productos'),
        ('Alimentos', 'Productos alimenticios'),
        ('Bebidas', 'Bebidas de todo tipo'),
        ('Limpieza', 'Productos de limpieza'),
        ('Papelería', 'Artículos de papelería');
      `);
      
      console.log('Categorías por defecto creadas exitosamente');
    }
    
    return true;
  } catch (error) {
    console.error('Error al crear tabla de categorías:', error);
    throw error;
  }
}

module.exports = initCategorias;