import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class HistorialInscripcion extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA EL HISTORIAL DE INSCRIPCIONES
------------------------------------------------------------------------------------------ */

HistorialInscripcion.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    alumno_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'HistorialInscripcion',
    tableName: 'historial_inscripciones',
    timestamps: false
});

export default HistorialInscripcion;
