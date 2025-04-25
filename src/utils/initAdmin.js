const { sequelize } = require('./database');
const Usuario = require('../models/usuario.model');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Verificar si ya existe un usuario admin
    const existingAdmin = await Usuario.findOne({ where: { rol: 'admin' } });
    
    if (existingAdmin) {
      console.log('Ya existe al menos un usuario administrador en el sistema');
      return;
    }

    // Crear el usuario administrador
    const adminUser = await Usuario.create({
      username: 'admin',
      password: 'admin123', // El hash se genera automáticamente mediante el hook beforeCreate
      email: 'admin@unika.com',
      nombre_completo: 'Administrador Sistema',
      rol: 'admin'
    });

    console.log('Usuario administrador creado exitosamente');
    console.log('Usuario: admin');
    console.log('Contraseña: admin123');
    console.log('¡IMPORTANTE: Cambie la contraseña después del primer inicio de sesión!');
  } catch (error) {
    console.error('Error al crear usuario administrador:', error);
  }
  // Removed the sequelize.close() call since we need the connection to stay open for the application
}

// Export the function instead of executing it directly
module.exports = createAdminUser;