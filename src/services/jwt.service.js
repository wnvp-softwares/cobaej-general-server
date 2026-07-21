import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const generarToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }); // Generamos el token con datos escenciales del usuario y la informacion preestablecida de credenciales por lado del servidor
};

export const verificarToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.log(
            'El token proporcionado es invalido, o en su defecto, ya expiro'
        );
    }
};