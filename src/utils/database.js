const { Sequelize } = require('sequelize');
require('dotenv').config();

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    // Configuramos el logging para que sea silencioso o solo muestre errores
    logging: process.env.NODE_ENV === 'development' ? 
      (sql) => {
        // Solo mostrar errores o mensajes importantes
        if (sql.includes('ERROR') || sql.includes('error')) {
          console.log(sql);
        }
      } : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection
};