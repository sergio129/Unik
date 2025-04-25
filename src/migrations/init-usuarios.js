/**
 * Migración para crear la tabla 'usuarios'
 */
async function initUsuarios(sequelize) {
  try {
    console.log('Creando tabla de usuarios...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        nombre_completo VARCHAR(100) NOT NULL,
        rol ENUM('admin', 'vendedor', 'inventario') NOT NULL DEFAULT 'vendedor',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP NULL,
        UNIQUE KEY uk_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Tabla de usuarios creada exitosamente');

    // Verificar si ya existe algún usuario administrador
    const [admins] = await sequelize.query('SELECT COUNT(*) as count FROM usuarios WHERE rol = "admin"');
    
    if (admins[0].count === 0) {
      console.log('Creando usuario administrador por defecto...');
      
      // La contraseña es 'admin123' (bcrypt hash)
      await sequelize.query(`
        INSERT INTO usuarios (username, password, email, nombre_completo, rol) VALUES 
        ('admin', '$2a$10$N.1Uep0iJUMXVrGgNVR5UOwkQ2nKdIc.GR2qkItcbWjPTSW4RhZIO', 'admin@unika.com', 'Administrador', 'admin')
      `);
      
      console.log('Usuario administrador creado exitosamente');
    }
    
    return true;
  } catch (error) {
    console.error('Error al crear tabla de usuarios:', error);
    throw error;
  }
}

module.exports = initUsuarios;