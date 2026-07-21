import 'dotenv/config'
import { Sequelize } from 'sequelize'

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            timestamps: false
        }
    }
);

const testConection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexion a la base de datos PostgreSQL (Supabase) establecida...\nLanzando ORM');
    } catch (error) {
        console.error('No se pudo conectar a la base de datos (archivo database.config.js), falló ORM:', error);
    }
}

testConection();

export default sequelize;