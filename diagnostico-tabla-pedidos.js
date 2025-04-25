/**
 * Script para diagnosticar la estructura exacta de la tabla Pedidos
 * y determinar el tipo de datos de la columna ID
 */

const { sequelize } = require('./src/utils/database');

async function diagnosticarTablaPedidos() {
  try {
    console.log('Iniciando diagnóstico de la tabla Pedidos...\n');

    // Verificar si la tabla existe
    const [tablas] = await sequelize.query("SHOW TABLES LIKE 'Pedidos'");
    if (tablas.length === 0) {
      console.error('La tabla Pedidos no existe en la base de datos');
      return;
    }

    // Obtener información detallada sobre la estructura de la tabla
    const [columnas] = await sequelize.query('SHOW COLUMNS FROM Pedidos');
    
    console.log('Estructura de columnas en la tabla Pedidos:');
    console.log('------------------------------------------');
    columnas.forEach(col => {
      console.log(`Nombre: ${col.Field}`);
      console.log(`Tipo: ${col.Type}`);
      console.log(`Nulo permitido: ${col.Null}`);
      console.log(`Clave: ${col.Key}`);
      console.log(`Valor predeterminado: ${col.Default || 'NULL'}`);
      console.log(`Extra: ${col.Extra}`);
      console.log('------------------------------------------');
    });

    // Obtener información sobre todas las claves foráneas que referencian la tabla Pedidos
    const [referencias] = await sequelize.query(`
      SELECT 
        TABLE_NAME as tabla_referenciadora,
        COLUMN_NAME as columna_referenciadora,
        REFERENCED_TABLE_NAME as tabla_referenciada,
        REFERENCED_COLUMN_NAME as columna_referenciada,
        CONSTRAINT_NAME as nombre_restriccion
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_NAME = 'Pedidos'
        AND TABLE_SCHEMA = DATABASE()
    `);

    console.log('\nTablas que referencian a Pedidos:');
    console.log('------------------------------------------');
    
    if (referencias.length === 0) {
      console.log('No hay tablas que referencien a la tabla Pedidos');
    } else {
      referencias.forEach(ref => {
        console.log(`Tabla: ${ref.tabla_referenciadora}`);
        console.log(`Columna: ${ref.columna_referenciadora}`);
        console.log(`Referencia a columna: ${ref.columna_referenciada}`);
        console.log(`Nombre de restricción: ${ref.nombre_restriccion}`);
        console.log('------------------------------------------');
      });
    }

    // Verificar la existencia de la tabla SeguimientoPedidos
    const [tablaSeguimiento] = await sequelize.query("SHOW TABLES LIKE 'SeguimientoPedidos'");
    if (tablaSeguimiento.length > 0) {
      const [columnasSeguimiento] = await sequelize.query('SHOW COLUMNS FROM SeguimientoPedidos');
      
      console.log('\nEstructura de columnas en la tabla SeguimientoPedidos:');
      console.log('------------------------------------------');
      columnasSeguimiento.forEach(col => {
        console.log(`Nombre: ${col.Field}`);
        console.log(`Tipo: ${col.Type}`);
        console.log(`Nulo permitido: ${col.Null}`);
        console.log(`Clave: ${col.Key}`);
        console.log(`Valor predeterminado: ${col.Default || 'NULL'}`);
        console.log(`Extra: ${col.Extra}`);
        console.log('------------------------------------------');
      });
    }

  } catch (error) {
    console.error('Error al diagnosticar la tabla Pedidos:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar el diagnóstico
diagnosticarTablaPedidos()
  .then(() => {
    console.log('\nDiagnóstico completado.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error crítico:', err);
    process.exit(1);
  });