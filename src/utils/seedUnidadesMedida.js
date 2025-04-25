const { UnidadMedida } = require('./database');

const unidadesBase = [
  // Unidades de masa
  {
    nombre: 'Kilogramo',
    abreviatura: 'kg',
    tipo: 'peso',
    factor_conversion: 1,
    unidad_base: true
  },
  {
    nombre: 'Gramo',
    abreviatura: 'g',
    tipo: 'peso',
    factor_conversion: 0.001,
    unidad_base_id: 1
  },
  {
    nombre: 'Libra',
    abreviatura: 'lb',
    tipo: 'peso',
    factor_conversion: 0.45359237,
    unidad_base_id: 1
  },

  // Unidades de volumen
  {
    nombre: 'Litro',
    abreviatura: 'L',
    tipo: 'volumen',
    factor_conversion: 1,
    unidad_base: true
  },
  {
    nombre: 'Mililitro',
    abreviatura: 'ml',
    tipo: 'volumen',
    factor_conversion: 0.001,
    unidad_base_id: 4
  },
  {
    nombre: 'Galón',
    abreviatura: 'gal',
    tipo: 'volumen',
    factor_conversion: 3.78541,
    unidad_base_id: 4
  },

  // Unidades de longitud
  {
    nombre: 'Metro',
    abreviatura: 'm',
    tipo: 'longitud',
    factor_conversion: 1,
    unidad_base: true
  },
  {
    nombre: 'Centímetro',
    abreviatura: 'cm',
    tipo: 'longitud',
    factor_conversion: 0.01,
    unidad_base_id: 7
  },
  {
    nombre: 'Pulgada',
    abreviatura: 'in',
    tipo: 'longitud',
    factor_conversion: 0.0254,
    unidad_base_id: 7
  },

  // Unidades unitarias
  {
    nombre: 'Unidad',
    abreviatura: 'u',
    tipo: 'unidad',
    factor_conversion: 1,
    unidad_base: true
  },
  {
    nombre: 'Pieza',
    abreviatura: 'pza',
    tipo: 'unidad',
    factor_conversion: 1,
    unidad_base_id: 10
  },
  {
    nombre: 'Docena',
    abreviatura: 'doc',
    tipo: 'unidad',
    factor_conversion: 12,
    unidad_base_id: 10
  }
];

async function seedUnidadesMedida() {
  try {
    console.log('Iniciando la carga de unidades de medida básicas...');
    
    for (const unidad of unidadesBase) {
      await UnidadMedida.findOrCreate({
        where: { abreviatura: unidad.abreviatura },
        defaults: unidad
      });
    }

    console.log('Unidades de medida básicas cargadas correctamente');
  } catch (error) {
    console.error('Error al cargar unidades de medida:', error);
    throw error;
  }
}

module.exports = seedUnidadesMedida;