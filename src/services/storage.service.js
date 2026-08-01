import { supabase } from '../configs/supabaseClient.js';

const BUCKET_PUBLICO = process.env.SUPABASE_UPLOADS_BUCKET || 'uploads';
const BUCKET_MATERIALES = process.env.SUPABASE_MATERIALES_BUCKET || 'materiales-academicos';
const TAMANO_MAXIMO_MATERIAL = 10 * 1024 * 1024;
const FORMATOS_MATERIALES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];
let promesaBucketMateriales = null;

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UN ERROR IDENTIFICABLE DE CONFIGURACION DE STORAGE
------------------------------------------------------------------------------------------ */

const crearErrorStorage = (mensaje, errorOriginal = null) => {
    const error = new Error(mensaje);
    error.codigo = 'STORAGE_NO_DISPONIBLE';
    error.statusCode = 503;
    error.cause = errorOriginal;
    return error;
};

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
METODO PARA CREAR O CORREGIR EL BUCKET PRIVADO DE MATERIALES ACADEMICOS
------------------------------------------------------------------------------------------ */

export const asegurarBucketMateriales = async () => {
    if (promesaBucketMateriales) return promesaBucketMateriales;

    promesaBucketMateriales = (async () => {
        const { data: buckets, error: errorConsulta } = await supabase.storage.listBuckets();

        if (errorConsulta) {
            throw crearErrorStorage(
                'No fue posible validar Supabase Storage. Revisa SUPABASE_URL y SUPABASE_KEY.',
                errorConsulta
            );
        }

        const bucket = buckets.find((registro) => registro.name === BUCKET_MATERIALES);
        const configuracion = {
            public: false,
            fileSizeLimit: TAMANO_MAXIMO_MATERIAL,
            allowedMimeTypes: FORMATOS_MATERIALES
        };

        if (!bucket) {
            const { error: errorCreacion } = await supabase.storage.createBucket(
                BUCKET_MATERIALES,
                configuracion
            );

            if (errorCreacion) {
                throw crearErrorStorage(
                    `No existe el bucket "${BUCKET_MATERIALES}" y la clave del servidor no pudo crearlo. Utiliza una clave service_role o créalo manualmente como privado.`,
                    errorCreacion
                );
            }

            return true;
        }

        if (bucket.public) {
            const { error: errorActualizacion } = await supabase.storage.updateBucket(
                BUCKET_MATERIALES,
                configuracion
            );

            if (errorActualizacion) {
                throw crearErrorStorage(
                    `El bucket "${BUCKET_MATERIALES}" debe ser privado y no fue posible actualizarlo.`,
                    errorActualizacion
                );
            }
        }

        return true;
    })().catch((error) => {
        promesaBucketMateriales = null;
        throw error;
    });

    return promesaBucketMateriales;
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
    await asegurarBucketMateriales();
    const rutaDestino = generarRuta(archivo, `cursos/${cursoId}/actividades`);
    const { error } = await supabase.storage.from(BUCKET_MATERIALES).upload(
        rutaDestino,
        archivo.buffer,
        { contentType: archivo.mimetype, upsert: false }
    );

    if (error) {
        throw crearErrorStorage(
            `No fue posible guardar el material en el bucket "${BUCKET_MATERIALES}": ${error.message}`,
            error
        );
    }

    return rutaDestino;
};

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UNA URL TEMPORAL DE DESCARGA PARA UN MATERIAL AUTORIZADO
------------------------------------------------------------------------------------------ */

export const obtenerUrlFirmadaMaterial = async (ruta, segundos = 900) => {
    await asegurarBucketMateriales();
    const { data, error } = await supabase.storage
        .from(BUCKET_MATERIALES)
        .createSignedUrl(ruta, segundos);

    if (error) {
        throw crearErrorStorage(
            `No fue posible generar el enlace temporal del material: ${error.message}`,
            error
        );
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
