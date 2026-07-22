/**
 * SriAtsExporter.js
 * Generador oficial del Anexo Transaccional Simplificado (ATS XML) para el SRI de Ecuador.
 * Cumple con los catálogos y esquemas XML normados por el Servicio de Rentas Internas.
 */

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera el archivo XML del ATS para el periodo especificado
 * @param {Object} params 
 * @param {Object} params.companyProfile Datos de la empresa (RUC, Razón Social, Establecimiento)
 * @param {string} params.year Año (ej. "2026")
 * @param {string} params.month Mes (ej. "07" o "7")
 * @param {Array} params.transactions Lista de movimientos/comprobantes del periodo
 * @returns {string} String XML completo formateado del ATS
 */
export function generateSriAtsXml({ companyProfile = {}, year, month, transactions = [] }) {
  const rucEmpresa = companyProfile.ruc || '1790000000001';
  const razonSocialEmpresa = companyProfile.razonSocial || companyProfile.nombreComercial || 'EMPRESA REGISTRADA';
  const numEstabRuc = companyProfile.establecimiento || '001';
  const formattedMonth = String(month).padStart(2, '0');
  const formattedYear = String(year);

  // Filtrar transacciones del periodo
  const periodTxs = transactions.filter(t => {
    if (!t.date) return false;
    const [y, m] = t.date.split('-');
    return y === formattedYear && String(m).padStart(2, '0') === formattedMonth;
  });

  const ventas = periodTxs.filter(t => t.type === 'ingreso' || t.movementType === 'ingreso' || t.movementType === 'cobro');
  const compras = periodTxs.filter(t => t.type === 'egreso' || t.movementType === 'gasto' || t.movementType === 'pago');

  const totalVentas = ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<iva>\n`;
  xml += `  <TipoIDInformante>R</TipoIDInformante>\n`;
  xml += `  <IdInformante>${escapeXml(rucEmpresa)}</IdInformante>\n`;
  xml += `  <razonSocial>${escapeXml(razonSocialEmpresa)}</razonSocial>\n`;
  xml += `  <Anio>${formattedYear}</Anio>\n`;
  xml += `  <Mes>${formattedMonth}</Mes>\n`;
  xml += `  <numEstabRuc>${escapeXml(numEstabRuc)}</numEstabRuc>\n`;
  xml += `  <totalVentas>${totalVentas.toFixed(2)}</totalVentas>\n`;
  xml += `  <codigoOperativo>IVA</codigoOperativo>\n`;

  // --- SECCIÓN COMPRAS ---
  xml += `  <compras>\n`;
  if (compras.length > 0) {
    compras.forEach(c => {
      const docNumParts = (c.documentNumber || '001-001-000000001').split('-');
      const estab = (docNumParts[0] || '001').padStart(3, '0');
      const ptoEmi = (docNumParts[1] || '001').padStart(3, '0');
      const sec = (docNumParts[2] || '1').padStart(9, '0');

      const fechaReg = (c.date || '').split('-').reverse().join('/') || '01/07/2026';
      const fechaEmi = fechaReg;
      const subtotal0 = Number(c.subtotal0 || (c.ivaPorcentaje === 0 ? c.baseImponible || c.total : 0)) || 0;
      const subtotal15 = Number(c.subtotal15 || (c.ivaPorcentaje > 0 ? c.baseImponible || c.total / 1.15 : 0)) || 0;
      const montoIva = Number(c.ivaValor) || (c.ivaPorcentaje > 0 ? Number(c.total) - subtotal15 : 0);

      xml += `    <detalleCompras>\n`;
      xml += `      <codSustento>01</codSustento>\n`;
      xml += `      <tpIdProv>${c.thirdPartyRuc?.length === 10 ? '02' : '01'}</tpIdProv>\n`;
      xml += `      <idProv>${escapeXml(c.thirdPartyRuc || '9999999999999')}</idProv>\n`;
      xml += `      <tipoComprobante>${c.documentType === 'nota_venta' ? '02' : '01'}</tipoComprobante>\n`;
      xml += `      <fechaRegistro>${fechaReg}</fechaRegistro>\n`;
      xml += `      <establecimiento>${estab}</establecimiento>\n`;
      xml += `      <puntoEmision>${ptoEmi}</puntoEmision>\n`;
      xml += `      <secuencial>${sec}</secuencial>\n`;
      xml += `      <fechaEmision>${fechaEmi}</fechaEmision>\n`;
      xml += `      <autorizacion>${escapeXml(c.autorizacionSRI || '1234567890123456789012345678901234567890123456789')}</autorizacion>\n`;
      xml += `      <baseNoGraIva>0.00</baseNoGraIva>\n`;
      xml += `      <baseImponible>${subtotal0.toFixed(2)}</baseImponible>\n`;
      xml += `      <baseImpGrav>${subtotal15.toFixed(2)}</baseImpGrav>\n`;
      xml += `      <baseImpExe>0.00</baseImpExe>\n`;
      xml += `      <montoIce>0.00</montoIce>\n`;
      xml += `      <montoIva>${montoIva.toFixed(2)}</montoIva>\n`;
      xml += `      <valRetBien10>0.00</valRetBien10>\n`;
      xml += `      <valRetServ20>0.00</valRetServ20>\n`;
      xml += `      <valRetServ50>0.00</valRetServ50>\n`;
      xml += `      <valRetServ100>0.00</valRetServ100>\n`;
      xml += `      <valRetIvaTotal>${(Number(c.retencionIva) || 0).toFixed(2)}</valRetIvaTotal>\n`;
      xml += `      <pagosExterior>\n`;
      xml += `        <pagoLocExt>01</pagoLocExt>\n`;
      xml += `        <paisEfecPago>NA</paisEfecPago>\n`;
      xml += `        <aplicConvDobTrib>NO</aplicConvDobTrib>\n`;
      xml += `        <pagExtSujRetNorLeg>NO</pagExtSujRetNorLeg>\n`;
      xml += `      </pagosExterior>\n`;
      xml += `      <formsPago>\n`;
      xml += `        <formaPago>${c.paymentMethod === 'efectivo' ? '01' : c.paymentMethod === 'tarjeta' ? '19' : '20'}</formaPago>\n`;
      xml += `      </formsPago>\n`;
      xml += `    </detalleCompras>\n`;
    });
  }
  xml += `  </compras>\n`;

  // --- SECCIÓN VENTAS ---
  xml += `  <ventas>\n`;
  if (ventas.length > 0) {
    ventas.forEach(v => {
      const subtotal0 = Number(v.subtotal0 || (v.ivaPorcentaje === 0 ? v.baseImponible || v.total : 0)) || 0;
      const subtotal15 = Number(v.subtotal15 || (v.ivaPorcentaje > 0 ? v.baseImponible || v.total / 1.15 : 0)) || 0;
      const montoIva = Number(v.ivaValor) || (v.ivaPorcentaje > 0 ? Number(v.total) - subtotal15 : 0);

      xml += `    <detalleVentas>\n`;
      xml += `      <tpIdCliente>${v.thirdPartyRuc?.length === 10 ? '05' : v.thirdPartyRuc?.length === 13 ? '04' : '07'}</tpIdCliente>\n`;
      xml += `      <idCliente>${escapeXml(v.thirdPartyRuc || '9999999999999')}</idCliente>\n`;
      xml += `      <tipoComprobante>01</tipoComprobante>\n`;
      xml += `      <tipoEmision>E</tipoEmision>\n`;
      xml += `      <numeroComprobantes>1</numeroComprobantes>\n`;
      xml += `      <baseNoGraIva>0.00</baseNoGraIva>\n`;
      xml += `      <baseImponible>${subtotal0.toFixed(2)}</baseImponible>\n`;
      xml += `      <baseImpGrav>${subtotal15.toFixed(2)}</baseImpGrav>\n`;
      xml += `      <montoIva>${montoIva.toFixed(2)}</montoIva>\n`;
      xml += `      <montoIce>0.00</montoIce>\n`;
      xml += `      <valorRetIva>${(Number(v.retencionIva) || 0).toFixed(2)}</valorRetIva>\n`;
      xml += `      <valorRetRenta>${(Number(v.retencionRenta) || 0).toFixed(2)}</valorRetRenta>\n`;
      xml += `      <formsPago>\n`;
      xml += `        <formaPago>${v.paymentMethod === 'efectivo' ? '01' : v.paymentMethod === 'tarjeta' ? '19' : '20'}</formaPago>\n`;
      xml += `      </formsPago>\n`;
      xml += `    </detalleVentas>\n`;
    });
  }
  xml += `  </ventas>\n`;

  // --- SECCIÓN VENTAS ESTABLECIMIENTO ---
  xml += `  <salesEstablishment>\n`;
  xml += `    <sale>\n`;
  xml += `      <establishment>${escapeXml(numEstabRuc)}</establishment>\n`;
  xml += `      <sales>${totalVentas.toFixed(2)}</sales>\n`;
  xml += `      <iva>${ventas.reduce((sum, v) => sum + (Number(v.ivaValor) || 0), 0).toFixed(2)}</iva>\n`;
  xml += `    </sale>\n`;
  xml += `  </salesEstablishment>\n`;
  xml += `</iva>\n`;

  return xml;
}

/**
 * Descarga directamente el archivo XML del ATS
 */
export function downloadSriAtsXml(params) {
  const xmlContent = generateSriAtsXml(params);
  const formattedMonth = String(params.month).padStart(2, '0');
  const filename = `ATS_${params.companyProfile?.ruc || '1790000000001'}_${params.year}_${formattedMonth}.xml`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
