import { parseSriAuthorization } from './sriAuthorization.js';
import { invoiceDescription } from './invoiceLine.js';
import { calculateTransactionTotals } from './discountCalcService.js';
/**
 * Servicio del Core SRI (Ecuador)
 * Maneja validaciones tributarias, generación de clave de acceso, estructura XML y estados del SRI.
 */

// Helpers para obtener la fecha y hora oficial de Ecuador (GMT-5, America/Guayaquil)
// Ecuador NO tiene horario de verano (DST), siempre UTC-5.
// Se usa desplazamiento manual en lugar de Intl.DateTimeFormat para garantizar
// el resultado correcto incluso cuando el servidor/navegador corre en UTC u otro huso.

export function getEcuadorDateString(d = new Date()) {
  const dateObj = d instanceof Date ? d : new Date(d);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj);
}

export function getEcuadorTimeString(d = new Date()) {
  const dateObj = d instanceof Date ? d : new Date(d);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(dateObj);
}

export function getEcuadorDateTimeString(d = new Date()) {
  const dateStr = getEcuadorDateString(d).split('-').reverse().join('/');
  const timeStr = getEcuadorTimeString(d);
  return `${dateStr} ${timeStr}`;
}

// Validador de RUC / CI Ecuatoriano
export function validarIdentificacion(identificacion, tipoIdentificacion = '', isValidated = false) {
  if (!identificacion) return false;
  const clean = String(identificacion).trim();
  if (clean === '9999999999999') return true; // Consumidor Final es válido de inmediato

  // Omitir validación local si es pasaporte, extranjero o ya fue validado
  const cleanTipo = String(tipoIdentificacion || '').toLowerCase();
  if (
    cleanTipo === 'pasaporte' || 
    cleanTipo === '06' || 
    cleanTipo === 'exterior' || 
    cleanTipo === '08' || 
    isValidated === true || 
    isValidated === 'true'
  ) {
    return true;
  }

  const len = clean.length;
  if (len !== 10 && len !== 13) return false;

  // Si es RUC de 13 dígitos, los 3 últimos deben ser 001
  if (len === 13 && !clean.endsWith('001')) {
    return false;
  }

  // Tomar los primeros 10 dígitos (que corresponden a la cédula o base del RUC)
  const cedula = clean.substring(0, 10);
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = parseInt(cedula.substring(2, 3), 10);
  
  // RUC para sociedades privadas y extranjeros sin cédula (tercer dígito = 9)
  if (tercerDigito === 9) {
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    const verificador = parseInt(cedula.substring(9, 10), 10);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += parseInt(cedula[i], 10) * coeficientes[i];
    }
    const residuo = suma % 11;
    const digitoCalculado = residuo === 0 ? 0 : 11 - residuo;
    return digitoCalculado === verificador;
  }
  
  // RUC para sociedades públicas (tercer dígito = 6)
  if (tercerDigito === 6) {
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    const verificador = parseInt(cedula.substring(8, 9), 10);
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += parseInt(cedula[i], 10) * coeficientes[i];
    }
    const residuo = suma % 11;
    const digitoCalculado = residuo === 0 ? 0 : 11 - residuo;
    return digitoCalculado === verificador;
  }

  // Cédula de persona natural (tercer dígito < 6)
  if (tercerDigito < 6) {
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const verificador = parseInt(cedula.substring(9, 10), 10);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula[i], 10) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }
    const residuo = suma % 10;
    const digitoCalculado = residuo === 0 ? 0 : 10 - residuo;
    return digitoCalculado === verificador;
  }

  return false;
}

// Calcular dígito verificador módulo 11
export function calcularModulo11(clave) {
  let factor = 2;
  let suma = 0;
  for (let i = clave.length - 1; i >= 0; i--) {
    suma += parseInt(clave[i], 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const residuo = suma % 11;
  let verificador = 11 - residuo;
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 1;
  return verificador;
}

// Mapeador de tipo de identificación tributaria para el SRI
export function obtenerTipoIdentificacionSRI(terceroData) {
  if (!terceroData) return '07'; // Por defecto Consumidor Final si no hay datos
  const ruc = String(terceroData.ruc || '').trim();
  if (ruc === '9999999999999') {
    return '07'; // Consumidor Final
  }

  const tipo = String(terceroData.tipoIdentificacion || '').toLowerCase();
  if (tipo === 'consumidor_final' || tipo === '07') {
    return '07';
  }
  if (tipo === 'pasaporte' || tipo === '06') {
    return '06';
  }
  if (tipo === 'exterior' || tipo === '08') {
    return '08';
  }
  if (tipo === 'cedula' || tipo === '05' || ruc.length === 10) {
    return '05';
  }
  return '04'; // RUC
}

// Generar clave de acceso de 49 dígitos
export function generarClaveAcceso({
  fechaEmision, // Formato YYYY-MM-DD
  tipoComprobante, // '01' factura, '03' liquidacion, '07' retencion, etc.
  ruc,
  ambiente, // '1' Pruebas, '2' Producción
  establecimiento, // '001'
  puntoEmision, // '001'
  secuencial, // '000000001'
  codigoNumerico = '12345678',
  tipoEmision = '1' // 1 = Normal
}) {
  // Convertir fecha YYYY-MM-DD a DDMMYYYY
  const partes = fechaEmision.split('-');
  const fechaFormateada = `${partes[2]}${partes[1]}${partes[0]}`;

  // Rellenar secuencial con 9 ceros si es necesario
  const secFormateado = String(secuencial).padStart(9, '0');
  
  // Limpiar RUC
  const rucLimpio = String(ruc).trim();

  // Armar clave de 48 dígitos (sin verificador)
  // DDMMYYYY + TipoComprobante(2) + RucEmisor(13) + Ambiente(1) + Serie(6) + Secuencial(9) + CodigoNumerico(8) + TipoEmision(1)
  const clave48 = `${fechaFormateada}${tipoComprobante}${rucLimpio}${ambiente}${establecimiento}${puntoEmision}${secFormateado}${codigoNumerico}${tipoEmision}`;
  
  const verificador = calcularModulo11(clave48);
  
  return `${clave48}${verificador}`;
}

// Escapa caracteres reservados de XML en valores de texto (evita XML mal formado
// cuando nombres/direcciones contienen &, <, >, comillas, etc.)
export function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Mapea la tarifa de IVA (%) al codigoPorcentaje oficial del SRI
export function codigoPorcentajeIva(tarifa) {
  switch (Number(tarifa)) {
    case 0: return '0';   // 0%
    case 5: return '5';   // 5%
    case 12: return '2';  // 12%
    case 13: return '10'; // 13%
    case 14: return '3';  // 14%
    case 15: return '4';  // 15%
    default: return '4';
  }
}

// Redondeo bancario a 2 decimales para mantener consistencia aritmética con el SRI
function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

// Normaliza una fecha a DD/MM/YYYY (formato exigido por el SRI). Acepta
// YYYY-MM-DD (la convierte) o una fecha ya en DD/MM/YYYY (la deja igual).
export function fechaSRI(f) {
  if (!f) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f.split('-').reverse().join('/');
  return f;
}

// Mapea la forma de pago interna al código oficial del SRI (Tabla 24: Formas de Pago SRI)
export function mapearFormaPagoSRI(method) {
  const m = String(method || '').toLowerCase().trim();
  if (m === 'tarjeta_credito' || m === 'tarjeta') return '19'; // Tarjeta de crédito
  if (m === 'tarjeta_debito' || m === 'debito') return '16';   // Tarjeta de débito
  if (m === 'transferencia' || m === 'banco' || m === 'deposito' || m === 'cheque') return '20'; // Otros con utilización del sistema financiero
  if (m === 'cruce_cuentas' || m === 'compensacion') return '15'; // Compensación de deudas
  if (m === 'endoso') return '21'; // Endoso de títulos
  if (m === 'dinero_electronico') return '17'; // Dinero electrónico
  if (m === 'tarjeta_prepago') return '18'; // Tarjeta prepago
  if (m === 'credito' || m === 'credito_directo') return '20'; // Otros con utilización del sistema financiero (crédito comercial)
  return '01'; // Sin utilización del sistema financiero (Efectivo)
}

// Generar estructura XML para Factura
export function generarFacturaXML(emisorConfig, facturaData, terceroData, items = []) {
  const codigoNumerico = facturaData.codigoNumerico ||
    (facturaData.claveAcceso && facturaData.claveAcceso.length === 49 ? facturaData.claveAcceso.substring(39, 47) : null) ||
    '12345678';

  const claveAcceso = generarClaveAcceso({
    fechaEmision: facturaData.date,
    tipoComprobante: '01',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: facturaData.secuencial || '000000001',
    codigoNumerico
  });

  // El generador es la ÚNICA fuente de verdad de los totales: todo se calcula
  // desde los ítems y se agrupa el IVA por tarifa, garantizando que la suma de
  // los detalles cuadre exactamente con los totales (el SRI rechaza descuadres).
  const activeItems = items.length > 0 ? items : (facturaData.items || []);
  const gruposIva = {}; // codigoPorcentaje -> { base, valor }
  let totalSinImpuestos = 0;
  let totalDescuento = 0;
  let detallesXml = '';

  const calculatedItems = calculateTransactionTotals(activeItems, facturaData.generalDiscount).items;
  calculatedItems.forEach((item, idx) => {
    const cantidad = Number(item.quantity);
    const precio = item.precio_base_unitario;
    const tarifa = item.tarifa_iva * 100;
    const codPorc = codigoPorcentajeIva(tarifa);
    const lineGross = round2(precio * cantidad);
    const lineDiscount = round2(
      item.monto_descuento_linea + item.descuento_prorrateado
    );
    const lineSub = round2(Math.max(0, lineGross - lineDiscount));
    const lineIva = round2(lineSub * (tarifa / 100));

    totalSinImpuestos = round2(totalSinImpuestos + lineSub);
    totalDescuento = round2(totalDescuento + lineDiscount);

    if (!gruposIva[codPorc]) gruposIva[codPorc] = { base: 0, valor: 0 };
    gruposIva[codPorc].base = round2(gruposIva[codPorc].base + lineSub);
    gruposIva[codPorc].valor = round2(gruposIva[codPorc].valor + lineIva);

    detallesXml += `
    <detalle>
      <codigoPrincipal>${escaparXml(item.code || `P${idx + 1}`)}</codigoPrincipal>
      <descripcion>${escaparXml(invoiceDescription(item))}</descripcion>
      <cantidad>${cantidad.toFixed(2)}</cantidad>
      <precioUnitario>${precio.toFixed(6)}</precioUnitario>
      <descuento>${lineDiscount.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${lineSub.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codPorc}</codigoPorcentaje>
          <tarifa>${tarifa}</tarifa>
          <baseImponible>${lineSub.toFixed(2)}</baseImponible>
          <valor>${lineIva.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  });

  const totalIva = round2(Object.values(gruposIva).reduce((s, g) => s + g.valor, 0));
  const importeTotal = round2(totalSinImpuestos + totalIva);

  let totalImpuestosXml = '';
  Object.entries(gruposIva).forEach(([codPorc, g]) => {
    totalImpuestosXml += `
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codPorc}</codigoPorcentaje>
        <baseImponible>${g.base.toFixed(2)}</baseImponible>
        <valor>${g.valor.toFixed(2)}</valor>
      </totalImpuesto>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escaparXml(emisorConfig.razonSocial)}</razonSocial>
    <nombreComercial>${escaparXml(emisorConfig.nombreComercial || emisorConfig.razonSocial)}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(facturaData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${facturaData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionComprador>
    <razonSocialComprador>${escaparXml(terceroData.name)}</razonSocialComprador>
    <identificacionComprador>${terceroData.ruc}</identificacionComprador>
    <totalSinImpuestos>${totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${totalDescuento.toFixed(2)}</totalDescuento>
    <totalConImpuestos>${totalImpuestosXml}
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>${(() => {
      if (facturaData.paymentsBreakdown) {
        const valid = Object.entries(facturaData.paymentsBreakdown).filter(([_, m]) => Number(m) > 0);
        if (valid.length > 0) {
          return valid.map(([metodo, monto]) => `
      <pago>
        <formaPago>${mapearFormaPagoSRI(metodo)}</formaPago>
        <total>${round2(monto).toFixed(2)}</total>
      </pago>`).join('');
        }
      }
      return `
      <pago>
        <formaPago>${mapearFormaPagoSRI(facturaData.paymentMethod)}</formaPago>
        <total>${importeTotal.toFixed(2)}</total>
      </pago>`;
    })()}
    </pagos>
  </infoFactura>
  <detalles>${detallesXml}
  </detalles>
</factura>`;

  return { xml, claveAcceso };
}

// Generar estructura XML para Retención (07)
export function generarRetencionXML(emisorConfig, retencionData, terceroData) {
  const codigoNumerico = retencionData.codigoNumerico || 
    (retencionData.claveAcceso && retencionData.claveAcceso.length === 49 ? retencionData.claveAcceso.substring(39, 47) : null) || 
    '12345678';

  const claveAcceso = generarClaveAcceso({
    fechaEmision: retencionData.date,
    tipoComprobante: '07',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: retencionData.secuencial || '000000001',
    codigoNumerico
  });

  const period = retencionData.date.split('-');
  const periodoFiscal = `${period[1]}/${period[0]}`;

  const retenciones = retencionData.retenciones || [];
  let impuestosXml = '';
  retenciones.forEach(ret => {
    // numDocSustento debe ser 15 dígitos exactos (estab+ptoEmi+secuencial), sin guiones
    const numDoc = String(ret.numDocSustento || '').replace(/\D/g, '').padStart(15, '0').slice(-15);
    impuestosXml += `
    <impuesto>
      <codigo>${ret.codigo}</codigo>
      <codigoRetencion>${ret.codigoRetencion}</codigoRetencion>
      <baseImponible>${Number(ret.baseImponible).toFixed(2)}</baseImponible>
      <porcentajeRetener>${Number(ret.porcentajeRetener).toFixed(2)}</porcentajeRetener>
      <valorRetenido>${Number(ret.valorRetenido).toFixed(2)}</valorRetenido>
      <codDocSustento>${ret.codDocSustento || '01'}</codDocSustento>
      <numDocSustento>${numDoc}</numDocSustento>
      <fechaEmisionDocSustento>${fechaSRI(ret.fechaEmisionDocSustento || retencionData.date)}</fechaEmisionDocSustento>
    </impuesto>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<comprobanteRetencion id="comprobante" version="1.0.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escaparXml(emisorConfig.razonSocial)}</razonSocial>
    <nombreComercial>${escaparXml(emisorConfig.nombreComercial || emisorConfig.razonSocial)}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>07</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(retencionData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirMatriz>
  </infoTributaria>
  <infoCompRetencion>
    <fechaEmision>${retencionData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>${escaparXml(terceroData.name)}</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>${escaparXml(terceroData.ruc)}</identificacionSujetoRetenido>
    <periodoFiscal>${periodoFiscal}</periodoFiscal>
  </infoCompRetencion>
  <impuestos>${impuestosXml}
  </impuestos>
</comprobanteRetencion>`;

  return { xml, claveAcceso };
}

// Generar estructura XML para Nota de Crédito (04)
export function generarNotaCreditoXML(emisorConfig, ncData, terceroData, items = []) {
  const codigoNumerico = ncData.codigoNumerico || 
    (ncData.claveAcceso && ncData.claveAcceso.length === 49 ? ncData.claveAcceso.substring(39, 47) : null) || 
    '12345678';

  const claveAcceso = generarClaveAcceso({
    fechaEmision: ncData.date,
    tipoComprobante: '04',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: ncData.secuencial || '000000001',
    codigoNumerico
  });

  const activeItems = items.length > 0 ? items : (ncData.items || []);
  let detallesXml = '';
  activeItems.forEach((item, idx) => {
    const cantidad = parseFloat(item.quantity) || 1;
    const precio = parseFloat(item.price) || 0;
    const tarifa = Number(item.ivaCategory ?? 15);
    const lineSub = round2(precio * cantidad);
    const lineIva = round2(lineSub * (tarifa / 100));
    detallesXml += `
    <detalle>
      <codigoInterno>${escaparXml(item.code || `P${idx + 1}`)}</codigoInterno>
      <descripcion>${escaparXml(invoiceDescription(item))}</descripcion>
      <cantidad>${cantidad.toFixed(2)}</cantidad>
      <precioUnitario>${precio.toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${lineSub.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codigoPorcentajeIva(tarifa)}</codigoPorcentaje>
          <tarifa>${tarifa}</tarifa>
          <baseImponible>${lineSub.toFixed(2)}</baseImponible>
          <valor>${lineIva.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escaparXml(emisorConfig.razonSocial)}</razonSocial>
    <nombreComercial>${escaparXml(emisorConfig.nombreComercial || emisorConfig.razonSocial)}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>04</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(ncData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirMatriz>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>${ncData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirEstablecimiento>
    <tipoIdentificacionComprador>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionComprador>
    <razonSocialComprador>${escaparXml(terceroData.name)}</razonSocialComprador>
    <identificacionComprador>${escaparXml(terceroData.ruc)}</identificacionComprador>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <codDocModificado>${ncData.codDocModificado || '01'}</codDocModificado>
    <numDocModificado>${ncData.numDocModificado || '001-001-000000000'}</numDocModificado>
    <fechaEmisionDocSustento>${fechaSRI(ncData.fechaEmisionDocSustento || ncData.date)}</fechaEmisionDocSustento>
    <totalSinImpuestos>${Number(ncData.baseImponible).toFixed(2)}</totalSinImpuestos>
    <valorModificacion>${Number(ncData.total).toFixed(2)}</valorModificacion>
    <moneda>DOLAR</moneda>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codigoPorcentajeIva(ncData.ivaPorcentaje ?? 15)}</codigoPorcentaje>
        <baseImponible>${Number(ncData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(ncData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <motivo>${escaparXml(ncData.motivo || 'Devolución de mercadería')}</motivo>
  </infoNotaCredito>
  <detalles>${detallesXml}
  </detalles>
</notaCredito>`;

  return { xml, claveAcceso };
}

// Generar estructura XML para Liquidación de Compra (03)
export function generarLiquidacionXML(emisorConfig, liqData, terceroData, items = []) {
  const codigoNumerico = liqData.codigoNumerico || 
    (liqData.claveAcceso && liqData.claveAcceso.length === 49 ? liqData.claveAcceso.substring(39, 47) : null) || 
    '12345678';

  const claveAcceso = generarClaveAcceso({
    fechaEmision: liqData.date,
    tipoComprobante: '03',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: liqData.secuencial || '000000001',
    codigoNumerico
  });

  const activeItems = items.length > 0 ? items : (liqData.items || []);
  let detallesXml = '';
  activeItems.forEach((item, idx) => {
    const cantidad = parseFloat(item.quantity) || 1;
    const precio = parseFloat(item.price) || 0;
    const tarifa = Number(item.ivaCategory ?? 15);
    const lineSub = round2(precio * cantidad);
    const lineIva = round2(lineSub * (tarifa / 100));
    detallesXml += `
    <detalle>
      <codigoPrincipal>${escaparXml(item.code || `P${idx + 1}`)}</codigoPrincipal>
      <descripcion>${escaparXml(invoiceDescription(item))}</descripcion>
      <cantidad>${cantidad.toFixed(2)}</cantidad>
      <precioUnitario>${precio.toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${lineSub.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codigoPorcentajeIva(tarifa)}</codigoPorcentaje>
          <tarifa>${tarifa}</tarifa>
          <baseImponible>${lineSub.toFixed(2)}</baseImponible>
          <valor>${lineIva.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<liquidacionCompra id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escaparXml(emisorConfig.razonSocial)}</razonSocial>
    <nombreComercial>${escaparXml(emisorConfig.nombreComercial || emisorConfig.razonSocial)}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>03</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(liqData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirMatriz>
  </infoTributaria>
  <infoLiquidacionCompra>
    <fechaEmision>${liqData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionProveedor>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionProveedor>
    <razonSocialProveedor>${escaparXml(terceroData.name)}</razonSocialProveedor>
    <identificacionProveedor>${escaparXml(terceroData.ruc)}</identificacionProveedor>
    <totalSinImpuestos>${Number(liqData.baseImponible).toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codigoPorcentajeIva(liqData.ivaPorcentaje ?? 15)}</codigoPorcentaje>
        <baseImponible>${Number(liqData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(liqData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <importeTotal>${Number(liqData.total).toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${mapearFormaPagoSRI(liqData.paymentMethod)}</formaPago>
        <total>${Number(liqData.total).toFixed(2)}</total>
      </pago>
    </pagos>
  </infoLiquidacionCompra>
  <detalles>${detallesXml}
  </detalles>
</liquidacionCompra>`;

  return { xml, claveAcceso };
}

// Generar estructura XML para Guía de Remisión (06)
export function generarGuiaRemisionXML(emisorConfig, guiaData, destinatarioData, items = []) {
  const codigoNumerico = guiaData.codigoNumerico ||
    (guiaData.claveAcceso && guiaData.claveAcceso.length === 49 ? guiaData.claveAcceso.substring(39, 47) : null) ||
    '12345678';

  const claveAcceso = generarClaveAcceso({
    fechaEmision: guiaData.date,
    tipoComprobante: '06',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: guiaData.secuencial || '000000001',
    codigoNumerico
  });

  const fechaDDMMYYYY = (f) => f.split('-').reverse().join('/');
  const fechaIni = guiaData.fechaIniTransporte || guiaData.date;
  const fechaFin = guiaData.fechaFinTransporte || guiaData.date;

  const activeItems = items.length > 0 ? items : (guiaData.items || []);
  let detallesXml = '';
  activeItems.forEach((item, idx) => {
    const cantidad = parseFloat(item.quantity) || 1;
    detallesXml += `
      <detalle>
        <codigoInterno>${escaparXml(item.code || `P${idx + 1}`)}</codigoInterno>
        <descripcion>${escaparXml(invoiceDescription(item))}</descripcion>
        <cantidad>${cantidad.toFixed(2)}</cantidad>
      </detalle>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<guiaRemision id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escaparXml(emisorConfig.razonSocial)}</razonSocial>
    <nombreComercial>${escaparXml(emisorConfig.nombreComercial || emisorConfig.razonSocial)}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>06</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(guiaData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirMatriz>
  </infoTributaria>
  <infoGuiaRemision>
    <dirEstablecimiento>${escaparXml(emisorConfig.direccionMatriz || 'Ecuador')}</dirEstablecimiento>
    <dirPartida>${escaparXml(guiaData.dirPartida || emisorConfig.direccionMatriz || 'Ecuador')}</dirPartida>
    <razonSocialTransportista>${escaparXml(guiaData.razonSocialTransportista || emisorConfig.razonSocial)}</razonSocialTransportista>
    <tipoIdentificacionTransportista>${guiaData.tipoIdentificacionTransportista || '04'}</tipoIdentificacionTransportista>
    <rucTransportista>${guiaData.rucTransportista || emisorConfig.ruc}</rucTransportista>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <fechaIniTransporte>${fechaDDMMYYYY(fechaIni)}</fechaIniTransporte>
    <fechaFinTransporte>${fechaDDMMYYYY(fechaFin)}</fechaFinTransporte>
    <placa>${escaparXml(guiaData.placa || 'AAA0001')}</placa>
  </infoGuiaRemision>
  <destinatarios>
    <destinatario>
      <identificacionDestinatario>${destinatarioData.ruc}</identificacionDestinatario>
      <razonSocialDestinatario>${escaparXml(destinatarioData.name)}</razonSocialDestinatario>
      <dirDestinatario>${escaparXml(destinatarioData.address || guiaData.dirDestino || 'Ecuador')}</dirDestinatario>
      <motivoTraslado>${escaparXml(guiaData.motivoTraslado || 'Venta')}</motivoTraslado>
      <ruta>${escaparXml(guiaData.ruta || 'Ruta de entrega')}</ruta>
      <codDocSustento>${guiaData.codDocSustento || '01'}</codDocSustento>
      <numDocSustento>${guiaData.numDocSustento || `${emisorConfig.establecimiento}-${emisorConfig.puntoEmision}-${String(guiaData.secuencialSustento || guiaData.secuencial || '1').padStart(9, '0')}`}</numDocSustento>
      <fechaEmisionDocSustento>${fechaDDMMYYYY(guiaData.fechaEmisionDocSustento || guiaData.date)}</fechaEmisionDocSustento>
      <detalles>${detallesXml}
      </detalles>
    </destinatario>
  </destinatarios>
</guiaRemision>`;

  return { xml, claveAcceso };
}


/**
 * Realiza una petición SOAP HTTP POST al SRI a través del proxy server-side
 * (función serverless en Vercel / proxy de Vite en desarrollo).
 */
async function enviarPeticionSoap(wsPath, soapBody, ambiente) {
  const isProd = ambiente === '2';
  // Proxy server-side mismo origen: en producción lo resuelve la función serverless
  // de Vercel (api/sri-ws-*/[...path].js); en desarrollo lo resuelve el proxy de Vite
  // (vite.config.js). Ambos reenvían el SOAP al SRI sin problemas de CORS.
  const proxyUrl = isProd
    ? `/api/sri-ws-prod/comprobantes-electronicos-ws/${wsPath}`
    : `/api/sri-ws-pruebas/comprobantes-electronicos-ws/${wsPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // el SRI puede tardar

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'SOAPAction': ''
      },
      body: soapBody,
      signal: controller.signal
    });
    const text = await response.text();
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`El servidor del SRI respondió HTTP ${response.status}. Detalle: ${text.slice(0, 200)}`);
    }
    return { text, via: 'Proxy Servidor' };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado (25s) conectando con el SRI. Verifique su conexión e intente de nuevo.', { cause: err });
    }
    throw err;
  }
}

export async function consultarAutorizacionSRI(claveAcceso, ambiente = claveAcceso?.[23]) {
  if (!/^\d{49}$/.test(claveAcceso) || !['1', '2'].includes(String(ambiente)) || claveAcceso[23] !== String(ambiente)) throw new Error('Clave o ambiente de consulta inválidos.');
  const soap = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion"><soapenv:Body><ec:autorizacionComprobante><claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante></ec:autorizacionComprobante></soapenv:Body></soapenv:Envelope>`;
  const response = await enviarPeticionSoap('AutorizacionComprobantesOffline', soap, String(ambiente));
  return parseSriAuthorization(response.text, claveAcceso);
}

// Historical export name retained for callers; fiscal emission never simulates authorization.
export async function simularTransmisionSRI(documentoData, configSRI, onLogUpdate) {
  const logs = [];
  const log = (message, status = 'info') => { logs.push({ time: new Date().toLocaleTimeString(), message, status }); onLogUpdate?.([...logs]); };
  if (!documentoData.xml?.includes('Signature') || !/^\d{49}$/.test(documentoData.claveAcceso) || documentoData.claveAcceso[23] !== String(configSRI.ambiente)) throw new Error('Se requiere XML firmado con clave y ambiente válidos para emitir en pruebas o producción.');
  const xmlBase64 = btoa(unescape(encodeURIComponent(documentoData.xml)));
  const soap = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion"><soapenv:Body><ec:validarComprobante><xml>${xmlBase64}</xml></ec:validarComprobante></soapenv:Body></soapenv:Envelope>`;
  let receptionError;
  try {
    log('Enviando el XML firmado previamente guardado.');
    const response = await enviarPeticionSoap('RecepcionComprobantesOffline', soap, String(configSRI.ambiente));
    const xml = new DOMParser().parseFromString(response.text, 'text/xml');
    const elements = name => [...xml.getElementsByTagName('*')].filter(n => n.localName === name);
    const state = elements('estado')[0]?.textContent?.trim();
    const codes = elements('identificador').map(n => n.textContent.trim());
    if (['DEVUELTA', 'DEVUELTO'].includes(state) && !codes.some(c => ['43', '70'].includes(c))) {
      return { status: 'devuelto', claveAcceso: documentoData.claveAcceso, message: elements('mensaje').filter(n => !Array.from(n.childNodes).some(child => child.nodeType === 1)).map(n => n.textContent).join(' | ') || 'Comprobante devuelto por el SRI.' };
    }
    if (!['RECIBIDA', 'RECIBIDO', 'DEVUELTA', 'DEVUELTO'].includes(state)) throw new Error('Respuesta de recepción incompleta.');
    log(codes.includes('70') ? 'Clave en procesamiento: se consultará la misma clave.' : 'Consultando la autorización del comprobante.');
  } catch (error) {
    receptionError = error;
    log('No se confirmó la recepción; consultando autorización antes de decidir cualquier reenvío.', 'warning');
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await consultarAutorizacionSRI(documentoData.claveAcceso, String(configSRI.ambiente));
      if (result.status !== 'pendiente_sri') {
        log(result.status === 'autorizado' ? 'Autorización del SRI confirmada.' : result.message, result.status === 'autorizado' ? 'success' : 'warning');
        return result;
      }
    } catch (queryErr) {
      log(`Consulta de autorización (${attempt + 1}/3): ${queryErr.message || 'consultando al SRI...'}`, 'info');
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return { status: 'pendiente_sri', claveAcceso: documentoData.claveAcceso, message: receptionError?.message || 'Enviado; autorización pendiente. No se reutilizará el secuencial.' };
}

// Explicit retry always consults first and sends exactly the persisted signature.
export async function reintentarDocumentoSRI(document, onLogUpdate) {
  const ambiente = document.claveAcceso?.[23];
  const result = await consultarAutorizacionSRI(document.claveAcceso, ambiente);
  if (result.status !== 'pendiente_sri') return result;
  return simularTransmisionSRI(document, { ambiente }, onLogUpdate);
}

// ═══════════════════════════════════════════════════════════
// UTILIDADES PARA FETCH ROBUSTO CON BYPASS DE CORS
// ═══════════════════════════════════════════════════════════

// URLs base que se adaptan según el entorno
function getCipherByteUrl(ruc, useRelative = false) {
  if (useRelative) {
    return `/api/cipherbyte/company/${ruc}`;
  }
  return `https://aggregator.cipherbyte.ec/company/${ruc}`;
}

function getSriUrl(ruc, useRelative = false) {
  if (useRelative) {
    return `/api/sri/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/existePorNumeroRuc?numeroRuc=${ruc}`;
  }
  return `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/existePorNumeroRuc?numeroRuc=${ruc}`;
}

// Lista de proxies CORS públicos (solo se usan en producción como fallback)
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

/**
 * Realiza un fetch con reintentos automáticos a través de proxies CORS.
 * @param {string} url - URL objetivo absoluta
 * @param {number} timeoutMs - Timeout en milisegundos
 * @returns {Promise<{response: Response, via: string}>} - Response exitosa
 * @throws {Error} - Si todos los intentos fallan
 */
async function fetchConProxy(url, timeoutMs = 12000) {
  // En producción: intentar directo + múltiples proxies CORS
  const intentos = [
    { label: 'Directo', url: url },
    ...CORS_PROXIES.map((proxyFn, i) => ({
      label: `Proxy ${i === 0 ? 'AllOrigins' : i === 1 ? 'CodeTabs' : 'CorsProxy'}`,
      url: proxyFn(url)
    }))
  ];

  let ultimoError = null;

  for (const intento of intentos) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Eliminamos custom headers como Accept para maximizar compatibilidad con proxies
      const res = await fetch(intento.url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { response: res, via: intento.label };
      }

      // Si es 404, la API respondió pero no encontró el RUC — no seguir con proxies
      if (res.status === 404) {
        throw new Error(`RUC no encontrado (HTTP 404 via ${intento.label})`);
      }

      ultimoError = new Error(`HTTP ${res.status} via ${intento.label}`);
    } catch (err) {
      if (err.message?.includes('RUC no encontrado')) {
        throw err; // Propagar 404 directamente
      }
      if (err.name === 'AbortError') {
        ultimoError = new Error(`Timeout via ${intento.label}`);
      } else {
        ultimoError = err;
      }
      // Continuar con el siguiente proxy
      continue;
    }
  }

  throw ultimoError || new Error('Todos los intentos de conexión fallaron');
}

// ═══════════════════════════════════════════════════════════
// CONSULTA REAL DE RUC — Función principal
// ═══════════════════════════════════════════════════════════

// Consulta REAL de RUC / CI desde APIs del SRI de Ecuador
// Usa la API de CipherByte como fuente principal con proxy CORS automático.
// NUNCA genera datos falsos — si la consulta falla, lanza un error transparente.
export async function consultarRucSri(rucOrCi) {
  const clean = String(rucOrCi).trim();
  if (clean.length !== 10 && clean.length !== 13) {
    throw new Error("La identificación debe tener 10 (Cédula) o 13 (RUC) dígitos.");
  }

  // Si es cédula de 10 dígitos, convertir a RUC de 13 para la consulta
  const rucParaConsulta = clean.length === 10 ? clean + '001' : clean;

  // Validación estructural básica antes de consultar al SRI.
  // NO se aplica el check-digit local aquí porque el SRI es la fuente autoritativa.
  // Algunos RUCs emitidos directamente por el SRI tienen un dígito verificador
  // que no coincide con el algoritmo estándar (ej: entidades anteriores a 2000).
  const soloDigitos = /^\d+$/.test(clean);
  if (!soloDigitos) {
    throw new Error(`La identificación ${clean} solo puede contener dígitos numéricos.`);
  }
  const provincia = parseInt(clean.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    throw new Error(`La identificación ${clean} tiene un código de provincia inválido (${clean.substring(0, 2)}). Debe estar entre 01 y 24.`);
  }
  if (clean.length === 13 && !clean.endsWith('001')) {
    throw new Error(`El RUC de 13 dígitos ${clean} debe terminar en 001.`);
  }

  const errores = [];

  // ═══════════════════════════════════════════════════════════
  // INTENTO 1: Usar proxy local o del servidor (Vite proxy / Vercel rewrites)
  // Nativamente libre de CORS y ad-blockers, excelente rendimiento
  // ═══════════════════════════════════════════════════════════
  try {
    const relativeUrl = getCipherByteUrl(rucParaConsulta, true);
    console.info(`Intentando consulta de RUC vía proxy de servidor/Vite: ${relativeUrl}`);
    const res = await fetch(relativeUrl);
    if (res.ok) {
      const text = await res.text();
      let apiData = JSON.parse(text);
      if (apiData && (apiData.razonSocial || apiData.numeroRuc)) {
        console.info(`✅ RUC ${rucParaConsulta} consultado con éxito vía Proxy Servidor`);
        return mapearRespuestaCipherByte(apiData, clean, rucParaConsulta);
      }
    } else if (res.status === 404) {
      throw new Error(`RUC no encontrado (HTTP 404)`);
    } else {
      console.warn(`Proxy de servidor respondió con estado no exitoso: ${res.status}`);
      errores.push(`Proxy Servidor: Estado ${res.status}`);
    }
  } catch (err) {
    if (err.message?.includes('RUC no encontrado')) {
      throw err; // Propagar 404 directamente
    }
    console.warn("Proxy de servidor no disponible o falló, recurriendo a proxies CORS externos...", err.message);
    errores.push(`Proxy Servidor: ${err.message}`);
  }

  // Si el proxy de servidor falló, recurrimos a los proxies CORS externos con la URL absoluta de CipherByte.
  try {
    const targetUrl = getCipherByteUrl(rucParaConsulta, false);
    console.info(`Intentando consulta de RUC vía proxies CORS externos: ${targetUrl}`);
    const { response, via } = await fetchConProxy(targetUrl, 15000);
    
    const text = await response.text();
    let apiData;
    try {
      apiData = JSON.parse(text);
    } catch {
      errores.push(`CipherByte (${via}): Respuesta no es JSON válido.`);
      apiData = null;
    }

    if (apiData && (apiData.razonSocial || apiData.numeroRuc)) {
      console.info(`✅ RUC ${rucParaConsulta} consultado exitosamente via ${via}`);
      return mapearRespuestaCipherByte(apiData, clean, rucParaConsulta);
    } else {
      errores.push(`CipherByte (${via}): Sin datos válidos en la respuesta.`);
    }
  } catch (err) {
    if (err.message?.includes('RUC no encontrado')) {
      throw err;
    }
    errores.push(`CipherByte CORS: ${err.message || 'Error'}`);
  }

  // ═══════════════════════════════════════════════════════════
  // FUENTE 2: SRI directo (Bajo demanda si falla CipherByte)
  // Primero intentamos vía Proxy Servidor
  // ═══════════════════════════════════════════════════════════
  try {
    const relativeSriUrl = getSriUrl(rucParaConsulta, true);
    const resSri = await fetch(relativeSriUrl);
    if (resSri.ok) {
      const text = await resSri.text();
      let sriData = JSON.parse(text);
      if (sriData && (sriData.razonSocial || sriData.nombreComercial)) {
        console.info(`✅ RUC ${rucParaConsulta} consultado con éxito en SRI vía Proxy Servidor`);
        return mapearRespuestaSRI(sriData, clean, rucParaConsulta);
      }
    }
  } catch (sriErr) {
    console.warn("Consulta SRI vía Proxy Servidor falló, intentando vía CORS proxies...", sriErr.message);
  }

  // Si falla, intentamos SRI vía CORS proxies
  try {
    const sriUrl = getSriUrl(rucParaConsulta, false);
    const { response: sriRes, via: sriVia } = await fetchConProxy(sriUrl, 12000);

    const sriText = await sriRes.text();
    let sriData;
    try {
      sriData = JSON.parse(sriText);
    } catch {
      sriData = null;
    }

    if (sriData && (sriData.razonSocial || sriData.nombreComercial)) {
      console.info(`✅ RUC ${rucParaConsulta} consultado desde SRI via ${sriVia}`);
      return mapearRespuestaSRI(sriData, clean, rucParaConsulta);
    }
  } catch (err2) {
    errores.push(`SRI CORS: ${err2.message || 'Error'}`);
  }

  // ═══════════════════════════════════════════════════════════
  // TODAS LAS FUENTES FALLARON — Error transparente al usuario
  // ═══════════════════════════════════════════════════════════
  console.error("Todas las fuentes de consulta de RUC fallaron:", errores);
  throw new Error(
    `No se pudieron obtener los datos reales del SRI para el RUC/CI ${rucParaConsulta}. ` +
    `Verifique el número e intente de nuevo. (Detalles: ${errores.join(' | ')})`
  );
}

// ═══════════════════════════════════════════════════════════
// MAPEADORES de respuesta de APIs a formato interno
// ═══════════════════════════════════════════════════════════

function mapearRespuestaCipherByte(apiData, originalInput, rucConsultado) {
  const razonSocial = apiData.razonSocial || '';
  const mainEst = apiData.establecimientos?.find(e => e.matriz === 'SI') || 
                  apiData.establecimientos?.[0] || 
                  null;
  
  const nombreComercial = mainEst?.nombreFantasiaComercial || razonSocial;
  const direccionMatriz = mainEst?.direccionCompleta || 'Ecuador';
  
  // Determinar tipo de contribuyente desde el régimen
  let typeContribuyente = 'general';
  const reg = String(apiData.regimen || '').toUpperCase();
  if (reg.includes('POPULAR')) typeContribuyente = 'rimpe_popular';
  else if (reg.includes('EMPRENDEDOR')) typeContribuyente = 'rimpe_emprendedor';
  else if (reg.includes('MICROEMPRESA')) typeContribuyente = 'microempresas';

  // Mapear establecimientos/sucursales
  const sucursalesMapped = (apiData.establecimientos || []).map(est => ({
    codigo: est.numeroEstablecimiento || '001',
    nombre: est.nombreFantasiaComercial || nombreComercial,
    direccion: est.direccionCompleta || direccionMatriz,
    activa: est.estado === 'ABIERTO',
    bodegas: ['Bodega Central']
  }));

  // Determinar estado de obligaciones
  const obligadoRaw = String(apiData.obligadoLlevarContabilidad || '').toUpperCase();
  const agenteRaw = String(apiData.agenteRetencion || '').toUpperCase();
  const especialRaw = String(apiData.contribuyenteEspecial || '').toUpperCase();

  return {
    ruc: apiData.numeroRuc || rucConsultado,
    name: razonSocial,
    razonSocial: razonSocial,
    nombreComercial: nombreComercial,
    direccion: direccionMatriz,
    tipoIdentificacion: originalInput.length === 13 ? 'ruc' : 'cedula',
    telefono: '',
    email: '',
    tipoContribuyente: typeContribuyente,
    rucActivo: apiData.estadoContribuyenteRuc === 'ACTIVO',
    rucEstado: apiData.estadoContribuyenteRuc || 'DESCONOCIDO',
    obligadoContabilidad: obligadoRaw === 'SI' || obligadoRaw === 'SÍ',
    agenteRetencion: agenteRaw !== 'NO' && agenteRaw !== '' && agenteRaw !== 'undefined',
    agenteResolucion: (agenteRaw !== 'NO' && agenteRaw !== '' && agenteRaw !== 'undefined') ? apiData.agenteRetencion : '',
    contribuyenteEspecial: especialRaw !== 'NO' && especialRaw !== '' && especialRaw !== 'undefined',
    especialResolucion: (especialRaw !== 'NO' && especialRaw !== '' && especialRaw !== 'undefined') ? apiData.contribuyenteEspecial : '',
    actividadEconomica: apiData.actividadEconomicaPrincipal || '',
    establecimientos: sucursalesMapped.length > 0 ? sucursalesMapped : [
      {
        codigo: '001',
        nombre: nombreComercial,
        direccion: direccionMatriz,
        activa: true,
        bodegas: ['Bodega Central']
      }
    ]
  };
}

function mapearRespuestaSRI(sriData, originalInput, rucConsultado) {
  const razonSocial = sriData.razonSocial || sriData.nombreComercial || '';
  const nombreComercial = sriData.nombreComercial || razonSocial;
  const direccion = sriData.direccionMatriz || sriData.direccion || 'Ecuador';

  let typeContribuyente = 'general';
  const clase = String(sriData.clase || sriData.tipoContribuyente || '').toUpperCase();
  if (clase.includes('POPULAR')) typeContribuyente = 'rimpe_popular';
  else if (clase.includes('EMPRENDEDOR')) typeContribuyente = 'rimpe_emprendedor';
  else if (clase.includes('MICROEMPRESA')) typeContribuyente = 'microempresas';

  const obligadoRaw = String(sriData.obligadoLlevarContabilidad || '').toUpperCase();

  return {
    ruc: sriData.numeroRuc || rucConsultado,
    name: razonSocial,
    razonSocial: razonSocial,
    nombreComercial: nombreComercial,
    direccion: direccion,
    tipoIdentificacion: originalInput.length === 13 ? 'ruc' : 'cedula',
    telefono: '',
    email: '',
    tipoContribuyente: typeContribuyente,
    rucActivo: sriData.estadoContribuyenteRuc === 'ACTIVO' || sriData.estado === 'ACTIVO',
    rucEstado: sriData.estadoContribuyenteRuc || sriData.estado || 'DESCONOCIDO',
    obligadoContabilidad: obligadoRaw === 'SI' || obligadoRaw === 'SÍ',
    agenteRetencion: false,
    agenteResolucion: '',
    contribuyenteEspecial: false,
    especialResolucion: '',
    actividadEconomica: sriData.actividadEconomicaPrincipal || '',
    establecimientos: [
      {
        codigo: '001',
        nombre: nombreComercial,
        direccion: direccion,
        activa: true,
        bodegas: ['Bodega Central']
      }
    ]
  };
}
