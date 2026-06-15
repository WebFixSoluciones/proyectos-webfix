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
    clientIdentification,
    documentNumber, 
    total, 
    pdfUrl, 
    xmlUrl,
    companyName,
    logoUrl,
    companyRuc,
    companyAddress,
    companyPhone,
    claveAcceso,
    fechaAutorizacion,
    documentType,
    date
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
        <div style="max-width: 700px; margin: 20px auto; font-family: Arial, sans-serif; background: #ffffff; border: 1px solid #cccccc; border-top: 6px solid #999999; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.08);">
          
          <!-- Header / Branding (Logo right, Details left) -->
          <div style="padding: 24px 24px 20px 24px;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr>
                <td style="vertical-align: top; width: 60%; font-family: Arial, sans-serif; border: none;">
                  <span style="font-size: 26px; font-weight: bold; color: #333333; display: block; line-height: 1.1; margin-bottom: 12px;">
                    ${companyName || 'Facturación Electrónica'}
                  </span>
                  <div style="font-size: 11px; color: #333333; line-height: 1.5; font-family: Arial, sans-serif;">
                    ${companyRuc ? `<strong>Ruc:</strong> ${companyRuc}<br>` : ''}
                    ${companyAddress ? `<strong>Dirección:</strong> ${companyAddress}<br>` : ''}
                    ${companyPhone ? `<strong>Teléfono:</strong> ${companyPhone}` : ''}
                  </div>
                </td>
                <td style="vertical-align: middle; text-align: right; width: 40%; border: none;">
                  ${logoUrl ? `
                    <img src="${logoUrl}" alt="${companyName}" style="max-height: 85px; max-width: 200px; object-fit: contain;" />
                  ` : ''}
                </td>
              </tr>
            </table>
          </div>

          <!-- Estimado Cliente Bar -->
          <div style="background-color: #e2f0f4; padding: 10px 24px; border-top: 1px solid #c8e1e7; border-bottom: 1px solid #c8e1e7;">
            <span style="font-family: Arial, sans-serif; font-size: 13.5px; font-weight: bold; color: #2c525d; text-transform: uppercase;">
              Estimado Cliente: ${String(clientName || 'Cliente').toUpperCase()}
            </span>
          </div>

          <!-- Greeting -->
          <div style="padding: 20px 24px 10px 24px; font-family: Arial, sans-serif; font-size: 12.5px; color: #333333; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">Reciba un cordial saludo de ${companyName || 'nuestra empresa'}.</p>
            <p style="margin: 0;">Nos complace informarle que su documento electrónico ha sido generado con el siguiente detalle.</p>
          </div>

          <!-- Details and Client Grid (2 Columns) -->
          <div style="padding: 10px 24px 20px 24px;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr>
                <!-- Left Column: Detalle -->
                <td style="width: 49%; vertical-align: top; padding-right: 1%; border: none;">
                  <div style="background-color: #e2f0f4; border: 1px solid #c8e1e7; padding: 8px 12px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #2c525d;">
                    Detalle
                  </div>
                  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 12px; font-family: Arial, sans-serif; font-size: 11px; color: #333333; line-height: 1.7; min-height: 195px; background: #ffffff;">
                    <ul style="margin: 0; padding-left: 14px; list-style-type: disc;">
                      <li style="margin-bottom: 6px;">
                        <strong>Tipo De Documento</strong><br>
                        ${String(documentType || 'factura').toUpperCase()}
                      </li>
                      <li style="margin-bottom: 6px;">
                        <strong>Documento Electrónico No</strong><br>
                        ${documentNumber || ''}
                      </li>
                      <li style="margin-bottom: 6px;">
                        <strong>Autorización Electrónica</strong><br>
                        <span style="font-family: monospace; word-break: break-all; font-size: 10px; color: #444444;">${claveAcceso || ''}</span>
                      </li>
                      <li style="margin-bottom: 6px;">
                        <strong>Fecha de Autorización</strong><br>
                        ${fechaAutorizacion || ''}
                      </li>
                      <li style="margin-bottom: 6px;">
                        <strong>Clave Acceso</strong><br>
                        <span style="font-family: monospace; word-break: break-all; font-size: 10px; color: #444444;">${claveAcceso || ''}</span>
                      </li>
                      <li style="margin-bottom: 6px; font-size: 12px; color: #10b981; list-style-type: none; margin-left: -14px;">
                        <strong>Monto Total:</strong> $${Number(total || 0).toFixed(2)}
                      </li>
                    </ul>
                  </div>
                </td>
                
                <!-- Right Column: Datos Cliente -->
                <td style="width: 49%; vertical-align: top; padding-left: 1%; border: none;">
                  <div style="background-color: #e2f0f4; border: 1px solid #c8e1e7; padding: 8px 12px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #2c525d;">
                    Datos Cliente
                  </div>
                  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 12px; font-family: Arial, sans-serif; font-size: 11px; color: #333333; line-height: 1.7; min-height: 195px; background: #ffffff;">
                    <ul style="margin: 0; padding-left: 14px; list-style-type: disc;">
                      <li style="margin-bottom: 8px;">
                        <strong>C.I./Ruc/Pass</strong><br>
                        ${clientIdentification || ''}
                      </li>
                      <li style="margin-bottom: 8px;">
                        <strong>Fecha Emisión</strong><br>
                        ${date || ''}
                      </li>
                      <li style="margin-bottom: 8px;">
                        <strong>Usuario</strong><br>
                        ${clientIdentification || ''}
                      </li>
                      <li style="margin-bottom: 8px;">
                        <strong>Password</strong><br>
                        ${clientIdentification || ''}
                      </li>
                      ${claveAcceso ? `
                        <li style="margin-bottom: 4px;">
                          <strong>PAGINA WEB</strong><br>
                          <a href="https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/detalle.jsf?claveAcceso=${claveAcceso}" target="_blank" style="color: #0066cc; text-decoration: underline; font-size: 10px; word-break: break-all;">
                            Consultar Comprobante (SRI)
                          </a>
                        </li>
                      ` : ''}
                    </ul>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Quick Actions / Download Buttons -->
          <div style="text-align: center; padding: 0 24px 20px 24px;">
            ${pdfUrl ? `
              <a href="${pdfUrl}" target="_blank" style="background-color: #0066cc; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block; margin-right: 8px; margin-bottom: 8px; font-family: Arial, sans-serif;">
                Visualizar PDF
              </a>
            ` : ''}
            ${xmlUrl && !xmlUrl.startsWith('data:') ? `
              <a href="${xmlUrl}" target="_blank" style="background-color: #333333; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block; border: 1px solid #111111; margin-bottom: 8px; font-family: Arial, sans-serif;">
                Descargar XML
              </a>
            ` : ''}
          </div>

          <!-- Footer Info -->
          <div style="background-color: #ffffff; border-top: 1px solid #e2e8f0; padding: 15px 24px; text-align: center;">
            <p style="font-family: Arial, sans-serif; font-size: 11px; color: #000000; font-weight: normal; margin: 0; line-height: 1.4;">
              sistema de facturación electrónica desarrollado por <strong>Web Fix</strong>
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
