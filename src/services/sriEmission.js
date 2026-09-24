// Fiscal identity is durable before any external request. A timeout never releases it.
export async function reserveSriEmission({ db, appId, docId, secKey, build, api }) {
  const ref = api.doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId);
  const configRef = api.doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
  return api.runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists() && existing.data().claveAcceso) return { created: false, document: { ...existing.data(), id: docId } };
    const configSnap = await tx.get(configRef);
    if (!configSnap.exists()) throw new Error('No existe configuración del emisor.');
    const config = configSnap.data();
    const scope = `${config.ruc}_${config.ambiente}_${secKey}_${config.establecimiento || '001'}_${config.puntoEmision || '001'}`;
    const counterRef = api.doc(db, 'artifacts', appId, 'public', 'data', 'sri_sequences', scope);
    const counter = await tx.get(counterRef);
    const next = Math.max(Number(config[secKey] || 1), Number(counter.data()?.next || 1));
    if (!Number.isSafeInteger(next) || next < 1 || next > 999999999) throw new Error('Secuencial fiscal inválido o agotado.');
    const document = await build(config, String(next));
    if (!/^\d{49}$/.test(document.claveAcceso) || !document.xml) throw new Error('No se puede reservar sin clave de acceso y XML firmado.');
    if (document.id !== docId || document.claveAcceso.slice(10, 23) !== String(config.ruc) || document.claveAcceso[23] !== String(config.ambiente) || Number(document.claveAcceso.slice(30, 39)) !== next) throw new Error('La identidad del XML no coincide con el emisor o secuencial reservado.');
    tx.set(ref, document);
    tx.set(counterRef, { next: next + 1, lastDocumentId: docId, updatedAt: new Date().toISOString() });
    tx.update(configRef, { [secKey]: next + 1 });
    return { created: true, document, config };
  });
}

export async function saveSriResult({ db, appId, document, result, api }) {
  const ref = api.doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', document.id);
  return api.runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().claveAcceso !== document.claveAcceso) throw new Error('La identidad fiscal cambió; no se sobrescribirá el comprobante.');
    const current = { ...snapshot.data(), id: document.id };
    if (current.sriStatus === 'autorizado' && (current.xmlAutorizado || result.status !== 'autorizado')) return current;
    const patch = {
      sriStatus: result.status,
      sriLastCheckedAt: new Date().toISOString(),
      sriLastError: result.message || '',
    };
    if (result.status === 'autorizado') {
      if (result.claveAcceso !== current.claveAcceso || !result.xmlAutorizado) throw new Error('Autorización sin evidencia XML válida.');
      Object.assign(patch, { fechaAutorizacion: result.fechaAutorizacion, xmlAutorizado: result.xmlAutorizado, sriAuthorizationResponse: result.responseXml || '', financialSyncStatus: current.financialSyncStatus === 'complete' ? 'complete' : current.sriRecoveryOnly ? 'review_required' : 'pending' });
    }
    tx.set(ref, patch, { merge: true });
    return { ...current, ...patch };
  });
}
