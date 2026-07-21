import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Actividad extends Model { }

Actividad.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    ponderacion_porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false }
}, { sequelize, modelName: 'Actividad', tableName: 'actividades' });

export default Actividad;