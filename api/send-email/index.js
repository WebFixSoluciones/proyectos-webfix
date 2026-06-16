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
    const docTypeLabel = (() => {
      switch (String(documentType || 'factura').toLowerCase()) {
        case 'factura': return 'Factura Electrónica';
        case 'retencion': return 'Comprobante de Retención';
        case 'nota_credito': return 'Nota de Crédito';
        case 'nota_debito': return 'Nota de Débito';
        case 'liquidacion': return 'Liquidación de Compra';
        case 'guia_remision': return 'Guía de Remisión';
        case 'nota_venta': return 'Nota de Venta';
        default: return 'Comprobante Electrónico';
      }
    })();

    const mailOptions = {
      from: `"${companyName || 'Facturación Electrónica'}" <${smtpUser}>`,
      to,
      subject: `Comprobante Electrónico Autorizado: ${documentNumber || ''}`,
      html: `
        <div style="max-width: 620px; margin: 20px auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; border: 1px solid #000000; border-radius: 12px; overflow: hidden;">
          
          <!-- Header / Branding -->
          <div style="background-color: #1C40F2; padding: 28px 24px; text-align: left;">
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; display: block; margin-bottom: 6px;">
              ${String(companyName || 'EMISOR').toUpperCase()} · NOTIFICACIÓN
            </span>
            <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; line-height: 1.2;">
              ${docTypeLabel}
            </h1>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; color: #ffffff; line-height: 1.4;">
              ${companyRuc ? `<strong>RUC:</strong> ${companyRuc} ` : ''}
              ${companyAddress ? `| <strong>Dirección:</strong> ${companyAddress} ` : ''}
              ${companyPhone ? `| <strong>Teléfono:</strong> ${companyPhone}` : ''}
            </div>
          </div>

          <!-- Estimado Cliente / Saludo -->
          <div style="padding: 24px 24px 10px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #000000; line-height: 1.6;">
            <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 14px;">Estimado cliente <strong>${clientName || 'Cliente'}</strong>,</p>
            <p style="margin: 0; font-weight: 300;">Reciba un cordial saludo. Nos complace informarle que su documento electrónico ha sido generado con el siguiente detalle:</p>
          </div>

          <!-- Details and Client Grid (2 Columns) -->
          <div style="padding: 10px 24px 20px 24px;">
            <table style="width: 100%; border-collapse: collapse; border: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <tr>
                <!-- Columna Izquierda: Detalle Tributario -->
                <td style="width: 48%; vertical-align: top; padding: 20px; border: 1px solid #000000; border-radius: 8px; background-color: #ffffff;">
                  <span style="font-size: 10px; font-weight: 700; color: #1C40F2; text-transform: uppercase; display: block; margin-bottom: 12px;">
                    DETALLE TRIBUTARIO
                  </span>
                  <div style="font-size: 11px; color: #000000; line-height: 1.6;">
                    <div style="margin-bottom: 8px;">
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Fecha Autorización:</strong><br>
                      <span style="color: #000000; font-weight: 700;">${fechaAutorizacion || ''}</span>
                    </div>
                    <div>
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Clave de Acceso:</strong><br>
                      <span style="font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 9.5px; color: #000000; word-break: break-all; font-weight: 700; display: block; margin-top: 4px; line-height: 1.4; background-color: #ffffff; padding: 6px 0; border: none;">
                        ${claveAcceso || ''}
                      </span>
                    </div>
                  </div>
                </td>
                
                <!-- Espaciador -->
                <td style="width: 4%; border: none;"></td>
                
                <!-- Columna Derecha: Datos Cliente -->
                <td style="width: 48%; vertical-align: top; padding: 20px; border: 1px solid #000000; border-radius: 8px; background-color: #ffffff;">
                  <span style="font-size: 10px; font-weight: 700; color: #1C40F2; text-transform: uppercase; display: block; margin-bottom: 12px;">
                    DATOS RÁPIDOS
                  </span>
                  <div style="font-size: 11px; color: #000000; line-height: 1.8;">
                    <div style="margin-bottom: 6px;">
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Documento:</strong><br>
                      <span style="font-weight: 700; color: #000000;">${documentNumber || ''}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Fecha Emisión:</strong><br>
                      <span style="font-weight: 700; color: #000000;">${date || ''}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Cliente:</strong><br>
                      <span style="font-weight: 700; color: #000000;">${clientName || ''}</span>
                    </div>
                    <div>
                      <strong style="color: #000000; font-weight: 400; font-size: 10.5px;">Identificación:</strong><br>
                      <span style="font-weight: 700; color: #000000;">${clientIdentification || ''}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Monto Total Card (Compact & Centered) -->
          <div style="text-align: center; padding: 0 24px 20px 24px;">
            <div style="max-width: 240px; margin: 0 auto; padding: 12px 16px; border-radius: 8px; background-color: #1C40F2; text-align: center; display: inline-block; width: 100%;">
              <span style="font-size: 9px; font-weight: 700; color: #ffffff; text-transform: uppercase; display: block; margin-bottom: 4px;">
                MONTO TOTAL
              </span>
              <div style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; line-height: 1;">
                $${Number(total || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span style="font-size: 9px; color: #ffffff; display: block; margin-top: 4px;">
                Valores en USD
              </span>
            </div>
          </div>

          <!-- Quick Actions / Download Buttons -->
          <div style="text-align: center; padding: 10px 24px 28px 24px;">
            ${pdfUrl ? `
              <a href="${pdfUrl}" target="_blank" style="background-color: #1C40F2; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: 700; font-size: 12px; display: inline-block; margin-right: 12px; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Visualizar PDF
              </a>
            ` : ''}
            ${xmlUrl && !xmlUrl.startsWith('data:') ? `
              <a href="${xmlUrl}" target="_blank" style="background-color: #ffffff; color: #000000; padding: 11px 28px; text-decoration: none; border-radius: 30px; font-weight: 700; font-size: 12px; display: inline-block; border: 1px solid #000000; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Descargar XML
              </a>
            ` : ''}
          </div>

          <!-- Footer Info -->
          <div style="background-color: #ffffff; border-top: 1px solid #000000; padding: 18px 24px; text-align: center;">
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; color: #000000; font-weight: 400; margin: 0; line-height: 1.4;">
              Sistema de facturación electrónica desarrollado por <strong>Web Fix</strong>
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
