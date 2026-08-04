# SiCECOBAEJ 65 - Servidor

API de control escolar construida con Node.js, Express, Sequelize, PostgreSQL y Supabase Storage.

## Puesta en marcha

1. Ejecuta `cobaej_control_postgres_configuracion_reprobaciones_ciclos.sql` en PostgreSQL. El archivo elimina y reconstruye todas las estructuras de la aplicación y, por lo tanto, también elimina sus datos actuales.
2. Configura `SUPABASE_MATERIALES_BUCKET=materiales-academicos` y utiliza una `SUPABASE_KEY` de servidor con permisos administrativos de Storage.
3. El servidor creará automáticamente el bucket privado si todavía no existe. También puedes crearlo manualmente desde Supabase.
4. Ejecuta `pnpm install`.
5. Inicia desarrollo con `pnpm dev` o producción con `pnpm start`.

## Documentación Swagger

Con el servidor activo, la documentación interactiva está disponible en:

- `/sicecobaej/docs`
- `/sicecobaej/docs.json`

La especificación cubre autenticación, verificación, configuración sensible, perfil, reprobaciones, materias por ciclo, cursos, actividades, calificaciones, horarios y kardex.

## Configuración sensible

El correo, la contraseña, el número de control, la clave docente y el ciclo de ingreso se actualizan desde una ruta protegida que exige la contraseña actual. Un cambio de correo invalida la sesión y obliga a verificar nuevamente la cuenta. Las claves docentes solo pueden asignarse cuando existen y se encuentran libres.

## Reprobaciones y avance semestral

Cada reprobación se registra por alumno y ciclo. Al activar otro ciclo, el cálculo del semestre descuenta todas las reprobaciones anteriores, por lo que un alumno puede permanecer en el mismo semestre las veces necesarias. Retirar el estado durante el ciclo elimina únicamente ese registro semestral.

## Kardex parcial

El kardex se genera con toda la información disponible del alumno. No requiere que estén capturadas las tres unidades ni que todas las materias tengan calificación. Las unidades faltantes se devuelven como pendientes y la respuesta incluye un resumen que indica si el documento es parcial.

Los docentes pueden consultar y exportar el kardex de cualquier alumno registrado. El alumno únicamente puede consultar su propio historial.

## Ciclo activo y horarios

Solo un periodo escolar puede estar activo. Al cambiarlo, el servidor cierra los cursos de otros periodos, habilita los del ciclo seleccionado, conserva la división del alumno y calcula su nuevo semestre, incluyendo reprobaciones, para crear el historial correspondiente.

Las materias y los cursos pertenecen a un ciclo específico. Una materia nueva utiliza automáticamente el ciclo activo. Las materias o cursos históricos pueden consultarse, pero las actividades y calificaciones solo se modifican cuando su curso pertenece al ciclo activo.

Los horarios se construyen mediante módulos configurables y celdas semanales. Cada celda cuenta como una hora. La API y PostgreSQL impiden que un docente supere sus horas disponibles, que una materia exceda sus horas semanales, que un docente ocupe dos grupos en el mismo módulo o que un grupo tenga dos clases simultáneas.

## Cálculo de calificaciones

Cada unidad se normaliza sobre 100:

`suma de puntos obtenidos / suma de puntos posibles de actividades calificadas * 100`

Las actividades pendientes no se incorporan al cálculo. Un cero debe registrarse explícitamente. La calificación general de una materia es el promedio de las unidades que ya cuentan con al menos una actividad calificada.

## Materiales de actividades

Los docentes pueden adjuntar hasta cinco archivos PDF, JPG, PNG o WEBP de 10 MB cada uno. El servidor almacena únicamente la ruta privada y entrega enlaces firmados temporales después de comprobar el acceso al curso.

No utilices una clave pública o `anon` como `SUPABASE_KEY` del servidor. La clave debe permanecer únicamente en Render y nunca formar parte del cliente.
