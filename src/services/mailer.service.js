import nodemailer from 'nodemailer';
import 'dotenv/config';

const GMAIL_USER = process.env.EMAIL_USER;
const URL_BASE = process.env.URL_BASE;

const transportar = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
});

export const enviarCodigo = async (email, codigo) => {
    try {
        await transportar.sendMail({
            from: `"Registro al Sistema de Control Escolar Cobaej TBC #65 - SiCECOBAEJ 65" ${EMAIL_USER}`,
            to: email,
            subject: 'Código de verificación para registro en el "SiCECOBAEJ 65"',
            text: `Tu código de verificación es: ${codigo}`,
            html: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                    <tr>
                        <td background="https://res.cloudinary.com/tw1lyqud/image/upload/v1784513327/school-classroom_ghceuy.jpg" bgcolor="#1A202C" align="center" valign="middle" style="background-size: cover; background-position: center; padding: 50px 15px;">

                            <div style="max-width: 600px; background-color: rgba(0, 0, 0, 0.75); border-radius: 12px; padding: 40px 30px; text-align: center; font-family: Arial, sans-serif;">

                                <h1 style="color: #E2E8F0; margin: 0 0 10px 0; font-size: 28px; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">
                                    SiCECOBAEJ TBC #65
                                </h1>
                                <h2 style="color: #94A3B8; margin: 0 0 30px 0; font-size: 18px; font-weight: normal;">
                                    Código de verificación de nuevo registro
                                </h2>

                                <img src="https://res.cloudinary.com/tw1lyqud/image/upload/v1784513326/COBAEJ-logo-icon_eqob4h.jpg" width="220" style="display: inline-block; margin-bottom: 30px; max-width: 100%; height: auto; border-radius: 50%;" alt="Logo COBAEJ">

                                <p style="color: #E2E8F0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    ¡Hola! ¿Estás por completar tu registro a la plataforma <strong>SiCECOBAEJ</strong>?<br>
                                    ¡Aquí tienes tu código de seguridad y verificación!
                                </p>

                                <div style="margin: 30px 0;">
                                    <span style="display: inline-block; background-color: #2D3748; color: #F8FAFC; font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; padding: 15px 30px; border-radius: 8px; border: 1px solid #4A5568;">
                                        ${codigo}
                                    </span>
                                </div>

                                <p style="color: #94A3B8; font-size: 14px; margin: 30px 0 0 0;">
                                    ¿No hiciste registro? 
                                    <a style="color: #A5B4FC; font-weight: 600; text-decoration: none;" href="mailto:sicecobaej65@gmail.com">
                                        ¡Contáctanos para ayudarte!
                                    </a>
                                </p>

                            </div>

                        </td>
                    </tr>
                </table>
            `,
        });
    } catch (error) {
        console.error(
            'Error al enviar codigo de verificacion en servicio de email: /services/mailer.service.js\n', error.message || error
        );
        return false;
    }
};