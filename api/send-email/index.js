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
    emitterEmail,
    clientName, 
    clientIdentification,
    documentNumber, 
    total, 
    pdfUrl, 
    xmlUrl,
    xmlContent,
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
    date,
    isTest
  } = req.body || {};

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    res.status(400).json({ error: 'Configuración SMTP incompleta en Ajustes (Servidor, Puerto, Usuario o Contraseña).' });
    return;
  }

  const recipientTo = (to || emitterEmail || '').trim();
  if (!recipientTo) {
    res.status(400).json({ error: 'No se especificó destinatario (el cliente no tiene correo registrado ni existe correo de contacto del emisor).' });
    return;
  }

  // Short-circuit nota_venta (recibos) since they are only internal registration documents
  if (String(documentType || '').toLowerCase() === 'nota_venta') {
    res.status(200).json({ success: true, message: 'Los recibos (nota de venta) son solo de registro interno y no se envían por correo.' });
    return;
  }

  const port = parseInt(smtpPort, 10) || 587;
  const isSecure = smtpSecure === true || String(smtpSecure).toLowerCase() === 'true' || port === 465;

  try {
    // 1. Configurar el transportador SMTP
    const transporter = nodemailer.createTransport({
      host: String(smtpHost).trim(),
      port: port,
      secure: isSecure,
      auth: {
        user: String(smtpUser).trim(),
        pass: String(smtpPass),
      },
      tls: {
        // En Ecuador, muchos dominios cPanel/Zimbra usan certificados compartidos
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 12000,
      socketTimeout: 25000
    });

    const cleanCompanyName = String(companyName || 'Facturación Electrónica').replace(/["\r\n]/g, '').trim();

    // 2. Modo prueba de conexión
    if (isTest || documentType === 'prueba') {
      const testMailOptions = {
        from: `"${cleanCompanyName}" <${String(smtpUser).trim()}>`,
        to: recipientTo,
        subject: `[WebFix ERP] Prueba de Conexión SMTP Exitosa`,
        text: `¡Hola!\n\nEste es un mensaje de prueba para confirmar que tu servidor SMTP (${smtpHost}:${port}) está funcionando correctamente en WebFix ERP.\n\nTus clientes ya pueden recibir comprobantes autorizados y enlaces a su RIDE por correo.\n\nFecha: ${new Date().toLocaleString('es-EC')}`,
        html: `
          <div style="font-family: 'Inter', sans-serif, Arial; padding: 24px; background-color: #F2F4FF;">
            <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #CAD1F4; padding: 30px; text-align: left;">
              <h2 style="color: #1C40F2; margin-top: 0;">¡Conexión SMTP Exitosa!</h2>
              <p style="font-size: 13px; color: #333333; line-height: 1.6;">
                Tu servidor de correo saliente <strong>${smtpHost}</strong> en el puerto <strong>${port}</strong> (SSL/TLS: ${isSecure ? 'Sí' : 'No'}) fue configurado correctamente.
              </p>
              <p style="font-size: 13px; color: #333333; line-height: 1.6;">
                Desde ahora, cuando emitas facturas o comprobantes autorizados por el SRI, se enviarán automáticamente desde <strong>${smtpUser}</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
              <p style="font-size: 11px; color: #718096; margin-bottom: 0;">
                WebFix ERP • Facturación Electrónica Ecuador
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(testMailOptions);
      res.status(200).json({ success: true, message: 'Correo de prueba enviado correctamente.', messageId: info.messageId });
      return;
    }

    // 3. Preparar los adjuntos de forma segura
    const attachments = [];
    
    // Adjuntar PDF solo si es un data URI o una URL remota descargable (NUNCA rutas relativas /public/ride)
    if (pdfUrl) {
      if (pdfUrl.startsWith('data:')) {
        try {
          const commaIndex = pdfUrl.indexOf(',');
          if (commaIndex !== -1) {
            const meta = pdfUrl.substring(0, commaIndex);
            const data = pdfUrl.substring(commaIndex + 1);
            const isBase64 = meta.includes('base64');
            attachments.push({
              filename: `${documentNumber || 'Comprobante'}.pdf`,
              content: isBase64 ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf-8'),
              contentType: 'application/pdf'
            });
          }
        } catch (e) {
          console.warn("No se pudo procesar data URI de PDF:", e.message);
        }
      } else if (
        (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) &&
        !pdfUrl.includes('srienlinea.sri.gob.ec') &&
        !pdfUrl.includes('/public/ride')
      ) {
        attachments.push({
          filename: `${documentNumber || 'Comprobante'}.pdf`,
          path: pdfUrl
        });
      }
    }

    // Procesar XML (data URI, URL remota o contenido directo)
    const rawXml = xmlContent || (typeof xmlUrl === 'string' && xmlUrl.trim().startsWith('<') ? xmlUrl : null);
    if (rawXml) {
      attachments.push({
        filename: `${documentNumber || 'Comprobante'}.xml`,
        content: rawXml,
        contentType: 'text/xml'
      });
    } else if (xmlUrl) {
      if (xmlUrl.startsWith('data:')) {
        try {
          const commaIndex = xmlUrl.indexOf(',');
          if (commaIndex !== -1) {
            const meta = xmlUrl.substring(0, commaIndex);
            const data = xmlUrl.substring(commaIndex + 1);
            const isBase64 = meta.includes('base64');
            let content;
            if (isBase64) {
              content = Buffer.from(data, 'base64');
            } else {
              try {
                content = decodeURIComponent(data);
              } catch {
                content = data;
              }
            }
            attachments.push({
              filename: `${documentNumber || 'Comprobante'}.xml`,
              content,
              contentType: 'text/xml'
            });
          }
        } catch (e) {
          console.warn("No se pudo procesar data URI de XML:", e.message);
        }
      } else if (xmlUrl.startsWith('http://') || xmlUrl.startsWith('https://')) {
        attachments.push({
          filename: `${documentNumber || 'Comprobante'}.xml`,
          path: xmlUrl
        });
      }
    }

    // 4. Crear el cuerpo del correo
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

    const isDirectToEmitter = !to || (emitterEmail && recipientTo.trim().toLowerCase() === emitterEmail.trim().toLowerCase());

    // Resolver URL absoluta para el RIDE
    let originBase = '';
    if (req.headers.origin) {
      originBase = req.headers.origin;
    } else if (req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        originBase = refUrl.origin;
      } catch {
        // fallback
      }
    }
    if (!originBase) {
      const proto = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
      originBase = `${proto}://${host}`;
    }

    let resolvedPdfUrl = pdfUrl || '';
    if (resolvedPdfUrl && resolvedPdfUrl.startsWith('/')) {
      resolvedPdfUrl = `${originBase}${resolvedPdfUrl}`;
    }

    const mailOptions = {
      from: `"${cleanCompanyName}" <${String(smtpUser).trim()}>`,
      to: recipientTo,
      subject: isDirectToEmitter 
        ? `[Copia Emisor] ${docTypeLabel} Electrónica: ${documentNumber || ''}`
        : `Comprobante Electrónico Autorizado: ${documentNumber || ''}`,
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
                      ${isDirectToEmitter ? `¡Hola, ${String(cleanCompanyName || 'Emisor').toUpperCase()}!` : `¡Hola, ${String(clientName || 'Cliente').toUpperCase()}!`}
                    </h1>
                    <p style="font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 400; color: #ffffff; margin: 0; line-height: 1.2;">
                      ${isDirectToEmitter ? 'Copia de Respaldo - Nuevo Comprobante Emitido' : 'Nuevo Comprobante Electrónico Autorizado'}
                    </p>
                  </div>

                  <!-- Body Content -->
                  <div style="padding: 30px 24px; background-color: #ffffff;">
                    <p style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; color: #000000; margin: 0 0 24px 0; line-height: 1.5; text-transform: uppercase;">
                      ${isDirectToEmitter ? `Has emitido un comprobante electrónico para ${String(clientName || 'Consumidor Final').toUpperCase()}.` : `${String(cleanCompanyName || 'EMISOR').toUpperCase()} ha emitido un comprobante electrónico a su nombre.`}
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
                    ${resolvedPdfUrl ? `
                      <a href="${resolvedPdfUrl}" target="_blank" style="background-color: #1C40F2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 700; font-size: 11px; text-transform: uppercase; font-family: 'Inter', sans-serif; display: inline-block; margin-right: 12px;">
                        VER / DESCARGAR RIDE (PDF)
                      </a>
                    ` : ''}
                    ${xmlUrl && !xmlUrl.startsWith('data:') ? `
                      <a href="${xmlUrl}" target="_blank" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 700; font-size: 11px; text-transform: uppercase; font-family: 'Inter', sans-serif; display: inline-block;">
                        DESCARGAR XML
                      </a>
                    ` : ''}
                  </div>

                </div>

                <!-- Outside text (Validity) -->
                <p style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 400; color: #000000; text-align: center; max-width: 500px; margin: 20px auto 0 auto; line-height: 1.4; padding: 0 10px;">
                  Le recordamos que este documento digital tiene validez tributaria, por lo que le sugerimos conservarlo para los fines fiscales pertinentes.
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

    if (emitterEmail && recipientTo && recipientTo.trim().toLowerCase() !== emitterEmail.trim().toLowerCase()) {
      mailOptions.bcc = emitterEmail.trim();
    }

    // 5. Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Error al enviar correo SMTP:', err);

    let clientMsg = err.message || 'Error desconocido';
    if (err.code === 'EAUTH' || clientMsg.toLowerCase().includes('invalid login')) {
      clientMsg = 'Credenciales SMTP incorrectas (usuario o contraseña no válidos para el servidor de correo).';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET' || clientMsg.toLowerCase().includes('timeout')) {
      clientMsg = `Tiempo de espera agotado conectando a ${smtpHost}:${port}. Verifica si el puerto requiere SSL o TLS.`;
    } else if (err.code === 'ECONNREFUSED') {
      clientMsg = `Conexión rechazada por el servidor ${smtpHost}:${port}. Verifica que el host y puerto sean correctos.`;
    } else if (err.code === 'ENOTFOUND') {
      clientMsg = `No se pudo encontrar el servidor SMTP (${smtpHost}). Verifica la dirección del host.`;
    }

    res.status(502).json({ error: `Fallo al enviar correo por SMTP: ${clientMsg}` });
  }
}
