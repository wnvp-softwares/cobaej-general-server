import multer from 'multer';

const almacen = multer.memoryStorage();
const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const FORMATOS_MATERIALES = [...FORMATOS_PERMITIDOS, 'application/pdf'];

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

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR PDF E IMAGENES USADAS COMO MATERIAL DE UNA ACTIVIDAD
------------------------------------------------------------------------------------------ */

const filtroMaterial = (req, file, cb) => {
    if (FORMATOS_MATERIALES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato no soportado. Utiliza PDF, JPG, PNG o WEBP.'), false);
    }
};

export const upload = multer({
    storage: almacen,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: filtroArchivo
});

export const uploadMateriales = multer({
    storage: almacen,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    },
    fileFilter: filtroMaterial
});
