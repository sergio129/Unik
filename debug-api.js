// Script para verificar la respuesta de la API de productos
const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Primero necesitamos autenticarnos
    console.log('🔐 Autenticando...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',  // Asumiendo que existe este usuario
        password: 'admin'   // Cambiar por la contraseña correcta
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('No se pudo autenticar');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Autenticación exitosa');
    
    // Ahora obtener productos
    console.log('📦 Obteniendo productos...');
    
    const productosResponse = await fetch('http://localhost:3000/api/productos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!productosResponse.ok) {
      throw new Error('No se pudieron obtener productos');
    }
    
    const productosData = await productosResponse.json();
    
    console.log('📊 Respuesta de la API:');
    console.log(JSON.stringify(productosData, null, 2));
    
    if (productosData.data && productosData.data.length > 0) {
      console.log('\n🔍 Primer producto en detalle:');
      const producto = productosData.data[0];
      console.log(`Código: ${producto.codigo}`);
      console.log(`Nombre: ${producto.nombre}`);
      console.log(`Precio (precio): ${producto.precio} (tipo: ${typeof producto.precio})`);
      console.log(`Precio Costo (precio_costo): ${producto.precio_costo} (tipo: ${typeof producto.precio_costo})`);
      console.log(`Stock: ${producto.stock} (tipo: ${typeof producto.stock})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
