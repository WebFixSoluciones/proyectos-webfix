const nodes = (node, name) => Array.from(node.getElementsByTagName('*')).filter(n => n.localName === name);
const text = (node, name) => nodes(node, name)[0]?.textContent?.trim() || '';
export function parseSriAuthorization(responseXml, claveAcceso, Parser = DOMParser) {
  if (!/^\d{49}$/.test(claveAcceso)) throw new Error('La clave de acceso debe contener 49 dígitos.');
  const doc = new Parser().parseFromString(responseXml, 'text/xml');
  if (nodes(doc, 'parsererror').length || nodes(doc, 'Fault').length) throw new Error('Respuesta de autorización inválida del SRI.');
  const authorizations = nodes(doc, 'autorizacion');
  const authorized = authorizations.find(n => text(n, 'estado') === 'AUTORIZADO');
  if (authorized) {
    const receipt = text(authorized, 'comprobante');
    const receiptDoc = new Parser().parseFromString(receipt, 'text/xml');
    if (text(authorized, 'numeroAutorizacion') !== claveAcceso || text(receiptDoc, 'claveAcceso') !== claveAcceso) throw new Error('La autorización del SRI no corresponde a la clave consultada.');
    const serialized = new XMLSerializer().serializeToString(authorized);
    return { status: 'autorizado', claveAcceso, fechaAutorizacion: text(authorized, 'fechaAutorizacion'), xmlAutorizado: `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`, signedXml: receipt, responseXml };
  }
  const rejected = authorizations.find(n => text(n, 'estado') === 'NO AUTORIZADO');
  if (rejected) return { status: 'no_autorizado', claveAcceso, message: nodes(rejected, 'mensaje').filter(n => text(n, 'identificador')).map(n => `[${text(n, 'identificador')}] ${text(n, 'mensaje')} ${text(n, 'informacionAdicional')}`).join(' | ') };
  if (!nodes(doc, 'RespuestaAutorizacionComprobante').length && !nodes(doc, 'autorizaciones').length) throw new Error('Respuesta de autorización incompleta.');
  return { status: 'pendiente_sri', claveAcceso, message: 'El SRI aún no devuelve una autorización final. Consultar nuevamente sin cambiar clave ni secuencial.' };
}

export function sriDocumentLinks(document, tenantId) {
  const clave = document.claveAcceso || '';
  return {
    ride: `${typeof location === 'undefined' ? '' : location.origin}/#/public/ride?claveAcceso=${encodeURIComponent(clave)}&tenantId=${encodeURIComponent(tenantId)}`,
    xml: document.xmlAutorizado || document.xml || '',
    sri: 'https://srienlinea.sri.gob.ec/sri-en-linea/',
  };
}

export function downloadFiscalXml(xml, filename) {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
