import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Asistencia extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS ASISTENCIAS
------------------------------------------------------------------------------------------ */

Asistencia.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    horario_id: { type: DataTypes.BIGINT, allowNull: false },
    inscripcion_materia_id: { type: DataTypes.BIGINT, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    estado: { type: DataTypes.ENUM('Presente', 'Ausente', 'Retardo', 'Justificado'), allowNull: false }
}, {
    sequelize,
    modelName: 'Asistencia',
    tableName: 'asistencias',
    timestamps: false
});

export default Asistencia;
