import { crearAlumno, crearDocente, loginAlumno, loginDocente, verificarCodigo } from '../controllers/auth.controller.js';
import { validarAuth } from '../middlewares/token.middleware.js';
import express from 'express';

const router = express.Router();

/* --------------------------------------------------------
RUTAS PUBLICAS PARA LOS ACCESOS
-------------------------------------------------------- */

router.post('/login-alumno', loginAlumno);
router.post('/login-docente', loginDocente);

router.post('/signup-alumno', crearAlumno);
router.post('/signup-docente', crearDocente);

router.post('/verificar-codigo', verificarCodigo);

router.get('/verificar-token', validarAuth, (req, res) => {
    return res.status(200).json({
        mensaje: 'Token valido y vigente',
        usuarioId: req.usuario.id
    });
});

/* --------------------------------------------------------
EXPORTAMOS RUTAS
-------------------------------------------------------- */

export const authRoutes = router;