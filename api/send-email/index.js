import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { escapeHtml, isSafeExternalUrl } from '../../server/domains/mailerGuard.js';

export function resolveSenderDomain(smtpUser = '', smtpHost = '') {
  const userStr = String(smtpUser || '').trim();
  const atIndex = userStr.lastIndexOf('@');
  if (atIndex !== -1) {
    const domain = userStr.slice(atIndex + 1).toLowerCase().replace(/[^a-z0-9.-]/g, '');
    if (domain && domain.includes('.')) return domain;
  }
  const host = String(smtpHost || '').trim().toLowerCase().replace(/^(mail|smtp)\./, '').replace(/[^a-z0-9.-]/g, '');
  return host && host.includes('.') ? host : 'localhost';
}

/**
 * Normaliza y valida la configuración SMTP:
 * - Asigna puerto predeterminado (465 para SSL, 587 para TLS/STARTTLS) si viene vacío.
 * - Garantiza que en el puerto 587 no se fuerce secure: true (lo cual colapsa el protocolo STARTTLS).
 * - Elimina espacios en blanco accidentales en contraseñas de aplicación de Gmail ("xxxx xxxx xxxx xxxx").
 * - Valida campos mínimos obligatorios (host, user, pass).
 */
export function resolveSmtpConfig(config = {}) {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = config;
  const isSmtpSecure = smtpSecure === true || String(smtpSecure).toLowerCase() === 'true';
  const parsedPort = parseInt(smtpPort, 10);
  const port = parsedPort && !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : (isSmtpSecure ? 465 : 587);

  // En Nodemailer:
  // - Puerto 465 requiere secure: true (SSL directo desde inicio del socket).
  // - Puerto 587 o 25 requiere secure: false (STARTTLS). Si se pasa secure: true en 587, el handshake falla de inmediato.
  const isSecure = port === 465;

  let cleanPass = String(smtpPass ?? '').trim();
  const hostLower = String(smtpHost ?? '').toLowerCase();

  // Para cuentas de Google (smtp.gmail.com), las Contraseñas de Aplicación se generan visualmente
  // en bloques separados por espacios: "abcd efgh ijkl mnop". Si el usuario las copia tal cual,
  // removemos los espacios para que el servidor SMTP de Google las acepte.
  if (hostLower.includes('gmail.com') && cleanPass.includes(' ')) {
    cleanPass = cleanPass.replace(/\s+/g, '');
  }

  const cleanHost = String(smtpHost ?? '').trim();
  const cleanUser = String(smtpUser ?? '').trim();

  const isValid = Boolean(cleanHost && cleanUser && cleanPass);

  return {
    host: cleanHost,
    port,
    secure: isSecure,
    user: cleanUser,
    pass: cleanPass,
    isValid
  };
}

export function invoiceEmailRecipients(to, emitterEmail) {
  const client = String(to || '').trim();
  const emitter = String(emitterEmail || '').trim();
  const recipients = [];
  if (client) recipients.push({ role: 'client', address: client });
  if (emitter) recipients.push({ role: 'emitter', address: emitter });
  return recipients;
}

export async function deliverInvoiceMessages(transporter, recipients, buildMailOptions) {
  const deliveries = {};
  for (const { role, address } of recipients) {
    try {
      const info = await transporter.sendMail(buildMailOptions(address, role === 'emitter'));
      const accepted = !Array.isArray(info.accepted) || info.accepted.some(item => String(item).toLowerCase() === address.toLowerCase());
      deliveries[role] = accepted
        ? { status: 'sent', address, messageId: info.messageId || '' }
        : { status: 'failed', address, error: 'El servidor de correo rechazó al destinatario.' };
    } catch (error) {
      deliveries[role] = { status: 'failed', address, error: error.message || 'Falló el envío SMTP.' };
    }
  }
  return deliveries;
}

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
    companyRuc,
    companyAddress,
    companyPhone,
    claveAcceso,
    // eslint-disable-next-line no-unused-vars
    fechaAutorizacion,
    documentType,
    date,
    isTest
  } = req.body || {};

  const smtpConfig = resolveSmtpConfig({ smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure });

  if (!smtpConfig.isValid) {
    res.status(400).json({ error: 'Configuración SMTP incompleta en Ajustes (Servidor, Usuario o Contraseña).' });
    return;
  }

  const issuerAddress = String(emitterEmail || smtpConfig.user || '').trim();
  const recipientTo = String(to || issuerAddress || '').trim();
  const recipients = invoiceEmailRecipients(to, issuerAddress);
  if (!recipientTo || (!isTest && documentType !== 'prueba' && !recipients.length)) {
    res.status(400).json({ error: 'No se especificó destinatario (el cliente no tiene correo registrado ni existe correo de contacto del emisor).' });
    return;
  }

  try {
    const senderDomain = resolveSenderDomain(smtpConfig.user, smtpConfig.host);

    // 1. Configurar el transportador SMTP con EHLO coherente con el dominio del remitente
    const transporter = nodemailer.createTransport({
      name: senderDomain,
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        // En Ecuador, muchos dominios cPanel/Zimbra usan certificados compartidos
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    const cleanCompanyName = String(companyName || 'Facturación Electrónica').replace(/["\r\n]/g, '').trim();
    const fromAddress = {
      name: cleanCompanyName,
      address: smtpConfig.user
    };

    // 2. Modo prueba de conexión
    if (isTest || documentType === 'prueba') {
      const testMailOptions = {
        from: fromAddress,
        to: recipientTo,
        subject: `[WebFix ERP] Prueba de Conexión SMTP Exitosa`,
        text: `¡Hola!\n\nEste es un mensaje de prueba para confirmar que tu servidor SMTP (${smtpConfig.host}:${smtpConfig.port}) está funcionando correctamente en WebFix ERP.\n\nTus clientes ya pueden recibir comprobantes autorizados y enlaces a su RIDE por correo.\n\nFecha: ${new Date().toLocaleString('es-EC')}`,
        html: `
          <div style="font-family: 'Inter', sans-serif, Arial; padding: 24px; background-color: #F2F4FF;">
            <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #CAD1F4; padding: 30px; text-align: left;">
              <h2 style="color: #1C40F2; margin-top: 0;">¡Conexión SMTP Exitosa!</h2>
              <p style="font-size: 13px; color: #333333; line-height: 1.6;">
                Tu servidor de correo saliente <strong>${smtpConfig.host}</strong> en el puerto <strong>${smtpConfig.port}</strong> (SSL/TLS: ${smtpConfig.secure ? 'Sí' : 'No'}) fue configurado correctamente.
              </p>
              <p style="font-size: 13px; color: #333333; line-height: 1.6;">
                Desde ahora, cuando emitas facturas o comprobantes autorizados por el SRI, se enviarán automáticamente desde <strong>${smtpConfig.user}</strong>.
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
        isSafeExternalUrl(pdfUrl, { restrictToStorage: true }) &&
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
      } else if (isSafeExternalUrl(xmlUrl, { restrictToStorage: true })) {
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

    // Resolver URL absoluta para el RIDE
    const headers = req.headers || {};
    let originBase = '';
    if (headers.origin) {
      originBase = headers.origin;
    } else if (headers.referer) {
      try {
        const refUrl = new URL(headers.referer);
        originBase = refUrl.origin;
      } catch {
        // fallback
      }
    }
    if (!originBase) {
      const proto = headers['x-forwarded-proto'] || (headers.host?.includes('localhost') ? 'http' : 'https');
      const host = headers['x-forwarded-host'] || headers.host || 'localhost:5173';
      originBase = `${proto}://${host}`;
    }

    let resolvedPdfUrl = pdfUrl || '';
    if (resolvedPdfUrl && resolvedPdfUrl.startsWith('/')) {
      resolvedPdfUrl = `${originBase}${resolvedPdfUrl}`;
    }
    const safePdfHref = /^https?:\/\//i.test(resolvedPdfUrl) ? resolvedPdfUrl.replace(/["'<>]/g, '') : '';
    const safeXmlHref = (!String(documentType || '').toLowerCase().includes('nota_venta') && /^https?:\/\//i.test(String(xmlUrl || ''))) ? String(xmlUrl).replace(/["'<>]/g, '') : '';

    const isNotaVenta = String(documentType || '').toLowerCase() === 'nota_venta';
    const formattedTotal = `$${Number(total || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safeClientDisplay = String(clientName || 'Cliente').trim();
    const safeCompanyDisplay = String(cleanCompanyName || 'Emisor').trim();

    const buildMailOptions = (address, isDirectToEmitter) => {
      const subject = isDirectToEmitter
        ? (isNotaVenta
            ? `Emitiste comprobante de venta: ${documentNumber || ''}`
            : `Emitiste ${docTypeLabel.toLowerCase()} electrónica: ${documentNumber || ''}`)
        : (isNotaVenta
            ? `Comprobante de Venta: ${documentNumber || ''}`
            : `Comprobante Electrónico Autorizado: ${documentNumber || ''}`);

      const plainLines = [
        isDirectToEmitter ? `Hola, ${safeCompanyDisplay}:` : `Estimado/a ${safeClientDisplay}:`,
        '',
        isDirectToEmitter
          ? `Se ha emitido un comprobante ${isNotaVenta ? 'de venta' : 'electrónico autorizado'} para ${safeClientDisplay}.`
          : `${safeCompanyDisplay} le informa que se ha emitido un comprobante ${isNotaVenta ? 'de venta' : 'electrónico autorizado por el SRI'} a su nombre.`,
        '',
        `Tipo de documento: ${docTypeLabel}`,
        `Número: ${documentNumber || '-'}`,
        `Fecha de emisión: ${date || '-'}`,
        `Cliente: ${safeClientDisplay}`,
        `Identificación: ${clientIdentification || '-'}`,
        `Total: ${formattedTotal}`,
        ...(claveAcceso ? [`Clave de acceso SRI: ${claveAcceso}`] : []),
        '',
        ...(safePdfHref ? [`Ver o descargar comprobante (RIDE PDF): ${safePdfHref}`] : []),
        ...(safeXmlHref ? [`Descargar XML autorizado: ${safeXmlHref}`] : []),
        ...(attachments.length > 0 ? ['Los archivos del comprobante se encuentran adjuntos a este correo.'] : []),
        '',
        `Este documento digital tiene validez ${isNotaVenta ? 'comercial' : 'tributaria'}. Por favor consérvelo para sus registros.`,
        '',
        `Atentamente,`,
        safeCompanyDisplay,
        ...(companyPhone ? [`Teléfono: ${companyPhone}`] : []),
        ...(companyAddress ? [`Dirección: ${companyAddress}`] : []),
      ];

      return {
        from: fromAddress,
        replyTo: issuerAddress || smtpConfig.user,
        to: address,
        messageId: `<${crypto.randomUUID()}@${senderDomain}>`,
        headers: {
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
        },
        subject,
        text: plainLines.join('\n'),
        html: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:#004227;padding:22px 24px;text-align:left;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#c0ffa5;font-weight:bold;">
                ${escapeHtml(safeCompanyDisplay)}
              </p>
              <h1 style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;line-height:1.3;">
                ${isDirectToEmitter ? 'Copia de respaldo de comprobante emitido' : (isNotaVenta ? 'Comprobante de venta disponible' : `${escapeHtml(docTypeLabel)} electrónica autorizada`)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:14px;line-height:1.6;color:#1b1b1b;">
              <p style="margin:0 0 14px 0;">
                ${isDirectToEmitter ? `Hola, <strong>${escapeHtml(safeCompanyDisplay)}</strong>:` : `Estimado/a <strong>${escapeHtml(safeClientDisplay)}</strong>:`}
              </p>
              <p style="margin:0 0 18px 0;color:#444444;">
                ${isDirectToEmitter
                  ? `Se ha emitido un comprobante ${isNotaVenta ? 'de venta' : 'electrónico autorizado por el SRI'} para <strong>${escapeHtml(safeClientDisplay)}</strong>.`
                  : `<strong>${escapeHtml(safeCompanyDisplay)}</strong> ha emitido un comprobante ${isNotaVenta ? 'de venta' : 'electrónico autorizado por el SRI'} a su nombre.`}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e3e3;border-radius:8px;background-color:#fafafa;margin-bottom:18px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.6;">
                    <div><strong>${escapeHtml(docTypeLabel)}:</strong> ${escapeHtml(documentNumber || '-')}</div>
                    <div><strong>Fecha de emisión:</strong> ${escapeHtml(date || '-')}</div>
                    <div><strong>Cliente:</strong> ${escapeHtml(safeClientDisplay)}</div>
                    <div><strong>Identificación:</strong> ${escapeHtml(clientIdentification || '-')}</div>
                    <div><strong>Total incluido IVA:</strong> <span style="color:#004227;font-weight:bold;">${escapeHtml(formattedTotal)}</span></div>
                    ${claveAcceso ? `<div style="margin-top:8px;font-size:11px;color:#555555;word-break:break-all;"><strong>Clave de acceso SRI:</strong> ${escapeHtml(claveAcceso)}</div>` : ''}
                  </td>
                </tr>
              </table>

              ${(safePdfHref || safeXmlHref) ? `
              <p style="margin:0 0 18px 0;text-align:center;">
                ${safePdfHref ? `<a href="${safePdfHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0b996f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:11px 20px;border-radius:8px;margin:4px;">Ver comprobante (PDF)</a>` : ''}
                ${safeXmlHref ? `<a href="${safeXmlHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1b1b1b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:11px 20px;border-radius:8px;margin:4px;">Descargar XML</a>` : ''}
              </p>
              ` : ''}

              <p style="margin:0;font-size:12px;color:#666666;line-height:1.5;">
                Este documento digital tiene validez ${isNotaVenta ? 'comercial' : 'tributaria'}. Le sugerimos conservarlo para sus registros contables.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;border-top:1px solid #efefef;background-color:#fafafa;font-size:11px;color:#666666;text-align:center;">
              ${escapeHtml(safeCompanyDisplay)}${companyRuc ? ` · RUC ${escapeHtml(companyRuc)}` : ''}${companyPhone ? ` · Tel: ${escapeHtml(companyPhone)}` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        attachments
      };
    };

    // Cada destinatario recibe su propio correo y resultado; un fallo no oculta el otro.
    const deliveries = await deliverInvoiceMessages(transporter, recipients, buildMailOptions);
    if (to && issuerAddress && to.trim().toLowerCase() === issuerAddress.trim().toLowerCase() && deliveries.emitter && !deliveries.client) {
      deliveries.client = { ...deliveries.emitter, note: 'Entregado a la dirección compartida con el emisor.' };
    }
    const success = recipients.every(({ role }) => deliveries[role]?.status === 'sent');
    res.status(success ? 200 : 502).json({ success, deliveries, ...(!success && { error: 'Uno o más destinatarios no aceptaron el correo.' }) });
  } catch (err) {
    console.error('Error al enviar correo SMTP:', err);

    let clientMsg = err.message || 'Error desconocido';
    if (err.code === 'EAUTH' || clientMsg.toLowerCase().includes('invalid login')) {
      clientMsg = 'Credenciales SMTP incorrectas (usuario o contraseña no válidos para el servidor de correo).';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET' || clientMsg.toLowerCase().includes('timeout')) {
      clientMsg = `Tiempo de espera agotado conectando a ${smtpConfig.host}:${smtpConfig.port}. Verifica si el puerto requiere SSL o TLS.`;
    } else if (err.code === 'ECONNREFUSED') {
      clientMsg = `Conexión rechazada por el servidor ${smtpConfig.host}:${smtpConfig.port}. Verifica que el host y puerto sean correctos.`;
    } else if (err.code === 'ENOTFOUND') {
      clientMsg = `No se pudo encontrar el servidor SMTP (${smtpConfig.host}). Verifica la dirección del host.`;
    }

    res.status(502).json({ error: `Fallo al enviar correo por SMTP: ${clientMsg}` });
  }
}
