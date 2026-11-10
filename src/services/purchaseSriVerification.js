const nodeText = (parent, tag) => parent?.getElementsByTagName(tag)?.[0]?.textContent?.trim() || '';

function mismatch(message) {
  const error = new Error(message);
  error.code = 'PURCHASE_SRI_MISMATCH';
  throw error;
}

export function verifyPurchaseSriXml(signedXml, expected, Parser = DOMParser) {
  const xml = new Parser().parseFromString(signedXml, 'text/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('El XML autorizado no se pudo leer.');
  const tributaria = xml.getElementsByTagName('infoTributaria')[0];
  const factura = xml.getElementsByTagName('infoFactura')[0];
  if (!tributaria || !factura) throw new Error('El XML autorizado no corresponde a una factura.');

  const claveAcceso = nodeText(tributaria, 'claveAcceso');
  const supplierRuc = nodeText(tributaria, 'ruc');
  const receiverRuc = nodeText(factura, 'identificacionComprador');
  const documentNumber = [nodeText(tributaria, 'estab'), nodeText(tributaria, 'ptoEmi'), nodeText(tributaria, 'secuencial')].join('-');
  const total = Number(nodeText(factura, 'importeTotal'));

  if (claveAcceso !== expected.claveAcceso) mismatch('La clave del XML SRI no coincide con la compra.');
  if (receiverRuc !== expected.companyRuc) mismatch('El SRI no confirma a esta empresa como receptora de la factura.');
  if (expected.supplierRuc && supplierRuc !== expected.supplierRuc) mismatch('El RUC del proveedor no coincide con el SRI.');
  if (expected.documentNumber && documentNumber !== expected.documentNumber) mismatch('El número de factura no coincide con el SRI.');
  if (!Number.isFinite(total) || Math.abs(total - Number(expected.total)) > 0.01) mismatch('El total de la compra no coincide con el SRI.');

  return { claveAcceso, supplierRuc, receiverRuc, documentNumber, total };
}
