import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Alumno extends Model { }

Alumno.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    correo: { type: DataTypes.STRING(100) },
    clave: { type: DataTypes.STRING(255) },
    imagen: { type: DataTypes.STRING(255) },
    verificado: { type: DataTypes.BOOLEAN },
    numero_control: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    codigo_verificacion: { type: DataTypes.STRING(6) },
    fecha_ingreso: { type: DataTypes.DATEONLY, allowNull: false },
}, { sequelize, modelName: 'Alumno', tableName: 'alumnos' });

export default Alumno;