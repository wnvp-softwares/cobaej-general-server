import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_VERIFICATION_EXPIRES_IN = '15m';

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UN TOKEN DE SESION AUTENTICADA
------------------------------------------------------------------------------------------ */

export const generarToken = (payload) => {
    return jwt.sign(
        { ...payload, scope: 'auth' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UN TOKEN TEMPORAL LIMITADO A LA VERIFICACION
------------------------------------------------------------------------------------------ */

export const generarTokenVerificacion = (payload) => {
    return jwt.sign(
        { ...payload, scope: 'verification' },
        JWT_SECRET,
        { expiresIn: JWT_VERIFICATION_EXPIRES_IN }
    );
};

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR Y DECODIFICAR UN TOKEN
------------------------------------------------------------------------------------------ */

export const verificarToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};
