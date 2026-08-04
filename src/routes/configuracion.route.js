import express from 'express';
import {
    actualizarConfiguracionCuenta,
    obtenerConfiguracionCuenta
} from '../controllers/configuracion.controller.js';
import { validarAuth } from '../middlewares/token.middleware.js';

const router = express.Router();

/* --------------------------------------------------------
RUTAS PROTEGIDAS PARA CONFIGURAR DATOS SENSIBLES DE LA CUENTA
-------------------------------------------------------- */

router.get('/', validarAuth, obtenerConfiguracionCuenta);
router.patch('/', validarAuth, actualizarConfiguracionCuenta);

export const configuracionRoutes = router;
