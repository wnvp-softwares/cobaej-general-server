import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Calificacion extends Model { }

Calificacion.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    calificacion_final: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    tipo_evaluacion: { type: DataTypes.ENUM('Ordinario', 'Extraordinario', 'Recursamiento', 'Titulo'), defaultValue: 'Ordinario' }
}, { sequelize, modelName: 'Calificacion', tableName: 'calificaciones' });

export default Calificacion;