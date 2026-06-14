import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { 
    smtpHost, 
    smtpPort, 
    smtpUser, 
    smtpPass, 
    smtpSecure, 
    to, 
    clientName, 
    documentNumber, 
    total, 
    pdfUrl, 
    xmlUrl,
    companyName
  } = req.body;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    res.status(400).json({ error: 'Configuración SMTP incompleta en el perfil corporativo.' });
    return;
  }

  if (!to) {
    res.status(400).json({ error: 'No se especificó el correo electrónico del cliente.' });
    return;
  }

  try {
    // 1. Configurar el transportador SMTP del cliente
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure === true || smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // 2. Preparar los adjuntos (Nodemailer descarga automáticamente las URLs y procesa data URIs)
    const attachments = [];
    
    // Solo adjuntar PDF si es una URL real de archivo (e.g. de Firebase Storage) y no el portal del SRI
    if (pdfUrl && !pdfUrl.includes('srienlinea.sri.gob.ec') && !pdfUrl.startsWith('data:')) {
      attachments.push({
        filename: `${documentNumber || 'Comprobante'}.pdf`,
        path: pdfUrl
      });
    }

    // Procesar XML (puede venir como data URI desde la simulación/emisión del SRI)
    if (xmlUrl) {
      if (xmlUrl.startsWith('data:')) {
        const commaIndex = xmlUrl.indexOf(',');
        if (commaIndex !== -1) {
          const meta = xmlUrl.substring(0, commaIndex);
          const data = xmlUrl.substring(commaIndex + 1);
          const isBase64 = meta.includes('base64');
          
          attachments.push({
            filename: `${documentNumber || 'Comprobante'}.xml`,
            content: isBase64 ? Buffer.from(data, 'base64') : decodeURIComponent(data),
            contentType: 'text/xml'
          });
        }
      } else {
        attachments.push({
          filename: `${documentNumber || 'Comprobante'}.xml`,
          path: xmlUrl
        });
      }
    }

    // 3. Crear el cuerpo del correo
    const mailOptions = {
      from: `"${companyName || 'Facturación Electrónica'}" <${smtpUser}>`,
      to,
      subject: `Comprobante Electrónico Autorizado: ${documentNumber || ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #eef2ff; padding-bottom: 10px;">Comprobante Electrónico</h2>
          <p>Estimado(a) <strong>${clientName || 'Cliente'}</strong>,</p>
          <p>Le informamos que se ha generado y autorizado un comprobante electrónico a su nombre por parte de <strong>${companyName || 'nuestra empresa'}</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Establecimiento / Razón Social:</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${companyName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Número de Comprobante:</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-mono">${documentNumber || ''}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Monto Total:</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">$${Number(total || 0).toFixed(2)}</td>
            </tr>
          </table>

          <p>Adjunto a este correo electrónico encontrará los archivos reglamentarios en formato <strong>XML</strong> y su representación impresa en formato <strong>PDF</strong>.</p>
          
          <div style="margin: 25px 0; text-align: center;">
            ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px; display: inline-block;">Ver PDF Online</a>` : ''}
            ${xmlUrl ? `<a href="${xmlUrl}" target="_blank" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver XML Online</a>` : ''}
          </div>

          <p style="font-size: 11px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
            Este es un correo automático. Por favor no responda a esta dirección de correo.
          </p>
        </div>
      `,
      attachments
    };

    // 4. Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Error al enviar correo SMTP:', err);
    res.status(502).json({ error: `Fallo al enviar correo por SMTP: ${err.message}` });
  }
}
