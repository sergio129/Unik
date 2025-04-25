/**
 * Migration to add nit column to proveedores table
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

async function up() {
  try {
    // Check if nit column exists
    const [results] = await sequelize.query(
      'SHOW COLUMNS FROM proveedores LIKE "nit"'
    );
    
    // If column doesn't exist, add it
    if (results.length === 0) {
      await sequelize.query(
        'ALTER TABLE proveedores ADD COLUMN nit VARCHAR(30) UNIQUE'
      );
      console.log('Added nit column to proveedores table');
    } else {
      console.log('nit column already exists in proveedores table');
    }

    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

async function down() {
  try {
    await sequelize.query(
      'ALTER TABLE proveedores DROP COLUMN nit'
    );
    console.log('Removed nit column from proveedores table');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

module.exports = { up, down };