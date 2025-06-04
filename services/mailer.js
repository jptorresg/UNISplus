// Configuración de Nodemailer
// services/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function enviarCodigoVerificacion(email, nombre, codigo) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Código de verificación UNIS+',
        html: `
            <p>Buenos días, tardes o noches <strong>${nombre}</strong>,</p>
            <p>Para poder registrarte en UNIS+, favor ingresar el siguiente código:</p>
            <h2>${codigo}</h2>
            <p>Este código es de uso personal, no lo compartas con nadie. Si no hiciste esta solicitud, simplemente ignora este correo.</p>
            <p>Cualquier problema, por favor comunicarse con <a href="mailto:soporte.unisplus@gmail.com">soporte.unisplus@gmail.com</a>, solucionaremos tu problema lo más rápido posible.</p>
            <p>Ten un excelente día.</p>
            <br>
            <p>Atentamente, UNIS+</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado:', info.response);
        return true;
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return false;
    }
}