import { tracksStock } from './productModel.js';

const text = (parent, tag) => parent?.getElementsByTagName(tag)?.[0]?.textContent?.trim() || '';

export function parsePurchaseInvoiceXml(source, products = [], Parser = DOMParser) {
  let xml = new Parser().parseFromString(source, 'text/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('El archivo XML no se pudo leer.');
  if (!xml.getElementsByTagName('infoTributaria').length) {
    const inner = text(xml, 'comprobante');
    if (inner) xml = new Parser().parseFromString(inner, 'text/xml');
  }
  const tributaria = xml.getElementsByTagName('infoTributaria')[0];
  const factura = xml.getElementsByTagName('infoFactura')[0];
  if (!tributaria || !factura) throw new Error('Selecciona un XML de factura de compra.');

  const supplierRuc = text(tributaria, 'ruc');
  const documentNumber = [text(tributaria, 'estab'), text(tributaria, 'ptoEmi'), text(tributaria, 'secuencial')].join('-');
  const claveAcceso = text(tributaria, 'claveAcceso');
  const rawDate = text(factura, 'fechaEmision');
  const date = /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)
    ? `${rawDate.slice(6)}-${rawDate.slice(3, 5)}-${rawDate.slice(0, 2)}` : rawDate;
  const total = Number(text(factura, 'importeTotal'));
  const baseImponible = Number(text(factura, 'totalSinImpuestos'));
  if (!supplierRuc || !/^\d{3}-\d{3}-\d{9}$/.test(documentNumber) ||
      !Number.isFinite(total) || total <= 0 || !Number.isFinite(baseImponible) || baseImponible < 0) {
    throw new Error('El XML no contiene una factura válida.');
  }

  const bySku = new Map(products.filter(product => product.sku && tracksStock(product)).map(product => [String(product.sku).trim().toUpperCase(), product]));
  const items = [...xml.getElementsByTagName('detalle')].map(detail => {
    const code = text(detail, 'codigoPrincipal') || text(detail, 'codigoAuxiliar');
    const matched = bySku.get(code.toUpperCase());
    const quantity = Number(text(detail, 'cantidad'));
    const price = Number(text(detail, 'precioUnitario'));
    const discount = Number(text(detail, 'descuento') || 0);
    const subtotal = Number(text(detail, 'precioTotalSinImpuesto'));
    const taxes = [...detail.getElementsByTagName('impuesto')].filter(tax => !text(tax, 'codigo') || text(tax, 'codigo') === '2');
    const taxBase = taxes.reduce((sum, tax) => sum + Number(text(tax, 'baseImponible') || 0), 0);
    const taxValue = taxes.reduce((sum, tax) => sum + Number(text(tax, 'valor') || 0), 0);
    const inferredRate = taxBase > 0 ? Math.round(taxValue / taxBase * 100) : 0;
    if (![quantity, price, discount, subtotal].every(Number.isFinite) || quantity <= 0 || price < 0 || subtotal < 0) {
      throw new Error('El XML contiene una línea con cantidad o costo inválido.');
    }
    return {
      productId: matched?.id || '', name: text(detail, 'descripcion') || matched?.name || code,
      sku: matched?.sku || code, quantity, price, discount, subtotal,
      ivaCategory: [0, 5, 12, 15].includes(inferredRate) ? inferredRate : 0
    };
  });

  const summaryTaxes = [...factura.getElementsByTagName('totalImpuesto')];
  const detailTaxes = [...xml.getElementsByTagName('detalle')].flatMap(detail => [...detail.getElementsByTagName('impuesto')]);
  const sourceTaxes = summaryTaxes.length ? summaryTaxes : detailTaxes;
  const ivaValor = sourceTaxes.length
    ? sourceTaxes.filter(tax => !text(tax, 'codigo') || text(tax, 'codigo') === '2')
      .reduce((sum, tax) => sum + Number(text(tax, 'valor') || 0), 0)
    : total - baseImponible;

  return {
    documentType: 'factura', documentNumber, claveAcceso, date,
    supplierRuc, supplierName: text(tributaria, 'razonSocial'),
    receiverRuc: text(factura, 'identificacionComprador'),
    items, baseImponible, ivaValor: Number(ivaValor.toFixed(2)),
    otrosImpuestos: Number((total - baseImponible - ivaValor).toFixed(2)), total,
    xmlContent: source
  };
}
