import express from 'express';
import { authRoutes } from './auth.route.js';

const router = express.Router();

/* --------------------------------------------------------
AUTH - RUTAS
-------------------------------------------------------- */
router.use('/auth', authRoutes);

export const rutasGenerales = router;