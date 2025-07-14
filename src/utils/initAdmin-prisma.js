const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔍 Verificando usuarios administradores existentes...');
    
    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.usuario.findFirst({ 
      where: { rol: 'admin' } 
    });
    
    if (existingAdmin) {
      console.log('✅ Ya existe al menos un usuario administrador en el sistema:');
      console.log(`👤 Usuario: ${existingAdmin.username}`);
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👨‍💼 Nombre: ${existingAdmin.nombre_completo}`);
      return;
    }

    console.log('🔧 Creando usuario administrador...');

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Crear el usuario administrador
    const adminUser = await prisma.usuario.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@unika.com',
        nombre_completo: 'Administrador Sistema',
        rol: 'admin',
        activo: true
      }
    });

    console.log('\n🎉 ¡Usuario administrador creado exitosamente!\n');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('👤 Usuario: admin');
    console.log('🔑 Contraseña: admin123');
    console.log('📧 Email: admin@unika.com');
    console.log('\n⚠️  IMPORTANTE: ¡Cambie la contraseña después del primer inicio de sesión!\n');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Si se ejecuta directamente (no importado)
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;
