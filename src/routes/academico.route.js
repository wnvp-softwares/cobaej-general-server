import express from 'express';
import {
    actualizarMateria,
    actualizarReprobacionAlumno,
    completarConfiguracionInicial,
    crearMateria,
    listarAlumnos,
    listarDocentes,
    listarMaterias,
    obtenerOpcionesConfiguracionInicial
} from '../controllers/academico.controller.js';
import {
    validarAlumno,
    validarAuth,
    validarDocente
} from '../middlewares/token.middleware.js';

const router = express.Router();

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA LOS LISTADOS ACADEMICOS
-------------------------------------------------------- */

router.get('/docentes', validarAuth, listarDocentes);
router.get('/alumnos', validarAuth, listarAlumnos);
router.get('/materias', validarAuth, listarMaterias);
router.patch('/alumnos/:id/reprobacion', validarAuth, validarDocente, actualizarReprobacionAlumno);

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA LA CONFIGURACION INICIAL DEL ALUMNO
-------------------------------------------------------- */

router.get(
    '/configuracion-inicial',
    validarAuth,
    validarAlumno,
    obtenerOpcionesConfiguracionInicial
);
router.post(
    '/configuracion-inicial',
    validarAuth,
    validarAlumno,
    completarConfiguracionInicial
);

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA LA ADMINISTRACION DE MATERIAS
-------------------------------------------------------- */

router.post('/materias', validarAuth, validarDocente, crearMateria);
router.patch(
    '/materias/:id',
    validarAuth,
    validarDocente,
    actualizarMateria
);

/* --------------------------------------------------------
EXPORTACION DE RUTAS
-------------------------------------------------------- */

export const academicoRoutes = router;
