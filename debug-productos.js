// Script de depuración para verificar datos de productos en PostgreSQL
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProductos() {
  try {
    console.log('🔍 Verificando productos en la base de datos...\n');
    
    const productos = await prisma.producto.findMany({
      take: 5,
      include: {
        categoria: {
          select: { id: true, nombre: true }
        }
      }
    });
    
    console.log(`📊 Total de productos encontrados: ${productos.length}\n`);
    
    productos.forEach((producto, index) => {
      console.log(`--- Producto ${index + 1} ---`);
      console.log(`ID: ${producto.id}`);
      console.log(`Código: ${producto.codigo}`);
      console.log(`Nombre: ${producto.nombre}`);
      console.log(`Precio (precio): ${producto.precio}`);
      console.log(`Precio Costo (precio_costo): ${producto.precio_costo}`);
      console.log(`Stock: ${producto.stock}`);
      console.log(`Stock Mínimo: ${producto.stock_minimo}`);
      console.log(`Categoría: ${producto.categoria?.nombre || 'Sin categoría'}`);
      console.log(`Activo: ${producto.activo}`);
      console.log(`Creado: ${producto.createdAt}`);
      console.log('');
    });
    
    // También verificar la estructura del esquema
    console.log('🔧 Verificando estructura de campos...');
    const primerProducto = productos[0];
    if (primerProducto) {
      console.log('Campos disponibles en el objeto producto:');
      Object.keys(primerProducto).forEach(key => {
        console.log(`- ${key}: ${typeof primerProducto[key]} = ${primerProducto[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al verificar productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProductos();
