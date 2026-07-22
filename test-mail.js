import { google } from 'googleapis';
import 'dotenv/config';

const GMAIL_USER = process.env.GMAIL_USER;
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

// 1. Configurar el cliente OAuth2 con las credenciales de Google
const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// 2. Instanciar el servicio de Gmail API
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Función auxiliar para construir y codificar el correo en formato RFC 2822 (Base64 URL-Safe)
const crearRawEmail = ({ to, from, subject, html }) => {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ];

    const message = messageParts.join('\r\n');

    return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const enviarCodigo = async (email, codigo) => {
    console.log('Saludos desde mailer! Casi se envia...');

    try {
        const htmlContent = `
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
        `;

        const raw = crearRawEmail({
            to: email,
            from: `"SiCECOBAEJ 65" <${GMAIL_USER}>`,
            subject: 'Código de verificación para registro en el "SiCECOBAEJ 65"',
            html: htmlContent
        });

        // Petición HTTP a la API de Gmail
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        });

        console.log('Desde mailer avisamos: Se envió!');
        return true;
    } catch (error) {
        console.error('Error al enviar codigo en mailer.service.js:', error.message || error);
        throw error;
    }
};