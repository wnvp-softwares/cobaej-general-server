import express from 'express';
import {
    guardarCalificacionActividad,
    listarAlumnosKardex,
    obtenerCalificacionesCurso,
    obtenerKardexAlumno,
    obtenerKardexPropio
} from '../controllers/calificacion.controller.js';
import {
    validarAlumno,
    validarAuth,
    validarDocente
} from '../middlewares/token.middleware.js';

const router = express.Router();

/* --------------------------------------------------------
RUTAS PARA CAPTURA Y CONSULTA DE CALIFICACIONES
-------------------------------------------------------- */

router.get('/curso/:id', validarAuth, obtenerCalificacionesCurso);
router.put(
    '/actividades/:actividadId',
    validarAuth,
    validarDocente,
    guardarCalificacionActividad
);

/* --------------------------------------------------------
RUTAS PARA CONSULTA Y EXPORTACION DEL KARDEX
-------------------------------------------------------- */

router.get('/kardex/propio', validarAuth, validarAlumno, obtenerKardexPropio);
router.get('/kardex/alumnos', validarAuth, validarDocente, listarAlumnosKardex);
router.get('/kardex/alumnos/:alumnoId', validarAuth, validarDocente, obtenerKardexAlumno);

export const calificacionRoutes = router;
