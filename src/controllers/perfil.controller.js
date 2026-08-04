import {
    Alumno,
    Docente,
    Grupo,
    HistorialInscripcion,
    Horario,
    PeriodoEscolar,
    ReprobacionAlumno
} from '../models/index.js';
import { subirArchivoSupabase } from '../services/storage.service.js';

const CAMPOS_SENSIBLES = [
    'correo',
    'clave',
    'contrasena',
    'numero_control',
    'periodo_ingreso_id',
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
        const inscripcionActual = usuario.inscripciones?.[0] || null;

        perfil.ciclo_ingreso = usuario.periodoIngreso?.nombre_ciclo || null;
        perfil.semestre_actual = inscripcionActual?.grupo?.grado_semestre || null;
        perfil.grupo_actual = inscripcionActual?.grupo
            ? `${inscripcionActual.grupo.grado_semestre}${inscripcionActual.grupo.division}`
            : null;
        perfil.requiere_configuracion_inicial = !usuario.periodo_ingreso_id
            || !inscripcionActual;
    }

    return perfil;
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR UN USUARIO CON LA INFORMACION NECESARIA PARA SU PERFIL
------------------------------------------------------------------------------------------ */

const obtenerUsuarioConPerfil = async (Modelo, id, tipo) => {
    if (tipo !== 'alumno') {
        return Modelo.findByPk(id);
    }

    return Modelo.findByPk(id, {
        include: [
            {
                model: PeriodoEscolar,
                as: 'periodoIngreso',
                attributes: ['id', 'nombre_ciclo'],
                required: false
            },
            {
                model: HistorialInscripcion,
                as: 'inscripciones',
                attributes: ['id', 'periodo_id'],
                separate: true,
                limit: 1,
                order: [['created_at', 'DESC']],
                include: [{
                    model: Grupo,
                    as: 'grupo',
                    attributes: ['id', 'grado_semestre', 'division']
                }]
            }
        ]
    });
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
METODO PARA OCULTAR LA PRIMERA MITAD DEL NUMERO DE CONTROL DE UN ALUMNO
------------------------------------------------------------------------------------------ */

const ocultarNumeroControl = (numeroControl) => {
    const numero = String(numeroControl || '');
    const mitad = Math.ceil(numero.length / 2);
    return `${'•'.repeat(mitad)}${numero.slice(mitad)}`;
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR UN PERFIL CONSULTABLE SEGUN LOS PERMISOS DEL VISITANTE
------------------------------------------------------------------------------------------ */

const construirPerfilConsultado = (usuario, tipo, solicitante) => {
    if (tipo === 'docente') {
        return {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            imagen: usuario.imagen,
            horas_disponibles: usuario.horas_disponibles,
            tipo
        };
    }

    const esDocente = solicitante.tipo === 'docente';
    const esPropio = solicitante.tipo === 'alumno'
        && String(solicitante.id) === String(usuario.id);
    return {
        ...construirPerfil(usuario, tipo),
        correo: esDocente || esPropio ? usuario.correo : null,
        numero_control: esDocente || esPropio
            ? usuario.numero_control
            : ocultarNumeroControl(usuario.numero_control)
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR UN PERFIL DE DIRECTORIO SIN EXPONER CAMPOS SENSIBLES
------------------------------------------------------------------------------------------ */

const obtenerPerfilConsultado = async (req, res, tipo) => {
    try {
        const id = Number(req.params.id);
        const Modelo = obtenerModeloUsuario(tipo);
        if (!Number.isInteger(id) || id <= 0 || !Modelo) {
            return res.status(400).json({ mensaje: 'El perfil solicitado no es válido' });
        }
        const usuario = await obtenerUsuarioConPerfil(Modelo, id, tipo);
        if (!usuario) return res.status(404).json({ mensaje: 'Perfil no encontrado' });
        const perfil = construirPerfilConsultado(usuario, tipo, req.usuario);
        if (tipo === 'alumno' && req.usuario.tipo === 'docente') {
            const periodo = await PeriodoEscolar.findOne({ where: { activo: true }, attributes: ['id'] });
            const reprobacion = periodo ? await ReprobacionAlumno.findOne({
                where: { alumno_id: usuario.id, periodo_id: periodo.id },
                attributes: ['motivo']
            }) : null;
            perfil.reprobado = Boolean(reprobacion);
            perfil.motivo_reprobacion = reprobacion?.motivo || null;
        }
        return res.status(200).json({ usuario: perfil });
    } catch (error) {
        console.error('Error al consultar perfil de directorio:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible consultar el perfil' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL PERFIL PUBLICO DE UN DOCENTE
------------------------------------------------------------------------------------------ */

export const obtenerPerfilDocente = async (req, res) => {
    return obtenerPerfilConsultado(req, res, 'docente');
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL PERFIL PROTEGIDO DE UN ALUMNO
------------------------------------------------------------------------------------------ */

export const obtenerPerfilAlumno = async (req, res) => {
    return obtenerPerfilConsultado(req, res, 'alumno');
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

        const usuario = await obtenerUsuarioConPerfil(Modelo, id, tipo);

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

        const usuario = await obtenerUsuarioConPerfil(Modelo, id, tipo);

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

            const periodoActivo = await PeriodoEscolar.findOne({ where: { activo: true } });
            const horasOcupadas = periodoActivo
                ? await Horario.count({
                    where: { docente_id: usuario.id, periodo_id: periodoActivo.id }
                })
                : 0;
            if (horasDisponibles < horasOcupadas) {
                return res.status(409).json({
                    mensaje: `No puedes reducir la disponibilidad por debajo de las ${horasOcupadas} horas ya asignadas`
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
