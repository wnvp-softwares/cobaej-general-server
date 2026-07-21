import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class ClaveDocente extends Model { }

ClaveDocente.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    clave: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
}, {
    sequelize,
    modelName: 'ClaveDocente',
    tableName: 'claves_docente',
    timestamps: false
});

export default ClaveDocente;