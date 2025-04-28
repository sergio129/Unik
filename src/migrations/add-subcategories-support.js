// Migración para añadir soporte para subcategorías
const migration = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Iniciando migración: Añadiendo soporte para subcategorías...');
      
      // Verificar si la columna categoria_padre_id ya existe
      const tableInfo = await queryInterface.describeTable('categorias');
      
      if (!tableInfo.categoria_padre_id) {
        // Añadir columna categoria_padre_id
        await queryInterface.addColumn('categorias', 'categoria_padre_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'categorias',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        
        console.log('Columna categoria_padre_id añadida con éxito');
      } else {
        console.log('La columna categoria_padre_id ya existe, saltando...');
      }

      if (!tableInfo.nivel) {
        // Añadir columna nivel
        await queryInterface.addColumn('categorias', 'nivel', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Nivel jerárquico de la categoría (1 para principales, >1 para subcategorías)'
        });
        
        console.log('Columna nivel añadida con éxito');
      } else {
        console.log('La columna nivel ya existe, saltando...');
      }
      
      // Actualizar todas las categorías existentes para establecer nivel=1
      await queryInterface.sequelize.query(
        'UPDATE categorias SET nivel = 1 WHERE nivel IS NULL'
      );
      
      console.log('Migración completada: Soporte para subcategorías añadido');
      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración de subcategorías:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Revirtiendo migración: Eliminando soporte para subcategorías...');
      
      // Eliminar la referencia de clave foránea primero
      await queryInterface.removeConstraint(
        'categorias',
        'categorias_categoria_padre_id_fkey' // Nombre estándar de la restricción
      ).catch(err => {
        console.log('No se pudo eliminar la restricción, probablemente no existe');
      });
      
      // Eliminar las columnas
      await queryInterface.removeColumn('categorias', 'categoria_padre_id');
      await queryInterface.removeColumn('categorias', 'nivel');
      
      console.log('Migración revertida: Soporte para subcategorías eliminado');
      return Promise.resolve();
    } catch (error) {
      console.error('Error al revertir la migración de subcategorías:', error);
      return Promise.reject(error);
    }
  }
};

module.exports = migration;