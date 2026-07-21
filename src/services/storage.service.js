import { supabase } from '../configs/supabaseClient.js';

/**
 * Suba un archivo en buffer desde Multer hacia Supabase Storage
 * @param {Express.Multer.File} file - Objeto de archivo entregado por Multer
 * @param {string} carpeta - Nombre de la carpeta interna (ej: 'docentes', 'alumnos')
 * @returns {Promise<string>} URL pública del archivo subido
 */
export const subirArchivoSupabase = async (file, carpeta = 'general') => {
    if (!file) return null;

    // Generar un nombre único para evitar colisiones
    const sufijoUnico = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const nombreLimpio = file.originalname.replace(/\s+/g, '_');
    const rutaDestino = `${carpeta}/${sufijoUnico}-${nombreLimpio}`;

    // 1. Subir el buffer del archivo a Supabase Storage
    const { data, error } = await supabase.storage
        .from('uploads') // Debe coincidir con el nombre de tu bucket en Supabase
        .upload(rutaDestino, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        throw new Error(`Error al subir imagen a Supabase Storage: ${error.message}`);
    }

    // 2. Obtener y retornar la URL pública
    const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(rutaDestino);

    return publicUrlData.publicUrl;
};