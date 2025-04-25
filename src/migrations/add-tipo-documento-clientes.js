const { QueryTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

async function up() {
  try {
    // Añadir tipo_documento si no existe
    const [resTipoDoc] = await sequelize.query(
      "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'tipo_documento'",
      { type: QueryTypes.SELECT }
    );

    if (resTipoDoc.count === 0) {
      console.log('Añadiendo columna tipo_documento a la tabla clientes...');
      await sequelize.query(
        `ALTER TABLE clientes 
         ADD COLUMN tipo_documento ENUM('CC', 'CE', 'NIT', 'TI', 'PP') 
         COMMENT 'CC=Cédula de Ciudadanía, CE=Cédula de Extranjería, NIT=Número de Identificación Tributaria, TI=Tarjeta de Identidad, PP=Pasaporte'`
      );
      console.log('Columna tipo_documento añadida exitosamente.');
    } else {
      console.log('La columna tipo_documento ya existe en la tabla clientes.');
    }

    // Añadir numero_documento si no existe
    const [resNumDoc] = await sequelize.query(
      "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'numero_documento'",
      { type: QueryTypes.SELECT }
    );

    if (resNumDoc.count === 0) {
      console.log('Añadiendo columna numero_documento a la tabla clientes...');
      await sequelize.query(
        `ALTER TABLE clientes 
         ADD COLUMN numero_documento VARCHAR(30) NOT NULL UNIQUE COMMENT 'Número del documento según tipo_documento'`
      );
      console.log('Columna numero_documento añadida exitosamente.');
    } else {
      console.log('La columna numero_documento ya existe en la tabla clientes.');
    }

  } catch (error) {
    console.error('Error al añadir columnas:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('Eliminando columnas tipo_documento y numero_documento de la tabla clientes...');
    await sequelize.query('ALTER TABLE clientes DROP COLUMN IF EXISTS tipo_documento');
    await sequelize.query('ALTER TABLE clientes DROP COLUMN IF EXISTS numero_documento');
    console.log('Columnas eliminadas exitosamente.');
  } catch (error) {
    console.error('Error al eliminar columnas:', error);
    throw error;
  }
}

module.exports = { up, down };
