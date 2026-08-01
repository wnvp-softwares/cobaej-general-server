import 'dotenv/config';
import express, { urlencoded } from 'express';
import sequelize from './configs/database.config.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearDocumentacionSwagger } from './configs/swagger.config.js';

import { rutasGenerales } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aplicacion = express();
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.URL_BASE_API;

aplicacion.use(cors());
aplicacion.use(express.json());
aplicacion.use(urlencoded({ extended: true }));

aplicacion.use('/uploads', express.static(path.join(__dirname, './uploads')));

aplicacion.use('/sicecobaej', rutasGenerales);

/* ------------------------------------------------------------------------------------------
METODO PARA PUBLICAR LA DOCUMENTACION INTERACTIVA Y SU ESPECIFICACION JSON
------------------------------------------------------------------------------------------ */

const documentacionSwagger = crearDocumentacionSwagger();
aplicacion.get('/sicecobaej/docs.json', (req, res) => res.json(documentacionSwagger));

/* ------------------------------------------------------------------------------------------
METODO PARA MOSTRAR SWAGGER UI UTILIZANDO LA ESPECIFICACION LOCAL DEL SERVIDOR
------------------------------------------------------------------------------------------ */

const mostrarDocumentacionSwagger = (req, res) => res.type('html').send(`
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API SiCECOBAEJ</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({ url: '/sicecobaej/docs.json', dom_id: '#swagger-ui' });
    </script>
</body>
</html>
`);

aplicacion.get('/sicecobaej/docs', mostrarDocumentacionSwagger);

aplicacion.get('/', (req, res) => {
    res.send('API de SiCECOBAEJ funcionando correctamente');
});

/* ------------------------------------------------------------------------------------------
METODO PARA INICIAR EL SERVIDOR DESPUES DE VALIDAR LA CONEXION CON POSTGRESQL
------------------------------------------------------------------------------------------ */

const iniciarServidor = async () => {
    try {
        await sequelize.authenticate();
        console.log(
            'Base de datos verificada y corriendo en archivo main del servidor'
        );

        aplicacion.listen(PORT, '0.0.0.0', () => {
            console.log(
                `\nServidor corriendo correctamente\nPuerto de alojamiento: ${PORT}\nAccede en: http://${API_BASE}\n`
            ); // Indicamos el alojamiento del servidor de manera congruente
        });
    } catch (error) {
        console.error(
            '\nError de inicializacion de la base de datos\n TIP: Analizar archivo "/configs/database.config.js"\no en su defecto el archivo principal del servidor'
        );
        console.error(
            'Error real:\n', error.message || error, '\n'
        )
        process.exit(1); //Detiene por completo el servidor al encontrar el error critico
    }
};

iniciarServidor();
