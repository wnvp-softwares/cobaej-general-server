# SiCECOBAEJ 65 - Servidor

API de control escolar construida con Node.js, Express, Sequelize, PostgreSQL y Supabase Storage.

## Puesta en marcha

1. Ejecuta `cobaej_control_postgres_cursos.sql` en PostgreSQL. El archivo elimina y reconstruye todas las estructuras de la aplicación y, por lo tanto, también elimina sus datos actuales.
2. Configura `SUPABASE_MATERIALES_BUCKET=materiales-academicos` y utiliza una `SUPABASE_KEY` de servidor con permisos administrativos de Storage.
3. El servidor creará automáticamente el bucket privado si todavía no existe. También puedes crearlo manualmente desde Supabase.
4. Ejecuta `pnpm install`.
5. Inicia desarrollo con `pnpm dev` o producción con `pnpm start`.

## Documentación Swagger

Con el servidor activo, la documentación interactiva está disponible en:

- `/sicecobaej/docs`
- `/sicecobaej/docs.json`

La especificación cubre autenticación, verificación, perfil, listados académicos, materias, cursos, actividades, calificaciones y kardex.

## Kardex parcial

El kardex se genera con toda la información disponible del alumno. No requiere que estén capturadas las tres unidades ni que todas las materias tengan calificación. Las unidades faltantes se devuelven como pendientes y la respuesta incluye un resumen que indica si el documento es parcial.

Los docentes pueden consultar y exportar el kardex de alumnos inscritos en cursos que imparten o impartieron. La autorización se valida directamente mediante las relaciones entre `docentes_cursos`, `inscripciones_materias` e `historial_inscripciones`.

## Cálculo de calificaciones

Cada unidad se normaliza sobre 100:

`suma de puntos obtenidos / suma de puntos posibles de actividades calificadas * 100`

Las actividades pendientes no se incorporan al cálculo. Un cero debe registrarse explícitamente. La calificación general de una materia es el promedio de las unidades que ya cuentan con al menos una actividad calificada.

## Materiales de actividades

Los docentes pueden adjuntar hasta cinco archivos PDF, JPG, PNG o WEBP de 10 MB cada uno. El servidor almacena únicamente la ruta privada y entrega enlaces firmados temporales después de comprobar el acceso al curso.

No utilices una clave pública o `anon` como `SUPABASE_KEY` del servidor. La clave debe permanecer únicamente en Render y nunca formar parte del cliente.
