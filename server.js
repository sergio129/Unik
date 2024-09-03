const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config();

// Configurar la conexión a MySQL
let connection;

(async () => {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Conectado a MySQL');
})();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Redirigir a login si no autenticado
app.get('/', (req, res) => {
  res.redirect('/login'); // Redirige a la página de login
});

// Ruta para servir el archivo HTML de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta para servir el archivo HTML de inventario
app.get('/inventario', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inventario.html'));
});

// Ruta para servir el archivo HTML de ventas
app.get('/ventas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ventas.html'));
});

// Ruta para obtener todos los productos o buscar por ID
app.get('/api/productos', async (req, res) => {
  const codigo = req.query.codigo; // Obtén el ID de la query string
  let query = 'SELECT * FROM productos';
  const queryParams = [];

  if (codigo) {
    query += ' WHERE codigo = ?';
    queryParams.push(codigo);
  }

  try {
    const [results] = await connection.query(query, queryParams);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).send('Error al obtener productos');
  }
});

// Ruta para agregar un nuevo producto o un array de productos
app.post('/api/productos', async (req, res) => {
  const productos = Array.isArray(req.body) ? req.body : [req.body];

  const query = 'INSERT INTO productos (codigo, lote, nombre, descripcion, precio, cantidad, peso, volumen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  
  try {
    for (const producto of productos) {
      await  connection.query(query, [
        producto.codigo,
        producto.lote,
        producto.nombre,
        producto.descripcion,
        producto.precio,
        producto.cantidad,
        producto.peso,
        producto.volumen
      ]);
    }
    res.status(200).send('Producto(s) guardado(s) con éxito');
  } catch (error) {
    console.error('Error al guardar productos:', error);
    res.status(500).send('Error al guardar productos');
  }
});


// Ruta para obtener un producto por ID
app.get('/api/productos/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const query = 'SELECT * FROM productos WHERE codigo = ?';
  try {
    const [results] = await connection.query(query, [codigo]);
    if (results.length === 0) {
      return res.status(404).send('Producto no encontrado');
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).send('Error al obtener producto');
  }
});

// Ruta para actualizar un producto
app.put('/api/productos/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const { lote, nombre, descripcion, precio, cantidad, peso, volumen } = req.body;

  // Crea una lista de valores para actualizar
  const values = [];
  const setClause = [];
  if (lote !== undefined) {
    setClause.push('lote = ?');
    values.push(lote);
  }
  if (nombre !== undefined) {
    setClause.push('nombre = ?');
    values.push(nombre);
  }
  if (descripcion !== undefined) {
    setClause.push('descripcion = ?');
    values.push(descripcion);
  }
  if (precio !== undefined) {
    setClause.push('precio = ?');
    values.push(precio);
  }
  if (cantidad !== undefined) {
    setClause.push('cantidad = ?');
    values.push(cantidad);
  }
  if (peso !== undefined) {
    setClause.push('peso = ?');
    values.push(peso);
  }
  if (volumen !== undefined) {
    setClause.push('volumen = ?');
    values.push(volumen);
  }

  values.push(codigo); // Agrega el código al final

  if (setClause.length === 0) {
    return res.status(400).send('No se especificaron campos para actualizar');
  }

  const query = `UPDATE productos SET ${setClause.join(', ')} WHERE codigo = ?`;

  try {
    const [results] = await connection.query(query, values);
    if (results.affectedRows === 0) {
      return res.status(404).send('Producto no encontrado');
    }
    res.send('Producto actualizado');
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).send('Error al actualizar producto');
  }
});

// Ruta para eliminar un producto
app.delete('/api/productos/codigo/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const query = 'DELETE FROM productos WHERE codigo = ?';
  try {
    const [results] = await connection.query(query, [codigo]);
    res.send('Producto eliminado');
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).send('Error al eliminar producto');
  }
});

// Ruta para el login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM usuarios WHERE username = ?';
  try {
    const [results] = await connection.query(query, [username]);
    
    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    
    res.json({ token });
  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para manejar ventas y actualizar inventario
app.post('/api/ventas', async (req, res) => {
  const productosAVender = req.body;
  if (!Array.isArray(productosAVender) || productosAVender.length === 0) {
    return res.status(400).send('Se espera un array de productos a vender');
  }

  try {
    await connection.beginTransaction();

    for (const producto of productosAVender) {
      const { codigo, cantidad } = producto;

      if (cantidad <= 0) {
        throw new Error(`Cantidad inválida para el producto con código ${codigo}`);
      }

      const [rows] = await connection.query('SELECT cantidad FROM productos WHERE codigo = ?', [codigo]);
      if (rows.length === 0) {
        throw new Error(`Producto con código ${codigo} no encontrado`);
      }

      const cantidadActual = rows[0].cantidad;
      const nuevaCantidad = cantidadActual - cantidad;
      if (nuevaCantidad < 0) {
        throw new Error(`No hay suficiente cantidad del producto con código ${codigo}`);
      }

      await connection.query('UPDATE productos SET cantidad = ? WHERE codigo = ?', [nuevaCantidad, codigo]);

      // Registrar la venta en la base de datos
      console.log('Registrando venta:', producto);
      const query = 'INSERT INTO ventas (codigo, nombre, precio, cantidad, fecha_venta) VALUES (?, ?, ?, ?, NOW())';
      await connection.query(query, [producto.codigo, producto.nombre, producto.precio, producto.cantidad]);
    }

    await connection.commit();
    res.send('Venta completada y inventario actualizado');
  } catch (error) {
    await connection.rollback();
    console.error('Error al procesar la venta:', error);
    res.status(500).send('Error al procesar la venta');
  }
})

// Ruta para registrar un nuevo usuario
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Se requiere un nombre de usuario y una contraseña');
  }

  try {
    // Verificar si el usuario ya existe
    const [existingUsers] = await connection.query('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).send('El nombre de usuario ya está en uso');
    }

    // Crear el hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar el nuevo usuario en la base de datos
    const query = 'INSERT INTO usuarios (username, password) VALUES (?, ?)';
    await connection.query(query, [username, hashedPassword]);

    res.status(201).send('Usuario registrado');
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).send('Error al registrar usuario');
  }
});

// Ruta para actualizar la contraseña del usuario
app.put('/api/update-password/:username', async (req, res) => {
  const { username } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).send('Se requiere una nueva contraseña');
  }

  try {
    // Crear el hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña en la base de datos
    const query = 'UPDATE usuarios SET password = ? WHERE username = ?';
    const [result] = await connection.query(query, [hashedPassword, username]);

    if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    res.send('Contraseña actualizada');
  } catch (err) {
    console.error('Error al actualizar contraseña:', err);
    res.status(500).send('Error al actualizar contraseña');
  }
});

// Endpoint para descargar reporte en Excel
app.get('/api/reporte', async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  try {
    let query = `
      SELECT v.codigo, p.nombre, v.cantidad, v.precio, v.fecha_venta
      FROM ventas v
      JOIN productos p ON v.codigo = p.codigo
    `;
    let params = [];

    if (fechaInicio && fechaFin) {
      query += ' WHERE v.fecha_venta BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    }

    const [ventas] = await connection.execute(query, params);

    // Crear un nuevo libro de Excel
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(ventas);

    // Agregar la hoja al libro
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Reporte de Ventas');

    // Escribir el archivo Excel en una ruta temporal
    const filePath = path.resolve(__dirname, 'public', 'reporte_ventas.xlsx');
    xlsx.writeFile(workbook, filePath);

    // Descargar el archivo
    res.download(filePath, 'reporte_ventas.xlsx', (err) => {
      if (err) {
        console.error('Error al descargar el archivo:', err);
      } else {
        // Eliminar el archivo después de la descarga
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error al eliminar el archivo temporal:', err);
          }
        });
      }
    });

  } catch (error) {
    console.error('Error al generar el reporte:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});

// Asegúrate de que existe el directorio "public"
const fs = require('fs');
if (!fs.existsSync(path.resolve(__dirname, 'public'))) {
  fs.mkdirSync(path.resolve(__dirname, 'public'));
}


app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
