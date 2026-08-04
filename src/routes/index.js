import express from 'express';
import { authRoutes } from './auth.route.js';
import { perfilRoutes } from './perfil.route.js';
import { academicoRoutes } from './academico.route.js';
import { cursoRoutes } from './curso.route.js';
import { calificacionRoutes } from './calificacion.route.js';
import { horarioRoutes } from './horario.route.js';
import { configuracionRoutes } from './configuracion.route.js';

const router = express.Router();

/* --------------------------------------------------------
AUTH - RUTAS
-------------------------------------------------------- */
router.use('/auth', authRoutes);
router.use('/perfil', perfilRoutes);
router.use('/academico', academicoRoutes);
router.use('/cursos', cursoRoutes);
router.use('/calificaciones', calificacionRoutes);
router.use('/horarios', horarioRoutes);
router.use('/configuracion', configuracionRoutes);

export const rutasGenerales = router;
