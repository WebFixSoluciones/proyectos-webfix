import { consultarAutorizacionSRI } from './sriService.js';
import * as api from './financeStore.js';

const elements = (node, name) => Array.from(node.getElementsByTagName('*')).filter(n => n.localName === name);
const value = (node, name) => elements(node, name)[0]?.textContent?.trim() || '';

export function recoveredInvoice(result) {
  if (result.status !== 'autorizado' || !result.signedXml || !result.xmlAutorizado) throw new Error('Se requiere una autorización real del SRI.');
  const xml = new DOMParser().parseFromString(result.signedXml, 'text/xml');
  if (xml.documentElement.localName !== 'factura') throw new Error('La recuperación por clave de esta pantalla admite facturas.');
  const key = value(xml, 'claveAcceso');
  if (key !== result.claveAcceso) throw new Error('El XML no corresponde a la autorización.');
  const items = elements(xml, 'detalle').map((detail, index) => {
    const base = Number(value(detail, 'precioTotalSinImpuesto'));
    const taxes = elements(detail, 'impuesto');
    const vat = taxes.find(tax => value(tax, 'codigo') === '2');
    const rate = Number(vat ? value(vat, 'tarifa') : 0);
    const taxAmount = taxes.reduce((sum, tax) => sum + Number(value(tax, 'valor')), 0);
    return {
      lineId: `${key}-${index}`, productId: '', name: value(detail, 'descripcion'), invoiceDescription: value(detail, 'descripcion'),
      sku: value(detail, 'codigoPrincipal'), quantity: Number(value(detail, 'cantidad')), price: Number(value(detail, 'precioUnitario')),
      taxRate: rate, tarifa_iva: rate / 100, discount: 0,
      precio_base_unitario: Number(value(detail, 'precioUnitario')), monto_descuento_linea: Number(value(detail, 'descuento')), descuento_prorrateado: 0,
      subtotal_neto_linea_final: base, total_linea: base + taxAmount,
    };
  });
  const taxTotal = elements(xml, 'totalImpuesto').reduce((sum, tax) => sum + Number(value(tax, 'valor')), 0);
  const [day, month, year] = value(xml, 'fechaEmision').split('/');
  return {
    id: `sri_${key}`, type: 'ingreso', documentType: 'factura', claveAcceso: key, sriStatus: 'autorizado', sriAmbiente: value(xml, 'ambiente'),
    documentNumber: [value(xml, 'estab'), value(xml, 'ptoEmi'), value(xml, 'secuencial')].join('-'), secuencial: value(xml, 'secuencial'),
    date: `${year}-${month}-${day}`, fechaAutorizacion: result.fechaAutorizacion,
    thirdParty: { name: value(xml, 'razonSocialComprador'), ruc: value(xml, 'identificacionComprador'), direccion: value(xml, 'direccionComprador') }, thirdPartyId: '',
    items, total: Number(value(xml, 'importeTotal')), baseImponible: Number(value(xml, 'totalSinImpuestos')), ivaValor: taxTotal,
    xml: result.signedXml, xmlAutorizado: result.xmlAutorizado, sriAuthorizationResponse: result.responseXml || '',
    emisorSnapshot: { ruc: value(xml, 'ruc'), razonSocial: value(xml, 'razonSocial'), nombreComercial: value(xml, 'nombreComercial'), direccionMatriz: value(xml, 'dirMatriz'), dirMatriz: value(xml, 'dirMatriz'), direccion: value(xml, 'dirMatriz'), establecimiento: value(xml, 'estab'), puntoEmision: value(xml, 'ptoEmi'), ambiente: value(xml, 'ambiente'), obligadoContabilidad: value(xml, 'obligadoContabilidad') === 'SI' },
    sriRecoveryOnly: true, financialSyncStatus: 'review_required', paymentStatus: 'por_conciliar',
    recoveryNote: 'Recuperada del SRI. Revisar cobros, productos e inventario antes de registrar movimientos para evitar duplicados.',
  };
}

export async function recoverInvoiceFromSri(db, appId, key, store = api, consult = consultarAutorizacionSRI) {
  if (!/^\d{49}$/.test(key)) throw new Error('La clave debe contener 49 dígitos.');
  const configRef = store.doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
  const config = (await store.getDoc(configRef)).data();
  if (!config || key.slice(10, 23) !== config.ruc || key[23] !== String(config.ambiente)) throw new Error('La clave no pertenece al RUC y ambiente de este tenant.');
  const result = await consult(key, key[23]);
  if (result.status !== 'autorizado') throw new Error(result.message || 'Aún no existe autorización.');
  const recovered = recoveredInvoice(result);
  const collection = store.collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
  const matches = await store.getDocs(store.query(collection, store.where('documentNumber', '==', recovered.documentNumber)));
  const existing = matches.docs.filter(d => d.data().documentType === 'factura' && (d.data().sriAmbiente || d.data().claveAcceso?.[23] || String(config.ambiente)) === key[23]);
  if (existing.some(d => d.data().claveAcceso && d.data().claveAcceso !== key) || existing.length > 1) throw new Error('Hay un conflicto local con este número. Requiere conciliación antes de importar.');
  if (existing.some(d => !d.data().claveAcceso)) throw new Error('Existe un documento local sin clave con ese número. Requiere revisión antes de asociarlo a la autorización.');
  const id = existing[0]?.id || recovered.id;
  const target = store.doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id);
  const seqRef = store.doc(db, 'artifacts', appId, 'public', 'data', 'sri_sequences', `${config.ruc}_${config.ambiente}_secuencialFactura_${recovered.emisorSnapshot.establecimiento}_${recovered.emisorSnapshot.puntoEmision}`);
  return store.runTransaction(db, async transaction => {
    const [current, settings, sequence] = await Promise.all([transaction.get(target), transaction.get(configRef), transaction.get(seqRef)]);
    if (settings.data()?.ruc !== key.slice(10, 23) || String(settings.data()?.ambiente) !== key[23]) throw new Error('La configuración del tenant cambió durante la recuperación.');
    if (current.data()?.claveAcceso && current.data().claveAcceso !== key) throw new Error('Conflicto de identidad fiscal.');
    const document = current.exists()
      ? { ...current.data(), id, sriStatus: 'autorizado', claveAcceso: key, fechaAutorizacion: recovered.fechaAutorizacion, xmlAutorizado: recovered.xmlAutorizado, xml: recovered.xml, sriLastCheckedAt: new Date().toISOString(), sriAuthorizationResponse: recovered.sriAuthorizationResponse, sriAmbiente: recovered.sriAmbiente, emisorSnapshot: recovered.emisorSnapshot, financialSyncStatus: current.data().financialSyncStatus === 'complete' ? 'complete' : current.data().sriRecoveryOnly ? 'review_required' : 'pending' }
      : { ...recovered, id };
    transaction.set(target, document);
    const next = Number(recovered.secuencial) + 1;
    transaction.set(seqRef, { next: Math.max(next, Number(sequence.data()?.next || 1)), lastRecoveredKey: key }, { merge: true });
    if ((settings.data().establecimiento || '001') === recovered.emisorSnapshot.establecimiento && (settings.data().puntoEmision || '001') === recovered.emisorSnapshot.puntoEmision) transaction.update(configRef, { secuencialFactura: Math.max(next, Number(settings.data().secuencialFactura || 1)) });
    return document;
  });
}
