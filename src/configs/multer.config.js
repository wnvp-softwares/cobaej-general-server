import multer from 'multer';

const almacen = multer.memoryStorage();

const filtroArchivo = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato no soportado. Solo se permiten imágenes.'), false);
    }
};

export const upload = multer({
    storage: almacen,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: filtroArchivo
});