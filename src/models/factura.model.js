// Modelo para facturas
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../utils/database');
const Cliente = require('./cliente.model');
const Usuario = require('./usuario.model');

const Factura = sequelize.define('Factura', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  numero: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clientes',
      key: 'id'
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  impuesto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  descuento: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'pagada', 'anulada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  metodo_pago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'pago_movil', 'tarjeta', 'mixto', 'devolucion'),
    allowNull: false,
    defaultValue: 'efectivo'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Nuevos campos para devoluciones y factura electrónica
  tipo_documento: {
    type: DataTypes.ENUM('factura', 'nota_credito', 'nota_debito', 'factura_electronica'),
    allowNull: true,
    defaultValue: 'factura'
  },
  factura_relacionada_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'facturas',
      key: 'id'
    }
  },
  // Campos para facturación electrónica
  cufe: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Código Único de Factura Electrónica'
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Código QR para validación de factura electrónica'
  },
  validacion_dian: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Indica si la factura ha sido validada por la DIAN'
  },
  fecha_validacion: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de validación por la DIAN'
  }
}, {
  tableName: 'facturas',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

// Establecer relaciones
Factura.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(Factura, { foreignKey: 'cliente_id', as: 'facturas' });

Factura.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Factura, { foreignKey: 'usuario_id', as: 'facturas' });

// Auto-relación para devoluciones y facturas relacionadas
Factura.belongsTo(Factura, { foreignKey: 'factura_relacionada_id', as: 'factura_original' });
Factura.hasMany(Factura, { foreignKey: 'factura_relacionada_id', as: 'documentos_relacionados' });

// Método para generar número de factura único
Factura.generarNumeroFactura = async function() {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().substr(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  // Obtener el último número de factura para este mes
  const ultimaFactura = await Factura.findOne({
    where: {
      numero: {
        [Op.like]: `F${año}${mes}%`
      }
    },
    order: [['id', 'DESC']]
  });
  
  let correlativo = 1;
  if (ultimaFactura) {
    const ultimoNumero = parseInt(ultimaFactura.numero.substr(5), 10);
    correlativo = ultimoNumero + 1;
  }
  
  return `F${año}${mes}${correlativo.toString().padStart(4, '0')}`;
};

module.exports = Factura;