import { enviarCodigo } from "./src/services/mailer.service.js";

const correo = 'example@mail.com'; // Direccion que recibirá el correo
const codigo = 999999; // Codigo de 6 digitos (INT)

enviarCodigo(correo, codigo);