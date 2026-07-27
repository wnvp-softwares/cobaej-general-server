import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Alumno, Docente } from '../models/index.js';

/* ------------------------------------------------------------------------------------------
METODO PARA LA OBTENCION DE INFORMACION COMPLETA DE PERFIL
------------------------------------------------------------------------------------------ */

export const obtenerPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { arquetipo } = req.body;
        const Modelo = arquetipo === 'docente' ? Docente : Alumno;
        const usuario = await Modelo.findOne({ where: { id: id } });

        if (!usuario) return res.status(404).json({ mensaje: `${Modelo} no encontrado`});

        return res.status(200).json({
            mensaje: `${Modelo} encontrado!`,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                imagen: usuario.imagen
            }
        })
    } catch (error) {
        console.error('Error al intentar obtener perfil por id en perfil.controller.js\n', error.message || error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al Obtener Perfil' });
    }
}

/* ------------------------------------------------------------------------------------------
METODO PARA LA ACTUALIZAR PERFIL DE MANERA DINAMICA
------------------------------------------------------------------------------------------ */

export const actualizarPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { arquetipo, nombre, correo, contrasena } = req.body;

        const validados = {};

        if (nombre !== undefined) validados.nombre = nombre;
        if (correo !== undefined) validados.correo = correo;
        if (contrasena !== undefined) {
            validados.contrasena = await bcrypt.hash(contrasena, 10);
        }

        if (Object.keys(validados).length === 0) {
            return res.status(400).json({ mensaje: 'Sin datos validos para actualizar' });
        }

        const Modelo = arquetipo === 'docente' ? Docente : Alumno;
        const [rows] = await Modelo.update(validados, { where: { id: id} });

        const updated = rows > 0;

        if (!updated) {
            return res.status(400).json({ mensaje:'Usuario no encontrado o sin cambios reales' });
        }

        return res.status(200).json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch(error) {
        console.error('Error al intentar actualizar perfil en perfil.controller.js\n', error.message || error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al Actualizar Perfil' });
    }
}