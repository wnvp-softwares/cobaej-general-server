import multer from 'multer';

const almacen = multer.memoryStorage();
const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR EL FORMATO DE LAS IMAGENES RECIBIDAS
------------------------------------------------------------------------------------------ */

const filtroArchivo = (req, file, cb) => {
    if (FORMATOS_PERMITIDOS.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error('Formato no soportado. Utiliza una imagen JPG, PNG o WEBP.'),
            false
        );
    }
};

export const upload = multer({
    storage: almacen,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: filtroArchivo
});
