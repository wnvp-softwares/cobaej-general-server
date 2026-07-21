import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Docente extends Model { }

Docente.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    correo: { type: DataTypes.STRING(100) },
    clave: { type: DataTypes.STRING(255) },
    imagen: { type: DataTypes.STRING(255) },
    verificado: { type: DataTypes.BOOLEAN },
    codigo_verificacion: { type: DataTypes.STRING(6) },
    horas_disponibles: { type: DataTypes.INTEGER, validate: { min: 0 } },
}, { sequelize, modelName: 'Docente', tableName: 'docentes' });

export default Docente;