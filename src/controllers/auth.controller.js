import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { generarToken } from '../services/jwt.service.js';
import { enviarCodigo } from '../services/mailer.service.js';
import { Docente, Alumno } from '../models/index.js';

/* ------------------------------------------------------------------------------------------
METODO PARA LA CREACION Y REGISTRO DE NUEVOS DOCENTES
------------------------------------------------------------------------------------------ */

export const crearDocente = async (req, res) => {
    try {
        const { nombre, correo, clave, claveConfirmar } = req.body;

        if (!nombre || !correo || !clave || !claveConfirmar) {
            return res.status(400).json({
                mensaje: 'Todos los campos son obligatorios'
            });
        }

        const usuarioExistente = await Docente.findOne({
            where: {
                [Op.or]: [{ correo: correo }, { nombre: nombre }]
            }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                mensaje: 'El nombre de usuario o el correo ya están registrados y en uso'
            });
        }

        if (clave !== claveConfirmar) {
            return res.status(400).json({
                mensaje: 'Las contraseñas no coinciden'
            });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const contrasenaHash = await bcrypt.hash(clave, 10);

        await Docente.create({
            nombre: nombre,
            correo: correo,
            clave: contrasenaHash,
            verificado: 0,
            codigo_verificacion: codigo,
            horas_disponibles: 20,
        });

        await enviarCodigo(correo, codigo);

        return res.status(201).json({
            mensaje: 'Usuario creado con éxito. Revisa tu bandeja para el código de verificación',
            correo: correo,
            tipo: 'docente'
        });

    } catch (error) {
        console.error('Error al crear nuevo Docente en auth.controller.js:\n', error.message || error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor al crear nuevo Docente'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LA CREACION Y REGISTRO DE NUEVOS ALUMNOS
------------------------------------------------------------------------------------------ */

export const crearAlumno = async (req, res) => {
    try {
        const { nombre, correo, clave, claveConfirmar } = req.body;

        if (!nombre || !correo || !clave || !claveConfirmar) {
            return res.status(400).json({
                mensaje: 'Todos los campos son obligatorios'
            });
        }

        const usuarioExistente = await Alumno.findOne({
            where: {
                [Op.or]: [{ correo: correo }, { nombre: nombre }]
            }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                mensaje: 'El nombre de usuario o el correo ya están registrados y en uso'
            });
        }

        if (clave !== claveConfirmar) {
            return res.status(400).json({
                mensaje: 'Las contraseñas no coinciden'
            });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const contrasenaHash = await bcrypt.hash(clave, 10);

        await Alumno.create({
            nombre: nombre,
            correo: correo,
            clave: contrasenaHash,
            verificado: 0,
            numero_control: ' ',
            codigo_verificacion: codigo,
            fecha_ingreso: new Date(),
        });

        await enviarCodigo(correo, codigo);

        return res.status(201).json({
            mensaje: 'Usuario creado con éxito. Revisa tu bandeja para el código de verificación',
            correo: correo,
            tipo: 'alumno'
        });

    } catch (error) {
        console.error('Error al crear nuevo Alumno en auth.controller.js:\n', error.message || error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor al crear nuevo Alumno'
        });
    }
};

/* ------------------------------------------------------------------------------------------
VERIFICACION DEL CODIGO DE SEGURIDAD ENVIADO
------------------------------------------------------------------------------------------ */

export const verificarCodigo = async (req, res) => {
    try {
        const { correo, tipo, codigo } = req.body;

        const Modelo = tipo === 'docente' ? Docente : Alumno;
        const usuario = await Modelo.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado en la base de datos' });
        }

        if (usuario.codigo_verificacion === codigo) {
            usuario.verificado = 1;
            usuario.codigo_verificacion = '';
            await usuario.save();

            // Creamos un payload limpio para firmar tu JWT
            const payload = {
                id: usuario.id,
                nombre: usuario.nombre,
            };

            const token = generarToken(payload);

            return res.status(200).json({
                mensaje: 'Cuenta verificada correctamente',
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo
                },
                token: token
            });
        } else {
            return res.status(400).json({ mensaje: 'El código ingresado es incorrecto' });
        }

    } catch (error) {
        console.error('Error al verificar la cuenta en auth.controller.js:\n', error.message || error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al verificar el código de seguridad' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LOGIN
------------------------------------------------------------------------------------------ */

export const loginDocente = async (req, res) => {
    try {
        const { correo, clave } = req.body;
        const docente = await Docente.findOne({ where: { correo: correo } });

        if (!docente) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

        if (!docente.verificado) return res.status(403).json({ mensaje: 'Debes verificar tu cuenta primero' });

        const claveValida = await bcrypt.compare(clave, docente.clave);

        if (!claveValida) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

        const payload = {
            id: docente.id,
            nombre: docente.nombre,
            tipo: 'docente'
        };

        const token = generarToken(payload);

        return res.status(200).json({
            mensaje: 'Inicio de sesion exitoso',
            usuario: {
                id: docente.id,
                nombre: docente.nombre,
                correo: docente.correo,
                imagen: docente.imagen
            },
            tipo: 'docente',
            token: token
        });
    } catch (error) {
        console.error('Error al validar el Login del Docente en auth.controller.js\n', error.message || error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al validar el Login Docente' });
    }
};

export const loginAlumno = async (req, res) => {
    try {
        const { correo, clave } = req.body;
        const alumno = await Alumno.findOne({ where: { correo: correo } });

        if (!alumno) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

        if (!alumno.verificado) return res.status(403).json({ mensaje: 'Debes verificar tu cuenta primero' });

        const claveValida = await bcrypt.compare(clave, alumno.clave);

        if (!claveValida) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

        const payload = {
            id: alumno.id,
            nombre: alumno.nombre,
            tipo: 'alumno'
        };

        const token = generarToken(payload);

        return res.status(200).json({
            mensaje: 'Inicio de sesion exitoso',
            usuario: {
                id: alumno.id,
                nombre: alumno.nombre,
                correo: alumno.correo,
                imagen: alumno.imagen
            },
            tipo: 'alumno',
            token: token
        });
    } catch (error) {
        console.error('Error al validar el Login del Alumno en auth.controller.js\n', error.message || error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al validar el Login Alumno' });
    }
};