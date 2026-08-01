import { supabase } from '../configs/supabaseClient.js';

const BUCKET_PUBLICO = process.env.SUPABASE_UPLOADS_BUCKET || 'uploads';
const BUCKET_MATERIALES = process.env.SUPABASE_MATERIALES_BUCKET || 'materiales-academicos';

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR EL NOMBRE DE UN ARCHIVO ANTES DE ALMACENARLO
------------------------------------------------------------------------------------------ */

const limpiarNombreArchivo = (nombre) => nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UNA RUTA UNICA DENTRO DE SUPABASE STORAGE
------------------------------------------------------------------------------------------ */

const generarRuta = (archivo, carpeta) => {
    const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${carpeta}/${sufijo}-${limpiarNombreArchivo(archivo.originalname)}`;
};

/* ------------------------------------------------------------------------------------------
METODO PARA SUBIR UNA IMAGEN PUBLICA DE PERFIL A SUPABASE STORAGE
------------------------------------------------------------------------------------------ */

export const subirArchivoSupabase = async (archivo, carpeta = 'general') => {
    if (!archivo) return null;

    const rutaDestino = generarRuta(archivo, carpeta);
    const { error } = await supabase.storage.from(BUCKET_PUBLICO).upload(
        rutaDestino,
        archivo.buffer,
        { contentType: archivo.mimetype, upsert: false }
    );

    if (error) {
        throw new Error(`Error al subir imagen a Supabase Storage: ${error.message}`);
    }

    return supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(rutaDestino).data.publicUrl;
};

/* ------------------------------------------------------------------------------------------
METODO PARA SUBIR UN MATERIAL PRIVADO DE REFERENCIA DE UNA ACTIVIDAD
------------------------------------------------------------------------------------------ */

export const subirMaterialPrivado = async (archivo, cursoId) => {
    const rutaDestino = generarRuta(archivo, `cursos/${cursoId}/actividades`);
    const { error } = await supabase.storage.from(BUCKET_MATERIALES).upload(
        rutaDestino,
        archivo.buffer,
        { contentType: archivo.mimetype, upsert: false }
    );

    if (error) {
        throw new Error(`No fue posible guardar el material: ${error.message}`);
    }

    return rutaDestino;
};

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UNA URL TEMPORAL DE DESCARGA PARA UN MATERIAL AUTORIZADO
------------------------------------------------------------------------------------------ */

export const obtenerUrlFirmadaMaterial = async (ruta, segundos = 900) => {
    const { data, error } = await supabase.storage
        .from(BUCKET_MATERIALES)
        .createSignedUrl(ruta, segundos);

    if (error) {
        throw new Error(`No fue posible generar el enlace del material: ${error.message}`);
    }

    return data.signedUrl;
};

/* ------------------------------------------------------------------------------------------
METODO PARA ELIMINAR MATERIALES PRIVADOS CUANDO UNA OPERACION NO SE COMPLETA
------------------------------------------------------------------------------------------ */

export const eliminarMaterialesPrivados = async (rutas = []) => {
    if (!rutas.length) return;

    const { error } = await supabase.storage.from(BUCKET_MATERIALES).remove(rutas);
    if (error) {
        console.error('No fue posible limpiar materiales de Storage:', error.message);
    }
};
