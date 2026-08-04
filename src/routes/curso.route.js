import express from 'express';
import {
    actualizarCurso,
    crearCurso,
    inscribirseCurso,
    listarAlumnosCurso,
    listarCursos,
    obtenerCurso,
    obtenerOpcionesCurso
} from '../controllers/curso.controller.js';
import {
    crearActividad,
    obtenerActividad
} from '../controllers/actividad.controller.js';
import { uploadMateriales } from '../configs/multer.config.js';
import {
    validarAlumno,
    validarAuth,
    validarDocente
} from '../middlewares/token.middleware.js';

const router = express.Router();

/* --------------------------------------------------------
METODO PARA PROCESAR MATERIALES Y RESPONDER ERRORES DE MULTER EN JSON
-------------------------------------------------------- */

const procesarMaterialesActividad = (req, res, next) => {
    uploadMateriales.array('archivos', 5)(req, res, (error) => {
        if (!error) return next();

        const mensajes = {
            LIMIT_FILE_SIZE: 'Cada archivo debe pesar como máximo 10 MB.',
            LIMIT_FILE_COUNT: 'Puedes adjuntar un máximo de cinco archivos.'
        };

        return res.status(400).json({
            mensaje: mensajes[error.code] || error.message || 'No fue posible procesar los archivos.',
            codigo: error.code || 'ARCHIVO_INVALIDO'
        });
    });
};

/* --------------------------------------------------------
RUTAS PARA CONSULTAR, CREAR E INSCRIBIRSE A CURSOS
-------------------------------------------------------- */

router.get('/', validarAuth, listarCursos);
router.get('/opciones', validarAuth, validarDocente, obtenerOpcionesCurso);
router.post('/', validarAuth, validarDocente, crearCurso);
router.patch('/:id', validarAuth, validarDocente, actualizarCurso);
router.post('/:id/inscripcion', validarAuth, validarAlumno, inscribirseCurso);
router.get('/:id', validarAuth, obtenerCurso);
router.get('/:id/alumnos', validarAuth, validarDocente, listarAlumnosCurso);

/* --------------------------------------------------------
RUTAS PARA ACTIVIDADES Y MATERIALES DE REFERENCIA
-------------------------------------------------------- */

router.post(
    '/:id/actividades',
    validarAuth,
    validarDocente,
    procesarMaterialesActividad,
    crearActividad
);
router.get('/:id/actividades/:actividadId', validarAuth, obtenerActividad);

export const cursoRoutes = router;
