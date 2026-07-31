import express from 'express';
import {
    actualizarPerfilPropio,
    obtenerPerfilConsultado,
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
RUTA PROTEGIDA PARA CONSULTAR EL PERFIL PERMITIDO DE OTRO USUARIO
-------------------------------------------------------- */

router.get('/:tipo/:id', validarAuth, obtenerPerfilConsultado);

/* --------------------------------------------------------
EXPORTACION DE RUTAS
-------------------------------------------------------- */

export const perfilRoutes = router;
