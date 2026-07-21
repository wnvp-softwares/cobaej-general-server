import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class HistorialInscripcion extends Model { }

HistorialInscripcion.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'HistorialInscripcion', tableName: 'historial_inscripciones' });

export default HistorialInscripcion;