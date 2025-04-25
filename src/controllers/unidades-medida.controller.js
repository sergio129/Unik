const { UnidadMedida } = require('../utils/database');
const { sequelize } = require('../utils/database');
const { Op } = require('sequelize');

class UnidadesMedidaController {
  static async getAll(req, res) {
    try {
      const { tipo } = req.query;
      let where = { activo: true };
      
      if (tipo) {
        where.tipo = tipo;
      }

      const unidades = await UnidadMedida.findAll({
        where,
        include: [
          {
            model: UnidadMedida,
            as: 'unidad_base',
            attributes: ['id', 'nombre', 'abreviatura']
          }
        ],
        order: [['nombre', 'ASC']]
      });

      res.json({
        success: true,
        data: unidades
      });
    } catch (error) {
      console.error('Error al obtener unidades de medida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener unidades de medida'
      });
    }
  }

  static async getOne(req, res) {
    try {
      const { id } = req.params;
      const unidad = await UnidadMedida.findByPk(id, {
        include: [
          {
            model: UnidadMedida,
            as: 'unidad_base',
            attributes: ['id', 'nombre', 'abreviatura']
          },
          {
            model: UnidadMedida,
            as: 'conversiones',
            attributes: ['id', 'nombre', 'abreviatura', 'factor_conversion']
          }
        ]
      });

      if (!unidad) {
        return res.status(404).json({
          success: false,
          message: 'Unidad de medida no encontrada'
        });
      }

      res.json({
        success: true,
        data: unidad
      });
    } catch (error) {
      console.error('Error al obtener unidad de medida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener unidad de medida'
      });
    }
  }

  static async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { nombre, abreviatura, tipo, factor_conversion, unidad_base_id } = req.body;

      // Validar que no exista otra unidad con el mismo nombre o abreviatura
      const existente = await UnidadMedida.findOne({
        where: {
          [Op.or]: [
            { nombre },
            { abreviatura }
          ]
        }
      });

      if (existente) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Ya existe una unidad con ese nombre o abreviatura'
        });
      }

      // Si se especifica una unidad base, validar que exista y sea del mismo tipo
      if (unidad_base_id) {
        const unidadBase = await UnidadMedida.findByPk(unidad_base_id);
        if (!unidadBase || unidadBase.tipo !== tipo) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'La unidad base debe ser del mismo tipo'
          });
        }
      }

      const unidad = await UnidadMedida.create({
        nombre,
        abreviatura,
        tipo,
        factor_conversion: factor_conversion || 1,
        unidad_base_id,
        activo: true
      }, { transaction: t });

      await t.commit();
      res.status(201).json({
        success: true,
        data: unidad
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al crear unidad de medida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear unidad de medida'
      });
    }
  }

  static async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { nombre, abreviatura, tipo, factor_conversion, unidad_base_id, activo } = req.body;

      const unidad = await UnidadMedida.findByPk(id);
      if (!unidad) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Unidad de medida no encontrada'
        });
      }

      // Validar que no exista otra unidad con el mismo nombre o abreviatura
      const existente = await UnidadMedida.findOne({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { nombre },
                { abreviatura }
              ]
            },
            {
              id: { [Op.ne]: id }
            }
          ]
        }
      });

      if (existente) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra unidad con ese nombre o abreviatura'
        });
      }

      // Si se cambia la unidad base, validar que exista y sea del mismo tipo
      if (unidad_base_id && unidad_base_id !== unidad.unidad_base_id) {
        const unidadBase = await UnidadMedida.findByPk(unidad_base_id);
        if (!unidadBase || unidadBase.tipo !== tipo) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'La unidad base debe ser del mismo tipo'
          });
        }
      }

      await unidad.update({
        nombre: nombre || unidad.nombre,
        abreviatura: abreviatura || unidad.abreviatura,
        tipo: tipo || unidad.tipo,
        factor_conversion: factor_conversion || unidad.factor_conversion,
        unidad_base_id: unidad_base_id || unidad.unidad_base_id,
        activo: activo !== undefined ? activo : unidad.activo
      }, { transaction: t });

      await t.commit();
      res.json({
        success: true,
        data: unidad
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al actualizar unidad de medida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar unidad de medida'
      });
    }
  }

  static async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      // Verificar si hay productos usando esta unidad
      const productosUsando = await UnidadMedida.count({
        where: { unidad_base_id: id }
      });

      if (productosUsando > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar la unidad porque está siendo usada por otros productos'
        });
      }

      const resultado = await UnidadMedida.destroy({
        where: { id }
      }, { transaction: t });

      if (!resultado) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Unidad de medida no encontrada'
        });
      }

      await t.commit();
      res.json({
        success: true,
        message: 'Unidad de medida eliminada correctamente'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al eliminar unidad de medida:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar unidad de medida'
      });
    }
  }

  static async getConversiones(req, res) {
    try {
      const { id } = req.params;
      const unidad = await UnidadMedida.findByPk(id, {
        include: [
          {
            model: UnidadMedida,
            as: 'conversiones',
            attributes: ['id', 'nombre', 'abreviatura', 'factor_conversion']
          }
        ]
      });

      if (!unidad) {
        return res.status(404).json({
          success: false,
          message: 'Unidad de medida no encontrada'
        });
      }

      res.json({
        success: true,
        data: unidad.conversiones
      });
    } catch (error) {
      console.error('Error al obtener conversiones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener conversiones'
      });
    }
  }

  static async agregarConversion(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { unidad_destino_id, factor_conversion } = req.body;

      // Validar que las unidades existan y sean del mismo tipo
      const [unidadOrigen, unidadDestino] = await Promise.all([
        UnidadMedida.findByPk(id),
        UnidadMedida.findByPk(unidad_destino_id)
      ]);

      if (!unidadOrigen || !unidadDestino) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Una o ambas unidades no existen'
        });
      }

      if (unidadOrigen.tipo !== unidadDestino.tipo) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Las unidades deben ser del mismo tipo'
        });
      }

      // Actualizar factor de conversión de la unidad destino
      await unidadDestino.update({
        unidad_base_id: id,
        factor_conversion
      }, { transaction: t });

      await t.commit();
      res.json({
        success: true,
        data: unidadDestino
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al agregar conversión:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar conversión'
      });
    }
  }

  static async actualizarConversion(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id, conversionId } = req.params;
      const { factor_conversion } = req.body;

      const unidadDestino = await UnidadMedida.findOne({
        where: {
          id: conversionId,
          unidad_base_id: id
        }
      });

      if (!unidadDestino) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Conversión no encontrada'
        });
      }

      await unidadDestino.update({
        factor_conversion
      }, { transaction: t });

      await t.commit();
      res.json({
        success: true,
        data: unidadDestino
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al actualizar conversión:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar conversión'
      });
    }
  }

  static async eliminarConversion(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id, conversionId } = req.params;

      const unidadDestino = await UnidadMedida.findOne({
        where: {
          id: conversionId,
          unidad_base_id: id
        }
      });

      if (!unidadDestino) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Conversión no encontrada'
        });
      }

      // Eliminar la relación de conversión
      await unidadDestino.update({
        unidad_base_id: null,
        factor_conversion: 1
      }, { transaction: t });

      await t.commit();
      res.json({
        success: true,
        message: 'Conversión eliminada correctamente'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error al eliminar conversión:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar conversión'
      });
    }
  }
}

module.exports = UnidadesMedidaController;