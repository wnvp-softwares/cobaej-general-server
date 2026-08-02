import express from 'express';
import {
    actualizarPerfilPropio,
    obtenerPerfilAlumno,
    obtenerPerfilDocente,
    obtenerPerfilPropio
} from '../controllers/perfil.controller.js';
import { upload } from '../configs/multer.config.js';
import { validarAuth } from '../middlewares/token.middleware.js';

const router = express.Router();

/* ------------------------------------------------------------------------------------------
METODO PARA PROCESAR LA IMAGEN DEL PERFIL Y DEVOLVER ERRORES EN FORMATO JSON
------------------------------------------------------------------------------------------ */

const procesarImagenPerfil = (req, res, next) => {
    upload.single('imagen')(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                mensaje: error.message || 'No fue posible procesar la imagen'
            });
        }

        return next();
    });
};

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA EL PERFIL PROPIO
-------------------------------------------------------- */

router.get('/me', validarAuth, obtenerPerfilPropio);
router.patch(
    '/me',
    validarAuth,
    procesarImagenPerfil,
    actualizarPerfilPropio
);

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA CONSULTAR PERFILES DEL DIRECTORIO
-------------------------------------------------------- */

router.get('/docentes/:id', validarAuth, obtenerPerfilDocente);
router.get('/alumnos/:id', validarAuth, obtenerPerfilAlumno);

/* --------------------------------------------------------
EXPORTACION DE RUTAS
-------------------------------------------------------- */

export const perfilRoutes = router;
