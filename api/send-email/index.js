/* global Buffer */
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
    // eslint-disable-next-line no-unused-vars
    logoUrl,
    // eslint-disable-next-line no-unused-vars
    companyRuc,
    // eslint-disable-next-line no-unused-vars
    companyAddress,
    // eslint-disable-next-line no-unused-vars
    companyPhone,
    claveAcceso,
    // eslint-disable-next-line no-unused-vars
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

  // Short-circuit nota_venta (recibos) since they are only internal registration documents
  if (String(documentType || '').toLowerCase() === 'nota_venta') {
    res.status(200).json({ success: true, message: 'Los recibos (nota de venta) son solo de registro interno y no se envían por correo.' });
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
    const docTypeLabel = (() => {
      switch (String(documentType || 'factura').toLowerCase()) {
        case 'factura': return 'Factura';
        case 'retencion': return 'Retención';
        case 'nota_credito': return 'Nota de Crédito';
        case 'nota_debito': return 'Nota de Débito';
        case 'liquidacion': return 'Liquidación de Compra';
        case 'guia_remision': return 'Guía de Remisión';
        case 'nota_venta': return 'Nota de Venta';
        default: return 'Comprobante';
      }
    })();

    const mailOptions = {
      from: `"${companyName || 'Facturación Electrónica'}" <${smtpUser}>`,
      to,
      subject: `Comprobante Electrónico Autorizado: ${documentNumber || ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F2F4FF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table style="width: 100%; border-collapse: collapse; border: none; background-color: #F2F4FF; padding: 40px 0; margin: 0;">
            <tr>
              <td align="center" style="padding: 40px 20px; border: none;">
                
                <!-- Main Container Box -->
                <div style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #CAD1F4; border-radius: 8px; overflow: hidden; text-align: left;">
                  
                  <!-- Header / Branding -->
                  <div style="background-color: #1C40F2; padding: 32px 24px; text-align: center; border: none;">
                    <h1 style="font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; line-height: 1.2;">
                      ¡Hola, ${String(clientName || 'Cliente').toUpperCase()}
                    </h1>
                    <p style="font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 400; color: #ffffff; margin: 0; line-height: 1.2;">
                      Nuevo Comprobante Electrónico
                    </p>
                  </div>

                  <!-- Body Content -->
                  <div style="padding: 30px 24px; background-color: #ffffff;">
                    <p style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; color: #000000; margin: 0 0 24px 0; line-height: 1.5; text-transform: uppercase;">
                      ${String(companyName || 'EMISOR').toUpperCase()}, ha emitido un comprobante electrónico a su nombre.
                    </p>

                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <!-- Left column: Document Icon -->
                        <td style="width: 45px; vertical-align: top; padding-right: 20px; border: none;">
                          <div style="font-size: 36px; line-height: 1; text-align: left; color: #000000; padding-top: 4px;">
                            📄
                          </div>
                        </td>
                        <!-- Right column: Details -->
                        <td style="vertical-align: top; border: none;">
                          <div style="font-family: 'Inter', sans-serif; font-size: 11.5px; color: #000000; line-height: 1.6; text-align: left;">
                            
                            <div style="margin-bottom: 12px;">
                              <strong style="font-weight: 700; display: block; color: #000000;">Clave de Acceso:</strong>
                              <span style="font-weight: 400; display: block; color: #000000; word-break: break-all; margin-top: 2px;">${claveAcceso || ''}</span>
                            </div>

                            <div style="margin-bottom: 12px;">
                              <strong style="font-weight: 700; display: block; color: #000000;">${docTypeLabel}:</strong>
                              <span style="font-weight: 400; display: block; color: #000000; margin-top: 2px;">${documentNumber || ''}</span>
                            </div>

                            <div style="margin-bottom: 12px;">
                              <strong style="font-weight: 700; display: block; color: #000000;">Fecha Emisión:</strong>
                              <span style="font-weight: 400; display: block; color: #000000; margin-top: 2px;">${date || ''}</span>
                            </div>

                            <div style="margin-bottom: 12px;">
                              <strong style="font-weight: 700; display: block; color: #000000;">Cliente:</strong>
                              <span style="font-weight: 400; display: block; color: #000000; margin-top: 2px;">${String(clientName || '').toUpperCase()}</span>
                            </div>

                            <div style="margin-bottom: 12px;">
                              <strong style="font-weight: 700; display: block; color: #000000;">Identificación:</strong>
                              <span style="font-weight: 400; display: block; color: #000000; margin-top: 2px;">${clientIdentification || ''}</span>
                            </div>

                            <!-- Total Block -->
                            <table style="width: 240px; border-collapse: collapse; background-color: #1C40F2; border-radius: 5px; margin-top: 20px; border: none;">
                              <tr>
                                <td style="padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #ffffff; text-align: left; border: none;">
                                  Total Incl. IVA
                                </td>
                                <td style="padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: #ffffff; text-align: right; border: none;">
                                  $${Number(total || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </table>

                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Buttons Bar -->
                  <div style="border-top: 1px solid #CAD1F4; padding: 24px; text-align: center; background-color: #ffffff;">
                    ${pdfUrl ? `
                      <a href="${pdfUrl}" target="_blank" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 700; font-size: 10px; text-transform: uppercase; font-family: 'Inter', sans-serif; display: inline-block; margin-right: 15px;">
                        DESCARGAR PDF
                      </a>
                    ` : ''}
                    ${xmlUrl && !xmlUrl.startsWith('data:') ? `
                      <a href="${xmlUrl}" target="_blank" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 700; font-size: 10px; text-transform: uppercase; font-family: 'Inter', sans-serif; display: inline-block;">
                        DESCARGAR XML
                      </a>
                    ` : ''}
                  </div>

                </div>

                <!-- Outside text (Validity) -->
                <p style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 400; color: #000000; text-align: center; max-width: 500px; margin: 20px auto 0 auto; line-height: 1.4; padding: 0 10px;">
                  Le recordamos que este documento digital si tiene validez tributaria, por lo que le sugerimos conservarlo para los fines fiscales pertinentes.
                </p>

                <!-- Outside footer -->
                <p style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #000000; text-align: center; margin: 24px 0 0 0; padding: 0 10px;">
                  Sistema de Facturación © WebFix Soluciones. Todos los derechos reservados.
                </p>

              </td>
            </tr>
          </table>
        </body>
        </html>
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
