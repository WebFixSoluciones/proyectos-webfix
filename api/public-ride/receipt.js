const pick = (value, fields) => Object.fromEntries(fields
  .filter(field => value?.[field] !== undefined)
  .map(field => [field, value[field]]));

const fiscalFields = [
  'razonSocial', 'nombreComercial', 'ruc', 'direccionMatriz', 'dirMatriz',
  'dirEstablecimiento', 'establecimiento', 'puntoEmision', 'obligadoContabilidad',
  'contribuyenteRimpe', 'ambiente', 'contribuyenteEspecial', 'especialResolucion',
  'agenteRetencion', 'agenteResolucion', 'resolucionMicro', 'logoUrl', 'logo',
  'telefonoContacto', 'telefono'
];

export const projectPublicIssuer = issuer => pick(issuer, fiscalFields);

export function projectPublicReceipt(transaction) {
  const lineFields = [
    'name', 'invoiceDescription', 'sku', 'unit', 'quantity', 'price', 'discount',
    'ivaCategory', 'tarifa_iva', 'precio_base_unitario', 'monto_descuento_linea',
    'descuento_prorrateado', 'subtotal_neto_linea_final', 'total_linea'
  ];
  const receipt = pick(transaction, [
    'id', 'documentType', 'documentNumber', 'claveAcceso', 'fechaAutorizacion',
    'date', 'time', 'sriStatus', 'baseImponible', 'ivaValor', 'descuentoValor',
    'iceValor', 'irbpnrValor', 'irf175Valor', 'irf275Valor', 'propinaValor',
    'retencionFuente', 'retencionIva', 'total', 'paymentMethod', 'paymentsBreakdown',
    'thirdPartyName', 'thirdPartyRuc', 'thirdPartyDireccion', 'creditDueDate',
    'guiaRemision', 'logoUrl'
  ]);
  receipt.emisorSnapshot = projectPublicIssuer(transaction.emisorSnapshot);
  receipt.thirdParty = pick(transaction.thirdParty, ['name', 'ruc', 'direccion']);
  receipt.items = Array.isArray(transaction.items)
    ? transaction.items.map(item => pick(item, lineFields))
    : [];
  return receipt;
}

export async function resolvePublicReceipt({ getById, getByKey }, { tenantId, txId, claveAcceso, token }) {
  let transaction = txId ? await getById(tenantId, txId) : null;
  if (!transaction && claveAcceso) transaction = await getByKey(tenantId, claveAcceso);
  if (!transaction || transaction.type !== 'ingreso') return null;

  if (claveAcceso) {
    if (transaction.claveAcceso !== claveAcceso || transaction.sriStatus !== 'autorizado') return null;
  } else if (transaction.documentType === 'nota_venta' && txId
    && transaction.documentNumber && transaction.sriStatus === 'autorizado'
    && !transaction.isPreventa) {
    if (transaction.publicRideToken && transaction.publicRideToken !== token) return null;
  } else {
    return null;
  }

  return projectPublicReceipt(transaction);
}
