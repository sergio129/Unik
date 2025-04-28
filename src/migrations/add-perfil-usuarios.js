/**
 * Migración para añadir campos de perfil extendido a la tabla 'usuarios'
 */
async function addPerfilUsuarios(sequelize) {
  try {
    console.log('Añadiendo campos de perfil extendido a la tabla de usuarios...');
    
    await sequelize.query(`
      ALTER TABLE usuarios 
      ADD COLUMN telefono VARCHAR(20) NULL,
      ADD COLUMN cargo VARCHAR(100) NULL,
      ADD COLUMN departamento VARCHAR(100) NULL,
      ADD COLUMN fecha_nacimiento DATE NULL,
      ADD COLUMN direccion VARCHAR(255) NULL,
      ADD COLUMN foto_perfil VARCHAR(255) NULL,
      ADD COLUMN biografia TEXT NULL,
      ADD COLUMN redes_sociales JSON NULL,
      ADD COLUMN habilidades JSON NULL,
      ADD COLUMN preferencias JSON NULL
    `);
    
    console.log('Campos de perfil añadidos exitosamente');
    
    return true;
  } catch (error) {
    console.error('Error al añadir campos de perfil a usuarios:', error);
    throw error;
  }
}

module.exports = addPerfilUsuarios;