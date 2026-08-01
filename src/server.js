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
    <style>
        :root {
            color-scheme: light;
        }

        body {
            margin: 0;
            background: #f8fafc;
            transition: background-color 0.25s, color 0.25s;
        }

        .swagger-theme-button {
            position: fixed;
            top: 14px;
            right: 18px;
            z-index: 1000;
            min-height: 40px;
            padding: 0 15px;
            border: 1px solid #cbd5e1;
            border-radius: 11px;
            background: #ffffff;
            color: #1e293b;
            font: 600 13px system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        }

        .swagger-theme-button:hover {
            border-color: #4f46e5;
            color: #4f46e5;
        }

        body.swagger-dark {
            color-scheme: dark;
            background: #0f172a;
        }

        body.swagger-dark .swagger-theme-button {
            border-color: #475569;
            background: #172033;
            color: #e2e8f0;
        }

        body.swagger-dark .swagger-ui,
        body.swagger-dark .swagger-ui .info .title,
        body.swagger-dark .swagger-ui .info p,
        body.swagger-dark .swagger-ui .info li,
        body.swagger-dark .swagger-ui .info table,
        body.swagger-dark .swagger-ui .opblock-tag,
        body.swagger-dark .swagger-ui .opblock-tag small,
        body.swagger-dark .swagger-ui .opblock-description-wrapper p,
        body.swagger-dark .swagger-ui .opblock-external-docs-wrapper p,
        body.swagger-dark .swagger-ui .opblock-title_normal p,
        body.swagger-dark .swagger-ui .parameter__name,
        body.swagger-dark .swagger-ui .parameter__type,
        body.swagger-dark .swagger-ui .response-col_status,
        body.swagger-dark .swagger-ui .response-col_description,
        body.swagger-dark .swagger-ui .model-title,
        body.swagger-dark .swagger-ui .model,
        body.swagger-dark .swagger-ui table thead tr td,
        body.swagger-dark .swagger-ui table thead tr th,
        body.swagger-dark .swagger-ui label,
        body.swagger-dark .swagger-ui .tab li,
        body.swagger-dark .swagger-ui .servers-title {
            color: #e2e8f0;
        }

        body.swagger-dark .swagger-ui .scheme-container,
        body.swagger-dark .swagger-ui .model-container,
        body.swagger-dark .swagger-ui section.models,
        body.swagger-dark .swagger-ui .dialog-ux .modal-ux {
            border-color: #334155;
            background: #172033;
            color: #e2e8f0;
            box-shadow: none;
        }

        body.swagger-dark .swagger-ui section.models h4,
        body.swagger-dark .swagger-ui section.models h5,
        body.swagger-dark .swagger-ui .dialog-ux .modal-ux-header h3,
        body.swagger-dark .swagger-ui .dialog-ux .modal-ux-content p {
            color: #e2e8f0;
        }

        body.swagger-dark .swagger-ui input,
        body.swagger-dark .swagger-ui select,
        body.swagger-dark .swagger-ui textarea {
            border-color: #475569;
            background: #0f172a;
            color: #e2e8f0;
        }

        body.swagger-dark .swagger-ui .highlight-code,
        body.swagger-dark .swagger-ui .microlight,
        body.swagger-dark .swagger-ui pre {
            background: #020617 !important;
            color: #e2e8f0 !important;
        }

        body.swagger-dark .swagger-ui .opblock-tag {
            border-bottom-color: #334155;
        }

        body.swagger-dark .swagger-ui svg {
            fill: currentColor;
        }

        @media screen and (max-width: 620px) {
            .swagger-theme-button {
                position: sticky;
                top: 8px;
                float: right;
                margin: 8px 10px 0 0;
            }

            .swagger-ui .wrapper {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
    <button class="swagger-theme-button" id="swagger-theme-button" type="button" aria-label="Cambiar tema de Swagger">
        Activar tema oscuro
    </button>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        const botonTemaSwagger = document.getElementById('swagger-theme-button');

        /* ----------------------------------------------------------------------------------
        METODO PARA APLICAR EL TEMA VISUAL SELECCIONADO EN SWAGGER
        ---------------------------------------------------------------------------------- */

        function aplicarTemaSwagger(tema) {
            const temaOscuro = tema === 'dark';
            document.body.classList.toggle('swagger-dark', temaOscuro);
            botonTemaSwagger.textContent = temaOscuro
                ? 'Activar tema claro'
                : 'Activar tema oscuro';
            botonTemaSwagger.setAttribute('aria-pressed', String(temaOscuro));
            localStorage.setItem('swagger-theme', temaOscuro ? 'dark' : 'light');
        }

        /* ----------------------------------------------------------------------------------
        METODO PARA OBTENER EL TEMA GUARDADO O LA PREFERENCIA DEL SISTEMA
        ---------------------------------------------------------------------------------- */

        function obtenerTemaInicialSwagger() {
            const temaGuardado = localStorage.getItem('swagger-theme');
            if (temaGuardado === 'dark' || temaGuardado === 'light') return temaGuardado;
            return window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
        }

        /* ----------------------------------------------------------------------------------
        METODO PARA ALTERNAR ENTRE EL TEMA CLARO Y OSCURO DE SWAGGER
        ---------------------------------------------------------------------------------- */

        function alternarTemaSwagger() {
            aplicarTemaSwagger(
                document.body.classList.contains('swagger-dark') ? 'light' : 'dark'
            );
        }

        aplicarTemaSwagger(obtenerTemaInicialSwagger());
        botonTemaSwagger.addEventListener('click', alternarTemaSwagger);
        SwaggerUIBundle({
            url: '/sicecobaej/docs.json',
            dom_id: '#swagger-ui',
            displayRequestDuration: true,
            docExpansion: 'none'
        });
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
