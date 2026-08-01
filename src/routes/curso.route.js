import express from 'express';
import {
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
RUTAS PARA CONSULTAR, CREAR E INSCRIBIRSE A CURSOS
-------------------------------------------------------- */

router.get('/', validarAuth, listarCursos);
router.get('/opciones', validarAuth, validarDocente, obtenerOpcionesCurso);
router.post('/', validarAuth, validarDocente, crearCurso);
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
    uploadMateriales.array('archivos', 5),
    crearActividad
);
router.get('/:id/actividades/:actividadId', validarAuth, obtenerActividad);

export const cursoRoutes = router;
