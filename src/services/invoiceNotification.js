const emailAddress = value => {
  const address = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : '';
};

const firstEmail = (...values) => values.map(emailAddress).find(Boolean) || '';

export async function notifyAuthorizedInvoice({ db, appId, document, customer, config, api, fetchEmail = fetch, force = false }) {
  const isNotaVenta = (document?.documentType === 'nota_venta');
  if (isNotaVenta) {
    if (!document?.documentNumber) return { status: 'not_authorized', message: 'La nota de venta no tiene número emitido.' };
  } else {
    if (document?.sriStatus !== 'autorizado') return { status: 'not_authorized', message: 'El comprobante aún no está autorizado por el SRI.' };
  }

  const documentRef = api.doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', document.id);
  const settings = config || (await api.getDoc(api.doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'))).data();
  if (settings?.smtpActivo === false) return { status: 'disabled', message: 'El envío automático de correos está desactivado en Ajustes.' };
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) return { status: 'unconfigured', message: 'Configuración SMTP incompleta en Ajustes.' };

  const emitterEmail = firstEmail(settings.correoContacto, settings.email, settings.smtpUser);
  const customerEmail = firstEmail(customer?.email, customer?.correo, customer?.correoElectronico, customer?.mail);
  const clientEmail = customerEmail.includes('consumidorfinal') ? '' : customerEmail;
  if (!emitterEmail) return { status: 'unconfigured', message: 'No hay correo emisor configurado en Ajustes.' };

  const now = new Date();
  const claim = await api.runTransaction(db, async transaction => {
    const snapshot = await transaction.get(documentRef);
    if (!snapshot.exists()) return { status: 'not_authorized', message: 'Comprobante no encontrado en base de datos.' };
    const docData = snapshot.data();
    const isDocNotaVenta = document.documentType === 'nota_venta' || docData.documentType === 'nota_venta';
    if (!isDocNotaVenta) {
      if (docData.claveAcceso !== document.claveAcceso || docData.sriStatus !== 'autorizado') return { status: 'not_authorized', message: 'Comprobante no autorizado en el sistema.' };
    } else {
      if (!docData.documentNumber && !document.documentNumber) return { status: 'not_authorized', message: 'Nota de venta sin secuencial emitido.' };
    }

    const previous = snapshot.data().emailDelivery || {};
    const claimedAt = Date.parse(previous.claimedAt || '');
    if (!force && Number.isFinite(claimedAt) && now.getTime() - claimedAt < 20000) return { status: 'in_progress', message: 'Envío de correo en curso. Espera unos segundos.' };
    const sendClient = !!clientEmail && (force || !(previous.client?.status === 'sent' && String(previous.client.address || '').toLowerCase() === clientEmail.toLowerCase()));
    const sendEmitter = force || !(previous.emitter?.status === 'sent' && String(previous.emitter.address || '').toLowerCase() === emitterEmail.toLowerCase());
    if (!sendClient && !sendEmitter) return { status: 'already_sent', delivery: previous, message: 'El comprobante ya fue enviado.' };
    transaction.set(documentRef, { emailDelivery: { ...previous, claimedAt: now.toISOString() } }, { merge: true });
    return { status: 'claimed', previous, sendClient, sendEmitter };
  });
  if (claim.status !== 'claimed') return claim;

  const receiver = customer || document.thirdParty || {};
  const effectivePdf = document.pdfUrl && !document.pdfUrl.includes('srienlinea.sri.gob.ec')
    ? document.pdfUrl
    : isNotaVenta
      ? `/#/public/ride?txId=${encodeURIComponent(document.id)}&tenantId=${encodeURIComponent(appId)}`
      : `/#/public/ride?txId=${encodeURIComponent(document.id)}&claveAcceso=${encodeURIComponent(document.claveAcceso || '')}&tenantId=${encodeURIComponent(appId)}`;
  const rawXml = isNotaVenta ? '' : (document.xmlAutorizado || document.xml || (typeof document.xmlUrl === 'string' && document.xmlUrl.startsWith('data:') ? document.xmlUrl : ''));
  const payload = {
    smtpHost: settings.smtpHost, smtpPort: settings.smtpPort || (settings.smtpSecure ? 465 : 587),
    smtpUser: settings.smtpUser, smtpPass: settings.smtpPass, smtpSecure: settings.smtpSecure,
    to: claim.sendClient ? clientEmail : '', emitterEmail: claim.sendEmitter ? emitterEmail : '',
    clientName: receiver.name || receiver.razonSocial || 'Consumidor Final',
    clientIdentification: receiver.ruc || receiver.identificacion || '9999999999999',
    documentNumber: document.documentNumber, total: document.total, pdfUrl: effectivePdf,
    xmlUrl: isNotaVenta ? '' : (document.xmlUrl || ''), xmlContent: rawXml,
    companyName: settings.nombreComercial || settings.razonSocial || 'Facturación Electrónica',
    logoUrl: settings.logoUrl || '', companyRuc: settings.ruc || '',
    companyAddress: settings.direccionMatriz || '', companyPhone: settings.telefono || settings.telefonoContacto || '',
    claveAcceso: document.claveAcceso || '', fechaAutorizacion: document.fechaAutorizacion || '',
    documentType: document.documentType || (isNotaVenta ? 'nota_venta' : 'factura'), date: document.date || '',
  };

  let responseData = {};
  let requestError = '';
  try {
    const response = await fetchEmail('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    responseData = await response.json();
    if (!response.ok) requestError = responseData.error || `Error de correo (${response.status})`;
  } catch (error) {
    requestError = error.message || 'Servicio de correo no disponible.';
  }

  const delivery = { ...claim.previous, claimedAt: '', lastAttemptAt: new Date().toISOString() };
  for (const [role, pending, address] of [['client', claim.sendClient, clientEmail], ['emitter', claim.sendEmitter, emitterEmail]]) {
    if (!pending) {
      if (role === 'client' && !clientEmail) delivery.client = { status: 'skipped', address: '' };
      continue;
    }
    const result = responseData.deliveries?.[role];
    delivery[role] = result?.status === 'sent'
      ? { status: 'sent', address, messageId: result.messageId || '', sentAt: new Date().toISOString() }
      : { status: 'failed', address, error: result?.error || requestError || 'El servidor no confirmó el envío.' };
  }
  await api.setDoc(documentRef, { emailDelivery: delivery }, { merge: true });
  const clientOk = !clientEmail || delivery.client?.status === 'sent';
  const emitterOk = delivery.emitter?.status === 'sent';
  const finalStatus = clientOk && emitterOk ? 'sent' : (delivery.client?.status === 'sent' || delivery.emitter?.status === 'sent') ? 'partial' : 'failed';
  const finalError = requestError || (!clientOk ? delivery.client?.error : '') || (!emitterOk ? delivery.emitter?.error : '');
  return { status: finalStatus, delivery, error: finalError };
}
