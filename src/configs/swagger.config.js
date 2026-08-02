const respuestaMensaje = {
    type: 'object',
    properties: { mensaje: { type: 'string' } }
};
const seguridad = [{ bearerAuth: [] }];

/* ------------------------------------------------------------------------------------------
METODO PARA DESCRIBIR UN CUERPO JSON DENTRO DE LA DOCUMENTACION
------------------------------------------------------------------------------------------ */

const json = (schema, descripcion = 'Datos de la solicitud') => ({
    required: true,
    content: { 'application/json': { schema, description: descripcion } }
});

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UNA RESPUESTA DOCUMENTADA CON UNA DESCRIPCION BREVE
------------------------------------------------------------------------------------------ */

const respuesta = (descripcion) => ({ description: descripcion });

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LA ESPECIFICACION OPENAPI COMPLETA DEL SERVIDOR
------------------------------------------------------------------------------------------ */

export const crearDocumentacionSwagger = () => ({
        openapi: '3.0.3',
        info: {
            title: 'API SiCECOBAEJ',
            version: '2.0.0',
            description: 'Documentación en español de autenticación, perfiles, catálogo académico, cursos, actividades, calificaciones y kardex.'
        },
        servers: [{ url: '/sicecobaej', description: 'Servidor actual' }],
        tags: [
            { name: 'Autenticación', description: 'Registro, acceso y verificación de cuentas' },
            { name: 'Perfil', description: 'Consulta y edición de datos no sensibles' },
            { name: 'Académico', description: 'Listados, materias y configuración inicial' },
            { name: 'Cursos', description: 'Cursos por materia, grupo y periodo' },
            { name: 'Actividades', description: 'Actividades, rúbricas y materiales de apoyo' },
            { name: 'Calificaciones', description: 'Evaluaciones normalizadas y kardex' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            },
            schemas: {
                Mensaje: respuestaMensaje,
                Credenciales: {
                    type: 'object', required: ['correo', 'clave'],
                    properties: { correo: { type: 'string', format: 'email' }, clave: { type: 'string', format: 'password' } }
                },
                RegistroAlumno: {
                    type: 'object', required: ['nombre', 'correo', 'clave', 'numero_control'],
                    properties: {
                        nombre: { type: 'string' }, correo: { type: 'string', format: 'email' },
                        clave: { type: 'string', format: 'password' }, numero_control: { type: 'string' }
                    }
                },
                RegistroDocente: {
                    type: 'object', required: ['nombre', 'correo', 'clave', 'clave_docente'],
                    properties: {
                        nombre: { type: 'string' }, correo: { type: 'string', format: 'email' },
                        clave: { type: 'string', format: 'password' }, clave_docente: { type: 'string' }
                    }
                },
                Paginacion: {
                    type: 'object', properties: {
                        pagina: { type: 'integer' }, porPagina: { type: 'integer' },
                        totalRegistros: { type: 'integer' }, totalPaginas: { type: 'integer' }
                    }
                },
                Materia: {
                    type: 'object', required: ['nombre', 'grado_semestre', 'horas_semanales'],
                    properties: {
                        nombre: { type: 'string' }, grado_semestre: { type: 'string', enum: ['1', '2', '3', '4', '5', '6'] },
                        horas_semanales: { type: 'integer' }, docentes_ids: { type: 'array', items: { type: 'integer' } }
                    }
                },
                Curso: {
                    type: 'object', required: ['materia_id', 'grupo_id'],
                    properties: {
                        materia_id: { type: 'integer' }, grupo_id: { type: 'integer' },
                        docentes_ids: { type: 'array', items: { type: 'integer' } }
                    }
                },
                CalificacionActividad: {
                    type: 'object', required: ['inscripcion_materia_id', 'puntos_obtenidos'],
                    properties: {
                        inscripcion_materia_id: { type: 'integer' }, puntos_obtenidos: { type: 'number' },
                        observaciones: { type: 'string' }, rubricas: { type: 'array', items: { type: 'object' } }
                    }
                },
                Kardex: {
                    type: 'object',
                    description: 'Kardex parcial o completo construido únicamente con la información disponible.',
                    properties: {
                        alumno: { type: 'object', description: 'Datos disponibles del alumno.' },
                        materias: {
                            type: 'array',
                            description: 'Materias inscritas con tres unidades. Las calificaciones pendientes se entregan como null.',
                            items: { type: 'object' }
                        },
                        resumen: {
                            type: 'object',
                            properties: {
                                materiasRegistradas: { type: 'integer' },
                                unidadesCalificadas: { type: 'integer' },
                                totalUnidades: { type: 'integer' },
                                parcial: { type: 'boolean' }
                            }
                        }
                    }
                }
            }
        },
        paths: {
            '/auth/login-alumno': { post: { tags: ['Autenticación'], summary: 'Iniciar sesión como alumno', requestBody: json({ $ref: '#/components/schemas/Credenciales' }), responses: { 200: respuesta('Sesión iniciada'), 403: respuesta('Cuenta sin verificar'), 401: respuesta('Credenciales incorrectas') } } },
            '/auth/login-docente': { post: { tags: ['Autenticación'], summary: 'Iniciar sesión como docente', requestBody: json({ $ref: '#/components/schemas/Credenciales' }), responses: { 200: respuesta('Sesión iniciada'), 403: respuesta('Cuenta sin verificar'), 401: respuesta('Credenciales incorrectas') } } },
            '/auth/signup-alumno': { post: { tags: ['Autenticación'], summary: 'Registrar una cuenta de alumno', requestBody: json({ $ref: '#/components/schemas/RegistroAlumno' }), responses: { 201: respuesta('Cuenta creada y código enviado'), 409: respuesta('Correo o control ya registrado') } } },
            '/auth/signup-docente': { post: { tags: ['Autenticación'], summary: 'Registrar una cuenta docente mediante clave única', requestBody: json({ $ref: '#/components/schemas/RegistroDocente' }), responses: { 201: respuesta('Cuenta creada y código enviado'), 409: respuesta('Cuenta o clave no disponible') } } },
            '/auth/verificar-codigo': { post: { tags: ['Autenticación'], summary: 'Verificar el código recibido por correo', security: seguridad, requestBody: json({ type: 'object', required: ['codigo'], properties: { codigo: { type: 'string' } } }), responses: { 200: respuesta('Cuenta verificada'), 400: respuesta('Código incorrecto o vencido') } } },
            '/auth/reenviar-codigo': { post: { tags: ['Autenticación'], summary: 'Reenviar el código con cooldown de cinco minutos', security: seguridad, responses: { 200: respuesta('Código reenviado'), 429: respuesta('Cooldown vigente') } } },
            '/auth/verificar-token': { get: { tags: ['Autenticación'], summary: 'Confirmar que el token de sesión sigue vigente', security: seguridad, responses: { 200: respuesta('Token vigente'), 401: respuesta('Token inválido') } } },
            '/perfil/me': {
                get: { tags: ['Perfil'], summary: 'Obtener el perfil propio', security: seguridad, responses: { 200: respuesta('Perfil del usuario') } },
                patch: { tags: ['Perfil'], summary: 'Actualizar datos no sensibles e imagen del perfil', security: seguridad, requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { nombre: { type: 'string' }, horas_disponibles: { type: 'integer' }, imagen: { type: 'string', format: 'binary' } } } } } }, responses: { 200: respuesta('Perfil actualizado') } }
            },
            '/academico/docentes': { get: { tags: ['Académico'], summary: 'Listar docentes con paginación', security: seguridad, parameters: [{ in: 'query', name: 'pagina', schema: { type: 'integer' } }, { in: 'query', name: 'limite', schema: { type: 'integer' } }], responses: { 200: respuesta('Listado de docentes') } } },
            '/academico/alumnos': { get: { tags: ['Académico'], summary: 'Listar alumnos aplicando privacidad según el rol', security: seguridad, responses: { 200: respuesta('Listado protegido de alumnos') } } },
            '/academico/materias': {
                get: { tags: ['Académico'], summary: 'Listar materias y docentes asignados', security: seguridad, responses: { 200: respuesta('Listado de materias') } },
                post: { tags: ['Académico'], summary: 'Crear una materia y sus asignaciones docentes', security: seguridad, requestBody: json({ $ref: '#/components/schemas/Materia' }), responses: { 201: respuesta('Materia creada'), 403: respuesta('Solo docentes') } }
            },
            '/academico/materias/{id}': { patch: { tags: ['Académico'], summary: 'Editar una materia y sus asignaciones', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: json({ $ref: '#/components/schemas/Materia' }), responses: { 200: respuesta('Materia actualizada') } } },
            '/academico/configuracion-inicial': {
                get: { tags: ['Académico'], summary: 'Obtener ciclos y grupos para el primer acceso del alumno', security: seguridad, responses: { 200: respuesta('Opciones disponibles') } },
                post: { tags: ['Académico'], summary: 'Guardar ciclo de ingreso y grupo actual', security: seguridad, requestBody: json({ type: 'object', required: ['periodo_ingreso_id', 'grupo_id'], properties: { periodo_ingreso_id: { type: 'integer' }, grupo_id: { type: 'integer' } } }), responses: { 200: respuesta('Configuración completada') } }
            },
            '/cursos': {
                get: { tags: ['Cursos'], summary: 'Listar cursos visibles para el usuario', security: seguridad, responses: { 200: respuesta('Cursos paginados') } },
                post: { tags: ['Cursos'], summary: 'Crear un curso para una materia y grupo compatibles', security: seguridad, requestBody: json({ $ref: '#/components/schemas/Curso' }), responses: { 201: respuesta('Curso creado') } }
            },
            '/cursos/opciones': { get: { tags: ['Cursos'], summary: 'Obtener materias y grupos disponibles para crear cursos', security: seguridad, responses: { 200: respuesta('Opciones de curso') } } },
            '/cursos/{id}': { get: { tags: ['Cursos'], summary: 'Obtener unidades y actividades de un curso autorizado', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: respuesta('Detalle del curso'), 403: respuesta('Inscripción requerida') } } },
            '/cursos/{id}/inscripcion': { post: { tags: ['Cursos'], summary: 'Inscribirse en un curso del grupo propio', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 201: respuesta('Inscripción completada'), 403: respuesta('Grupo incompatible') } } },
            '/cursos/{id}/alumnos': { get: { tags: ['Cursos'], summary: 'Listar alumnos inscritos en un curso administrado', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: respuesta('Alumnos inscritos') } } },
            '/cursos/{id}/actividades': { post: { tags: ['Actividades'], summary: 'Crear actividad con unidad, rúbricas y hasta cinco materiales', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['unidad_curso_id', 'titulo', 'fecha_cierre', 'valor_maximo'], properties: { unidad_curso_id: { type: 'integer' }, titulo: { type: 'string' }, descripcion: { type: 'string' }, fecha_inicio: { type: 'string', format: 'date-time' }, fecha_cierre: { type: 'string', format: 'date-time' }, valor_maximo: { type: 'number' }, rubricas: { type: 'string', description: 'Arreglo JSON de rúbricas' }, archivos: { type: 'array', maxItems: 5, items: { type: 'string', format: 'binary' } } } } } } }, responses: { 201: respuesta('Actividad creada'), 400: respuesta('Archivo o datos inválidos'), 503: respuesta('Storage no disponible o sin permisos') } } },
            '/cursos/{id}/actividades/{actividadId}': { get: { tags: ['Actividades'], summary: 'Obtener actividad, rúbricas y enlaces temporales de materiales', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }, { in: 'path', name: 'actividadId', required: true, schema: { type: 'integer' } }], responses: { 200: respuesta('Detalle de actividad') } } },
            '/calificaciones/curso/{id}': { get: { tags: ['Calificaciones'], summary: 'Consultar calificaciones del curso con filtro por rol', security: seguridad, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: respuesta('Calificaciones normalizadas') } } },
            '/calificaciones/actividades/{actividadId}': { put: { tags: ['Calificaciones'], summary: 'Registrar o actualizar una calificación y su rúbrica', security: seguridad, parameters: [{ in: 'path', name: 'actividadId', required: true, schema: { type: 'integer' } }], requestBody: json({ $ref: '#/components/schemas/CalificacionActividad' }), responses: { 200: respuesta('Calificación guardada') } } },
            '/calificaciones/kardex/propio': { get: { tags: ['Calificaciones'], summary: 'Obtener el kardex disponible del alumno autenticado', description: 'Genera el kardex aunque existan materias o unidades pendientes. Las calificaciones todavía no capturadas se devuelven como null.', security: seguridad, responses: { 200: { description: 'Kardex parcial o completo', content: { 'application/json': { schema: { $ref: '#/components/schemas/Kardex' } } } } } } },
            '/calificaciones/kardex/alumnos': { get: { tags: ['Calificaciones'], summary: 'Listar alumnos relacionados con el docente', security: seguridad, responses: { 200: respuesta('Alumnos disponibles') } } },
            '/calificaciones/kardex/alumnos/{alumnoId}': { get: { tags: ['Calificaciones'], summary: 'Obtener el kardex disponible de un alumno relacionado', description: 'Comprueba mediante la relación directa entre cursos, docentes e inscripciones que el docente haya impartido clase al alumno. Genera el kardex con los datos académicos existentes, aunque falten materias o calificaciones.', security: seguridad, parameters: [{ in: 'path', name: 'alumnoId', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Kardex parcial o completo', content: { 'application/json': { schema: { $ref: '#/components/schemas/Kardex' } } } }, 403: respuesta('Sin relación académica'), 500: respuesta('Error al construir el kardex') } } }
        }
});
