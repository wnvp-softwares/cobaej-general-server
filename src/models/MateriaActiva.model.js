import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class MateriaActiva extends Model { }

MateriaActiva.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }
}, { sequelize, modelName: 'MateriaActiva', tableName: 'materia_activa' });

export default MateriaActiva;