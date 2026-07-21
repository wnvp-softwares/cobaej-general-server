import sequelize from './src/configs/database.config.js';
import { supabase } from './src/configs/supabaseClient.js';

async function ejecutarPruebas() {
    console.log('\n========================================');
    console.log('INICIANDO PRUEBAS DE CONEXION');
    console.log('========================================\n');

    // -----------------------------------------------------------------
    // PRUEBA 1: Sequelize (Base de Datos PostgreSQL)
    // -----------------------------------------------------------------
    try {
        await sequelize.authenticate();
        console.log('[1/2] Sequelize: Conexion con PostgreSQL (Supabase) EXITOSA.');

        // Consulta de prueba a una de las tablas creadas en el SQL
        const [resultados] = await sequelize.query('SELECT COUNT(*) FROM docentes;');
        console.log(`[1/2] Sequelize Query: Total de registros en "docentes": ${resultados[0].count}`);
    } catch (error) {
        console.error('[1/2] Sequelize ERROR:', error.message);
    }

    console.log('\n----------------------------------------\n');

    // -----------------------------------------------------------------
    // PRUEBA 2: SDK de Supabase (Cliente / Storage / REST API)
    // -----------------------------------------------------------------
    try {
        // Hacemos un ping simple leyendo la tabla 'materias'
        const { data, error } = await supabase
            .from('materias')
            .select('*')
            .limit(1);

        if (error) {
            console.error('[2/2] Supabase SDK ERROR:', error.message);
        } else {
            console.log('[2/2] Supabase SDK: Conexion EXITOSA.');
            console.log('[2/2] Datos recibidos de la tabla "materias":', data);
        }
    } catch (error) {
        console.error('[2/2] Supabase SDK ERROR Inesperado:', error.message);
    }

    console.log('\n========================================\n');
    process.exit(0);
}

ejecutarPruebas();