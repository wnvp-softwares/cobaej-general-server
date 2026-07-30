import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class ClaveDocente extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS CLAVES DE REGISTRO DOCENTE
------------------------------------------------------------------------------------------ */

ClaveDocente.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    clave: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
    },
    docente_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        unique: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
}, {
    sequelize,
    modelName: 'ClaveDocente',
    tableName: 'claves_docentes',
    timestamps: false
});

export default ClaveDocente;
