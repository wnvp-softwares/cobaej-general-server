import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Calificacion extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS CALIFICACIONES FINALES
------------------------------------------------------------------------------------------ */

Calificacion.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    calificacion_final: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    tipo_evaluacion: {
        type: DataTypes.ENUM('Ordinario', 'Extraordinario', 'Recursamiento', 'Titulo'),
        allowNull: false,
        defaultValue: 'Ordinario'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Calificacion',
    tableName: 'calificaciones',
    timestamps: false
});

export default Calificacion;
