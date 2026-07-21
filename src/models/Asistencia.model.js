import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Asistencia extends Model { }

Asistencia.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    estado: { type: DataTypes.ENUM('Presente', 'Ausente', 'Retardo', 'Justificado'), allowNull: false }
}, { sequelize, modelName: 'Asistencia', tableName: 'asistencias' });

export default Asistencia;