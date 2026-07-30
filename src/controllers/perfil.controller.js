import { Alumno, Docente } from '../models/index.js';
import { subirArchivoSupabase } from '../services/storage.service.js';

const CAMPOS_SENSIBLES = [
    'correo',
    'clave',
    'contrasena',
    'numero_control',
    'clave_registro',
    'clave_docente'
];

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL MODELO CORRESPONDIENTE AL USUARIO AUTENTICADO
------------------------------------------------------------------------------------------ */

const obtenerModeloUsuario = (tipo) => {
    if (tipo === 'docente') return Docente;
    if (tipo === 'alumno') return Alumno;
    return null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LA INFORMACION SEGURA DEL PERFIL PROPIO
------------------------------------------------------------------------------------------ */

const construirPerfil = (usuario, tipo) => {
    const perfil = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        imagen: usuario.imagen,
        tipo
    };

    if (tipo === 'docente') {
        perfil.horas_disponibles = usuario.horas_disponibles;
    }

    if (tipo === 'alumno') {
        perfil.fecha_ingreso = usuario.fecha_ingreso;
    }

    return perfil;
};

/* ------------------------------------------------------------------------------------------
METODO PARA DETECTAR INTENTOS DE MODIFICAR DATOS SENSIBLES
------------------------------------------------------------------------------------------ */

const contieneCamposSensibles = (datos) => {
    return CAMPOS_SENSIBLES.some((campo) => {
        return Object.prototype.hasOwnProperty.call(datos, campo);
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER LA INFORMACION DEL PERFIL AUTENTICADO
------------------------------------------------------------------------------------------ */

export const obtenerPerfilPropio = async (req, res) => {
    try {
        const { id, tipo } = req.usuario;
        const Modelo = obtenerModeloUsuario(tipo);

        if (!Modelo) {
            return res.status(400).json({ mensaje: 'Tipo de usuario inválido' });
        }

        const usuario = await Modelo.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Perfil no encontrado' });
        }

        return res.status(200).json({
            mensaje: 'Perfil obtenido correctamente',
            usuario: construirPerfil(usuario, tipo)
        });
    } catch (error) {
        console.error(
            'Error al obtener el perfil propio en perfil.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al obtener el perfil'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA ACTUALIZAR UNICAMENTE LOS DATOS NO SENSIBLES DEL PERFIL
------------------------------------------------------------------------------------------ */

export const actualizarPerfilPropio = async (req, res) => {
    try {
        const { id, tipo } = req.usuario;
        const Modelo = obtenerModeloUsuario(tipo);

        if (!Modelo) {
            return res.status(400).json({ mensaje: 'Tipo de usuario inválido' });
        }

        if (contieneCamposSensibles(req.body)) {
            return res.status(400).json({
                mensaje: 'Los datos sensibles no pueden modificarse desde el perfil'
            });
        }

        const usuario = await Modelo.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Perfil no encontrado' });
        }

        const cambios = {};

        if (req.body.nombre !== undefined) {
            if (typeof req.body.nombre !== 'string') {
                return res.status(400).json({
                    mensaje: 'El nombre recibido no es válido'
                });
            }

            const nombre = req.body.nombre.trim();

            if (nombre.length < 3 || nombre.length > 150) {
                return res.status(400).json({
                    mensaje: 'El nombre debe contener entre 3 y 150 caracteres'
                });
            }

            cambios.nombre = nombre;
        }

        if (req.body.horas_disponibles !== undefined) {
            if (tipo !== 'docente') {
                return res.status(400).json({
                    mensaje: 'Las horas disponibles solo aplican a docentes'
                });
            }

            const horasDisponibles = Number(req.body.horas_disponibles);

            if (!Number.isInteger(horasDisponibles) || horasDisponibles < 0) {
                return res.status(400).json({
                    mensaje: 'Las horas disponibles deben ser un entero mayor o igual a cero'
                });
            }

            cambios.horas_disponibles = horasDisponibles;
        }

        if (req.file) {
            cambios.imagen = await subirArchivoSupabase(
                req.file,
                tipo === 'docente' ? 'docentes' : 'alumnos'
            );
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({
                mensaje: 'No se recibieron datos válidos para actualizar'
            });
        }

        await usuario.update(cambios);

        return res.status(200).json({
            mensaje: 'Perfil actualizado correctamente',
            usuario: construirPerfil(usuario, tipo)
        });
    } catch (error) {
        console.error(
            'Error al actualizar el perfil propio en perfil.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al actualizar el perfil'
        });
    }
};
