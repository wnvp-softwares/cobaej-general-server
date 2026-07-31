import express from 'express';
import { authRoutes } from './auth.route.js';
import { perfilRoutes } from './perfil.route.js';
import { academicoRoutes } from './academico.route.js';

const router = express.Router();

/* --------------------------------------------------------
AUTH - RUTAS
-------------------------------------------------------- */
router.use('/auth', authRoutes);
router.use('/perfil', perfilRoutes);
router.use('/academico', academicoRoutes);

export const rutasGenerales = router;
