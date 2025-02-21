const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt'); 
const multer = require('multer');
const path = require('path');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: 'http://localhost:4321' }));
app.use(express.json());

// Conexión a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Ruta POST para crear usuario con contraseña cifrada
app.post('/api/usuarios', async (req, res) => {
  const { email, username, password , rol, estado} = req.body;

  try {
    // Verificar si el usuario o email ya existen
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El usuario o correo ya está en uso' });
    }

    // Cifrar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el nuevo usuario
    const [result] = await pool.query(
      'INSERT INTO users (email, username, password, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [email, username, hashedPassword, rol, estado]
    );

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: result.insertId });
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// Ruta POST para autenticación de usuarios
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // Comparar la contraseña ingresada con la almacenada
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    res.json({ message: 'Inicio de sesión exitoso', userId: user.id });
  } catch (error) {
    console.error('Error en la autenticación:', error);
    res.status(500).json({ error: 'Error en la autenticación' });
  }
});

// Ruta POST para autenticación de usuarios
app.post('/api/usuarios/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // Comparar la contraseña ingresada con la almacenada
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error en la autenticación:', error);
    res.status(500).json({ error: 'Error en la autenticación' });
  }
});

// Ruta GET para obtener recetas(Se utiliza en el index para las cards)
app.get('/api/recetas', async (req, res) => {
  try {
    const [recetas] = await pool.query(
      'SELECT ID_RECETA, NOMBRE_RECETA, Descripcion_Receta, VALORACION_RECETA, IMAGEN_RECETA FROM RECETAS'
    );
    res.json(recetas);
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// Endpoint para obtener una receta por id
app.get('/api/recetas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM RECETAS WHERE ID_RECETA = ?', [id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Receta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la receta' });
  }
});

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, '../src/imagenes'); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único
  }
});

// Middleware de multer
const upload = multer({ storage });

// Ruta para subir la imagen y manejar datos adicionales
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
      // Verificar si se recibió un archivo
      if (!req.file) {
          return res.status(400).json({ error: 'No se envió ningún archivo' });
      }

      // Extraer datos del formulario
      const { nombreReceta, porciones, tiempoPreparacion, tiempoCoccion, ingredientes, instrucciones, descripcion,categoria } = req.body;

      // Validar los campos (puedes añadir más validaciones según tu necesidad)
      if (!nombreReceta || !ingredientes || !instrucciones) {
          return res.status(400).json({ error: 'Faltan datos obligatorios en el formulario' });
      }

      // Ruta de la imagen guardada
      const imagePath = `/imagenes/${req.file.filename}`;

      //Guardar los datos en la base de datos
      console.log('Nombre de la receta:', nombreReceta);
      console.log('Porciones:', porciones);
      console.log('Tiempo de preparación:', tiempoPreparacion);
      console.log('Tiempo de cocción:', tiempoCoccion);
      console.log('Ingredientes:', JSON.parse(ingredientes));
      console.log('Instrucciones:', instrucciones);
      console.log('Ruta de la imagen:', imagePath);
      console.log('Descripcion_Receta',descripcion)
      console.log('categoria Recetas:', categoria);


      const [receta] = await pool.query(
        'INSERT INTO RECETAS (NOMBRE_RECETA, Porciones, Tiempo_Preparacion, Tiempo_Coccion, Lista_Ingredientes, INSTRUCCIONES, IMAGEN_RECETA, Descripcion_Receta, ID_CATEGORIA) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nombreReceta, porciones, tiempoPreparacion, tiempoCoccion, ingredientes, instrucciones, imagePath, descripcion,categoria]
     )
     

      // Respuesta exitosa
      res.status(200).json({
          message: 'Datos y archivo subidos exitosamente',
          data: {
              nombreReceta,
              porciones,
              tiempoPreparacion,
              tiempoCoccion,
              ingredientes: JSON.parse(ingredientes),
              instrucciones,
              imagePath,
          },
      });
  } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  }
});



app.get('/api/buscar', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'La consulta de búsqueda está vacía' });
  }

  try {
    const [resultados] = await pool.query(
      `
      SELECT r.ID_RECETA, r.NOMBRE_RECETA, r.Descripcion_Receta, r.IMAGEN_RECETA, r.VALORACION_RECETA, c.NOMBRE_CATEGORIA
      FROM RECETAS r
      JOIN CATEGORIAS_RECETAS c ON r.ID_CATEGORIA = c.ID_CATEGORIA
      WHERE r.NOMBRE_RECETA LIKE ? OR r.Descripcion_Receta LIKE ? OR c.NOMBRE_CATEGORIA LIKE ?
      `,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json(resultados);
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para manejar la creación de una valoración y un comentario
app.post('/valoraciones', async (req, res) => {
  const { receta_id, usuario, valoracion_usuario, comentario_usuario } = req.body;

  // Validar los campos requeridos
  if (!receta_id || !usuario || !valoracion_usuario) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios, excepto el comentario.' });
  }

  try {
      // Obtener la fecha actual
      const fecha_valoracion = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

      // Insertar la valoración en la base de datos
      const [result] = await pool.query(
          `INSERT INTO VALORACIONES (RECETA_ID, USUARIO, VALORACION_USUARIO, COMENTARIO_USUARIO, FECHA_VALORACION)
           VALUES (?, ?, ?, ?, ?)`,
          [receta_id, usuario, valoracion_usuario, comentario_usuario || null, fecha_valoracion]
      );

      // Calcular el promedio de valoraciones para la receta
      const [avgResult] = await pool.query(
          `SELECT AVG(VALORACION_USUARIO) AS promedio_valoracion
           FROM VALORACIONES
           WHERE RECETA_ID = ?`,
          [receta_id]
      );

      const promedio = avgResult[0].promedio_valoracion;

      // Actualizar la valoración promedio en la tabla RECETAS
      await pool.query(
          `UPDATE RECETAS
           SET VALORACION_RECETA = ?
           WHERE ID_RECETA = ?`,
          [promedio, receta_id]
      );

      res.status(201).json({
          message: 'Valoración registrada con éxito y promedio actualizado.',
          valoracion_id: result.insertId,
      });
  } catch (error) {
      console.error('Error al insertar valoración o actualizar promedio:', error);
      res.status(500).json({ message: 'Error al registrar la valoración o actualizar el promedio.' });
  }
});

app.get('/api/valoraciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT USUARIO, VALORACION_USUARIO, COMENTARIO_USUARIO, FECHA_VALORACION FROM VALORACIONES WHERE RECETA_ID = ? ORDER BY FECHA_VALORACION DESC',
      [id]
    );
    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(404).json({ error: 'No se encontraron comentarios para esta receta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los comentarios' });
  }
});


app.get('/api/favoritos/:usuario', async (req, res) => {
  const { usuario } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT RECETAS.ID_RECETA, RECETAS.NOMBRE_RECETA, RECETAS.Descripcion_Receta, RECETAS.IMAGEN_RECETA
      FROM FAVORITOS
      JOIN RECETAS ON FAVORITOS.ID_RECETA = RECETAS.ID_RECETA
      WHERE FAVORITOS.USUARIO = ?`, [usuario]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los favoritos' });
  }
});

app.post('/api/favoritos', async (req, res) => {
  const { idReceta, usuario } = req.body;

  // Validación inicial
  if (!idReceta || !usuario) {
    return res.status(400).json({ error: 'ID de receta y usuario son obligatorios.' });
  }

  try {
    // Verificar si ya existe la receta en favoritos para el usuario
    const [existingEntries] = await pool.query(
      'SELECT * FROM FAVORITOS WHERE ID_RECETA = ? AND USUARIO = ?',
      [idReceta, usuario]
    );

    if (existingEntries.length > 0) {
      // Código HTTP 409: Conflicto
      return res.status(409).json({ error: 'Ya has agregado esta receta a tus favoritos.' });
    }

    // Insertar en la tabla FAVORITOS
    const [result] = await pool.query(
      'INSERT INTO FAVORITOS (ID_RECETA, USUARIO) VALUES (?, ?)',
      [idReceta, usuario]
    );

    // Respuesta exitosa
    res.status(201).json({ message: 'Receta añadida a favoritos.', idFavorito: result.insertId });
  } catch (error) {
    console.error('Error en POST /api/favoritos:', error);

    // Error del servidor
    res.status(500).json({ error: 'Error al agregar a favoritos. Por favor, inténtalo de nuevo más tarde.' });
  }
});

// Ruta para manejar las visitas
app.post('/api/incrementar-visitas', async (req, res) => {
  const { categoria } = req.body; // Recibir la categoría desde el cliente

  // Validar la categoría antes de realizar la consulta
  const columnasValidas = [
    'index_visitas',
    'postres_visitas',
    'entradas_visitas',
    'desayunos_visitas',
    'platos_principales_visitas',
    'bebidas_visitas',
    'subida_recetas_visitas',
  ];

  if (!columnasValidas.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría no válida' });
  }

  try {
    // Incrementar el contador para la categoría específica
    const [result] = await pool.query(
      `UPDATE VISTAS SET ${categoria} = ${categoria} + 1 WHERE id = 1`
    );

    res.json({ message: 'Contador actualizado correctamente', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error al actualizar el contador:', error.message);
    res.status(500).json({ error: 'Error al actualizar el contador', details: error.message });
  }
});


// Ruta para obtener las visitas de la tabla VISTAS
app.get('/vistas', async (req, res) => {
  try {
    const [result] = await pool.query(`
       SELECT 
        v.postres_visitas AS postres,
        v.entradas_visitas AS entradas,
        v.desayunos_visitas AS desayunos,
        v.platos_principales_visitas AS platos_principales,
        v.bebidas_visitas AS bebidas,
        v.subida_recetas_visitas AS subida_recetas,
        v.index_visitas,
        (SELECT MAX(id) FROM users) AS max_user_id,
        (SELECT COUNT(*) FROM RECETAS WHERE ID_CATEGORIA = 1) AS NumPostres,
        (SELECT COUNT(*) FROM RECETAS WHERE ID_CATEGORIA = 2) AS NumPlatosPrincipales,
        (SELECT COUNT(*) FROM RECETAS WHERE ID_CATEGORIA = 3) AS NumENtradas,
        (SELECT COUNT(*) FROM RECETAS WHERE ID_CATEGORIA = 4) AS NumDesayunos,
        (SELECT COUNT(*) FROM RECETAS WHERE ID_CATEGORIA = 5) AS NumBebidas        
      FROM VISTAS v;
      `);

    if (result.length > 0) {
      // Convierte las filas a un arreglo más manejable para el frontend
      const visitas = [
        { categoria: 'Index', vistas: result[0].index_visitas },
        { categoria: 'Postres', vistas: result[0].postres },
        { categoria: 'Entradas', vistas: result[0].entradas },
        { categoria: 'Desayunos', vistas: result[0].desayunos },
        { categoria: 'Platos principales', vistas: result[0].platos_principales },
        { categoria: 'Bebidas', vistas: result[0].bebidas },
        { categoria: 'Subida recetas visitas', vistas: result[0].subida_recetas },
        { categoria: 'Usuarios registrados', vistas: result[0].max_user_id },
        { categoria: 'Numero de Postres', vistas: result[0].NumPostres },
        { categoria: 'Numero de Platos Principales', vistas: result[0].NumPlatosPrincipales },
        { categoria: 'Numero de Entradas', vistas: result[0].NumENtradas },
        { categoria: 'Numero de Desayunos', vistas: result[0].NumDesayunos },
        { categoria: 'Numero de Bebidas', vistas: result[0].NumBebidas },
      ];
      res.json(visitas);
    } else {
      res.status(404).json({
        success: false,
        message: 'No se encontraron datos en la tabla VISTAS.',
      });
    }
  } catch (error) {
    console.error('Error al obtener las visitas:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener las visitas.',
    });
  }
});

//Servir carpeta de imágenes subidas
app.use('/imagenes', express.static('../src/imagenes'));

//Ruta Post para valorar recetas y comentarios

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://0.0.0.0:${port}`);
});



