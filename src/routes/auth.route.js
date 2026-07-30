import {
    crearAlumno,
    crearDocente,
    loginAlumno,
    loginDocente,
    reenviarCodigo,
    verificarCodigo
} from '../controllers/auth.controller.js';
import {
    validarAuth,
    validarVerificacion
} from '../middlewares/token.middleware.js';
import express from 'express';

const router = express.Router();

/* --------------------------------------------------------
METODO PARA CONFIRMAR QUE EL TOKEN DE SESION SIGUE VIGENTE
-------------------------------------------------------- */

const confirmarTokenActivo = (req, res) => {
    return res.status(200).json({
        mensaje: 'Token valido y vigente',
        usuarioId: req.usuario.id,
        tipo: req.usuario.tipo
    });
};

/* --------------------------------------------------------
RUTAS PUBLICAS PARA LOS ACCESOS
-------------------------------------------------------- */

router.post('/login-alumno', loginAlumno);
router.post('/login-docente', loginDocente);

router.post('/signup-alumno', crearAlumno);
router.post('/signup-docente', crearDocente);

router.post('/verificar-codigo', validarVerificacion, verificarCodigo);
router.post('/reenviar-codigo', validarVerificacion, reenviarCodigo);

router.get('/verificar-token', validarAuth, confirmarTokenActivo);

/* --------------------------------------------------------
EXPORTAMOS RUTAS
-------------------------------------------------------- */

export const authRoutes = router;
