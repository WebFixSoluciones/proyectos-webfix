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
        <div style="max-width: 600px; margin: 30px auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
          <!-- Top Accent Line -->
          <div style="height: 6px; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);"></div>
          
          <!-- Header/Branding -->
          <div style="padding: 32px 32px 20px 32px; text-align: center;">
            <span style="font-size: 22px; font-weight: 850; letter-spacing: -0.5px; color: #1e293b; display: block; line-height: 1.2;">
              ${companyName || 'Facturación Electrónica'}
            </span>
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; display: block; margin-top: 8px;">
              Documento Tributario SRI
            </span>
          </div>

          <!-- Divider -->
          <div style="height: 1px; background-color: #f1f5f9; margin: 0 32px;"></div>

          <!-- Body Content -->
          <div style="padding: 24px 32px 32px 32px; color: #334155; font-size: 13.5px; line-height: 1.6;">
            <p style="margin-top: 0; margin-bottom: 16px; color: #0f172a; font-weight: 600;">
              Estimado(a) ${clientName || 'Cliente'},
            </p>
            <p style="margin-bottom: 24px; color: #475569;">
              Le informamos que se ha generado y autorizado con éxito un comprobante electrónico a su nombre. A continuación, se detallan los datos clave del documento:
            </p>

            <!-- Details Card -->
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 45%;">Establecimiento / Emisor:</td>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #0f172a; font-weight: 700; text-align: right;">${companyName || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Nro. Comprobante:</td>
                  <td style="padding: 6px 0; font-size: 12.5px; color: #0f172a; font-family: monospace; font-weight: 700; text-align: right;">${documentNumber || ''}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 12px 0 0 0; font-size: 13.5px; color: #1e293b; font-weight: 700;">Monto Total Autorizado:</td>
                  <td style="padding: 12px 0 0 0; font-size: 18px; color: #10b981; font-weight: 850; text-align: right;">$${Number(total || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p style="color: #64748b; font-size: 12px; margin-bottom: 24px; line-height: 1.5;">
              De acuerdo con la normativa legal de facturación del SRI, hemos adjuntado a este correo el archivo oficial firmado digitalmente en formato <strong>XML</strong>, así como la representación impresa en formato <strong>PDF</strong> (si aplica).
            </p>

            <!-- Actions -->
            <div style="text-align: center; margin: 28px 0 8px 0;">
              ${pdfUrl ? `
                <a href="${pdfUrl}" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 12.5px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); margin-right: 8px; margin-bottom: 8px; transition: all 0.2s;">
                  Ver PDF Online (SRI)
                </a>
              ` : ''}
              ${xmlUrl && !xmlUrl.startsWith('data:') ? `
                <a href="${xmlUrl}" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 12.5px; display: inline-block; border: 1px solid #1e293b; margin-bottom: 8px;">
                  Descargar XML
                </a>
              ` : ''}
            </div>
          </div>

          <!-- Footer Info -->
          <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
            <p style="font-size: 10.5px; color: #94a3b8; line-height: 1.5; margin: 0;">
              Este comprobante fue emitido automáticamente por nuestro sistema de facturación electrónica. 
              <br>Por favor no responda a este correo, ya que la dirección de origen no es monitoreada.
            </p>
          </div>
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
