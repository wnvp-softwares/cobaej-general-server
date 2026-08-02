import express from 'express';
import {
    activarPeriodoEscolar,
    actualizarModuloHorario,
    crearModuloHorario,
    eliminarCeldaHorario,
    eliminarModuloHorario,
    guardarCeldaHorario,
    obtenerConfiguracionHorarios,
    obtenerHorarioGrupo
} from '../controllers/horario.controller.js';
import {
    validarAuth,
    validarDocente
} from '../middlewares/token.middleware.js';

const router = express.Router();

/* --------------------------------------------------------
RUTAS DE CONSULTA DE CICLO ACTIVO Y HORARIOS
-------------------------------------------------------- */

router.get('/configuracion', validarAuth, obtenerConfiguracionHorarios);
router.get('/grupos/:grupoId', validarAuth, obtenerHorarioGrupo);

/* --------------------------------------------------------
RUTAS DOCENTES PARA CICLO ACTIVO Y MODULOS DE CLASE
-------------------------------------------------------- */

router.patch('/periodo-activo', validarAuth, validarDocente, activarPeriodoEscolar);
router.post('/modulos', validarAuth, validarDocente, crearModuloHorario);
router.patch('/modulos/:id', validarAuth, validarDocente, actualizarModuloHorario);
router.delete('/modulos/:id', validarAuth, validarDocente, eliminarModuloHorario);

/* --------------------------------------------------------
RUTAS DOCENTES PARA ADMINISTRAR LA TABLA GENERAL DEL GRUPO
-------------------------------------------------------- */

router.put('/grupos/:grupoId/celdas', validarAuth, validarDocente, guardarCeldaHorario);
router.delete('/grupos/:grupoId/celdas/:id', validarAuth, validarDocente, eliminarCeldaHorario);

export const horarioRoutes = router;
