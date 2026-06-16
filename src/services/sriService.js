/**
 * Servicio del Core SRI (Ecuador)
 * Maneja validaciones tributarias, generación de clave de acceso, estructura XML y estados del SRI.
 */

// Helpers para obtener la fecha y hora oficial de Ecuador (GMT-5, America/Guayaquil)
// Ecuador NO tiene horario de verano (DST), siempre UTC-5.
// Se usa desplazamiento manual en lugar de Intl.DateTimeFormat para garantizar
// el resultado correcto incluso cuando el servidor/navegador corre en UTC u otro huso.
const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000; // -5 horas en ms

function _toEcuadorUTCDate(d) {
  // Desplaza el instante al equivalente UTC que representa la hora local Ecuador
  return new Date(d.getTime() + ECUADOR_OFFSET_MS);
}

export function getEcuadorDateString(d = new Date()) {
  const ec = _toEcuadorUTCDate(d);
  const year  = ec.getUTCFullYear();
  const month = String(ec.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(ec.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEcuadorTimeString(d = new Date()) {
  const ec = _toEcuadorUTCDate(d);
  const h  = String(ec.getUTCHours()).padStart(2, '0');
  const m  = String(ec.getUTCMinutes()).padStart(2, '0');
  const s  = String(ec.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Validador de RUC / CI Ecuatoriano
export function validarIdentificacion(identificacion) {
  if (!identificacion) return false;
  const clean = String(identificacion).trim();
  if (clean === '9999999999999') return true; // Consumidor Final es válido de inmediato

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
  let detallesXml = '';

  activeItems.forEach((item, idx) => {
    const cantidad = parseFloat(item.quantity) || 1;
    const precio = parseFloat(item.price) || 0;
    const tarifa = Number(item.ivaCategory ?? 15);
    const codPorc = codigoPorcentajeIva(tarifa);
    const lineSub = round2(precio * cantidad);
    const lineIva = round2(lineSub * (tarifa / 100));

    totalSinImpuestos = round2(totalSinImpuestos + lineSub);
    if (!gruposIva[codPorc]) gruposIva[codPorc] = { base: 0, valor: 0 };
    gruposIva[codPorc].base = round2(gruposIva[codPorc].base + lineSub);
    gruposIva[codPorc].valor = round2(gruposIva[codPorc].valor + lineIva);

    detallesXml += `
    <detalle>
      <codigoPrincipal>${escaparXml(item.code || `P${idx + 1}`)}</codigoPrincipal>
      <descripcion>${escaparXml(item.name || 'Detalle')}</descripcion>
      <cantidad>${cantidad.toFixed(2)}</cantidad>
      <precioUnitario>${precio.toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
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
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>${totalImpuestosXml}
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${facturaData.paymentMethod === 'transferencia' ? '20' : '01'}</formaPago>
        <total>${importeTotal.toFixed(2)}</total>
      </pago>
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
    <razonSocial>${emisorConfig.razonSocial}</razonSocial>
    <nombreComercial>${emisorConfig.nombreComercial || emisorConfig.razonSocial}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>07</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(retencionData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${emisorConfig.direccionMatriz || 'Ecuador'}</dirMatriz>
  </infoTributaria>
  <infoCompRetencion>
    <fechaEmision>${retencionData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${emisorConfig.direccionMatriz || 'Ecuador'}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>${terceroData.name}</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>${terceroData.ruc}</identificacionSujetoRetenido>
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
    const lineSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    const lineIva = lineSub * ((parseInt(item.ivaCategory) || 15) / 100);
    detallesXml += `
    <detalle>
      <codigoInterno>P${idx + 1}</codigoInterno>
      <descripcion>${item.name || 'Detalle'}</descripcion>
      <cantidad>${Number(item.quantity).toFixed(2)}</cantidad>
      <precioUnitario>${Number(item.price).toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${lineSub.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${item.ivaCategory === 15 ? '4' : '2'}</codigoPorcentaje>
          <tarifa>${item.ivaCategory}</tarifa>
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
    <razonSocial>${emisorConfig.razonSocial}</razonSocial>
    <nombreComercial>${emisorConfig.nombreComercial || emisorConfig.razonSocial}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>04</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(ncData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${emisorConfig.direccionMatriz || 'Ecuador'}</dirMatriz>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>${ncData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${emisorConfig.direccionMatriz || 'Ecuador'}</dirEstablecimiento>
    <tipoIdentificacionComprador>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionComprador>
    <razonSocialComprador>${terceroData.name}</razonSocialComprador>
    <identificacionComprador>${terceroData.ruc}</identificacionComprador>
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
        <codigoPorcentaje>${ncData.ivaPorcentaje === 15 ? '4' : '2'}</codigoPorcentaje>
        <baseImponible>${Number(ncData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(ncData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <motivo>${ncData.motivo || 'Devolución de mercadería'}</motivo>
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
    const lineSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    const lineIva = lineSub * ((parseInt(item.ivaCategory) || 15) / 100);
    detallesXml += `
    <detalle>
      <codigoPrincipal>P${idx + 1}</codigoPrincipal>
      <descripcion>${item.name || 'Detalle'}</descripcion>
      <cantidad>${Number(item.quantity).toFixed(2)}</cantidad>
      <precioUnitario>${Number(item.price).toFixed(2)}</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>${lineSub.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${item.ivaCategory === 15 ? '4' : '2'}</codigoPorcentaje>
          <tarifa>${item.ivaCategory}</tarifa>
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
    <razonSocial>${emisorConfig.razonSocial}</razonSocial>
    <nombreComercial>${emisorConfig.nombreComercial || emisorConfig.razonSocial}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>03</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(liqData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${emisorConfig.direccionMatriz || 'Ecuador'}</dirMatriz>
  </infoTributaria>
  <infoLiquidacionCompra>
    <fechaEmision>${liqData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${emisorConfig.direccionMatriz || 'Ecuador'}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionProveedor>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionProveedor>
    <razonSocialProveedor>${terceroData.name}</razonSocialProveedor>
    <identificacionProveedor>${terceroData.ruc}</identificacionProveedor>
    <totalSinImpuestos>${Number(liqData.baseImponible).toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${liqData.ivaPorcentaje === 15 ? '4' : '2'}</codigoPorcentaje>
        <baseImponible>${Number(liqData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(liqData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <importeTotal>${Number(liqData.total).toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${liqData.paymentMethod === 'transferencia' ? '20' : '01'}</formaPago>
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
        <descripcion>${escaparXml(item.name || 'Detalle')}</descripcion>
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
    clearTimeout(timeoutId);

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`El servidor del SRI respondió HTTP ${response.status}. Detalle: ${text.slice(0, 200)}`);
    }
    return { text, via: 'Proxy Servidor' };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado (25s) conectando con el SRI. Verifique su conexión e intente de nuevo.');
    }
    throw err;
  }
}

// Emisión y Transmisión Real al SRI (con fallback a Simulación si no hay firma cargada)
export async function simularTransmisionSRI(documentoData, configSRI, onLogUpdate) {
  let logs = [];
  const addLog = (message, status = 'info') => {
    logs.push({ time: new Date().toLocaleTimeString(), message, status });
    onLogUpdate([...logs]);
  };

  const isProd = configSRI.ambiente === '2';

  // Si no hay firma cargada, verificar el ambiente
  if (!configSRI.certificadoCargado || !configSRI.certificadoBase64) {
    if (isProd) {
      throw new Error("No se puede transmitir al SRI en ambiente de PRODUCCIÓN sin una firma electrónica (.p12) cargada. Por favor, configure su firma digital en el Perfil de Empresa.");
    }
    addLog("Firma electrónica (.p12) no cargada. Iniciando modo SIMULACIÓN local para pruebas de desarrollo...", "warning");
    return ejecutarSimulacionSRI(documentoData, configSRI, onLogUpdate);
  }

  const envLabel = isProd ? 'PRODUCCIÓN' : 'PRUEBAS';

  try {
    addLog(`Iniciando conexión con WebServices del SRI [Ambiente: ${envLabel}]...`, "info");
    addLog("Validando estructura del documento...", "info");

    if (!validarIdentificacion(documentoData.rucReceptor)) {
      throw new Error(`RUC/CI del receptor inválido (${documentoData.rucReceptor}).`);
    }
    if (Number(documentoData.total) <= 0) {
      throw new Error("El total del comprobante debe ser mayor a cero.");
    }
    addLog("Validación previa exitosa.", "success");

    // 1. Recepción del Comprobante
    addLog("Generando sobre SOAP y codificando XML firmado en Base64...", "info");
    const xmlBase64 = btoa(unescape(encodeURIComponent(documentoData.xml)));
    const soapRecepcion = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

    addLog("Enviando comprobante al servicio de Recepción del SRI...", "info");
    const resRecepcion = await enviarPeticionSoap('RecepcionComprobantesOffline', soapRecepcion, configSRI.ambiente);
    addLog(`Respuesta de Recepción recibida vía ${resRecepcion.via}.`, "success");

    // Parsear respuesta de recepción. El SRI responde en femenino: RECIBIDA / DEVUELTA.
    const parser = new DOMParser();
    const docRecepcion = parser.parseFromString(resRecepcion.text, "text/xml");
    const estadoRecepcion = docRecepcion.getElementsByTagName("estado")[0]?.textContent;
    const recibido = estadoRecepcion === 'RECIBIDA' || estadoRecepcion === 'RECIBIDO';
    const devuelto = estadoRecepcion === 'DEVUELTA' || estadoRecepcion === 'DEVUELTO';

    if (devuelto) {
      const mensajeNodes = docRecepcion.getElementsByTagName("mensaje");
      let erroresList = [];
      for (let i = 0; i < mensajeNodes.length; i++) {
        const node = mensajeNodes[i];
        const ident = node.getElementsByTagName("identificador")[0]?.textContent || '';
        const msg = node.getElementsByTagName("mensaje")[0]?.textContent || '';
        const infoAd = node.getElementsByTagName("informacionAdicional")[0]?.textContent || '';
        erroresList.push(`[${ident}] ${msg} (${infoAd})`);
      }
      throw new Error(`Devuelto por el SRI: ${erroresList.join(" | ")}`);
    } else if (!recibido) {
      // No vino <estado> esperado: exponer la respuesta cruda para diagnóstico
      const crudo = (resRecepcion.text || '').replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`Respuesta de recepción inesperada (estado=${estadoRecepcion ?? 'vacío'}). Respuesta del servidor: ${crudo}`);
    }

    addLog("SRI Recepción: RECIBIDA (comprobante transmitido con éxito).", "success");

    // Esperar 2 segundos para dar tiempo al SRI de procesar en lote
    addLog("Esperando respuesta de autorización en cola del SRI (2s)...", "info");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Autorización del Comprobante
    addLog("Consultando estado de autorización en WebService del SRI...", "info");
    const soapAutorizacion = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${documentoData.claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

    let intentos = 3;
    let authData = null;

    while (intentos > 0) {
      try {
        const resAutorizacion = await enviarPeticionSoap('AutorizacionComprobantesOffline', soapAutorizacion, configSRI.ambiente);
        const docAutorizacion = parser.parseFromString(resAutorizacion.text, "text/xml");
        
        const autorizaciones = docAutorizacion.getElementsByTagName("autorizacion");
        if (autorizaciones.length > 0) {
          const authNode = autorizaciones[0];
          const estadoAuth = authNode.getElementsByTagName("estado")[0]?.textContent;
          const fechaAuth = authNode.getElementsByTagName("fechaAutorizacion")[0]?.textContent || '';
          
          if (estadoAuth === 'AUTORIZADO') {
            authData = {
              status: 'autorizado',
              claveAcceso: documentoData.claveAcceso,
              fechaAutorizacion: fechaAuth,
              pdfUrl: `https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/detalle.jsf?claveAcceso=${documentoData.claveAcceso}`,
              xmlUrl: "data:text/xml;charset=utf-8," + encodeURIComponent(documentoData.xml),
              logs
            };
            break;
          } else if (estadoAuth === 'NO AUTORIZADO') {
            const mensajeNodes = authNode.getElementsByTagName("mensaje");
            let erroresList = [];
            for (let i = 0; i < mensajeNodes.length; i++) {
              const node = mensajeNodes[i];
              const msg = node.getElementsByTagName("mensaje")[0]?.textContent || '';
              const infoAd = node.getElementsByTagName("informacionAdicional")[0]?.textContent || '';
              erroresList.push(`${msg} (${infoAd})`);
            }
            throw new Error(`No Autorizado por el SRI. Detalles: ${erroresList.join(" | ")}`);
          }
        } else {
          // Si no hay autorizaciones procesadas aún, podría estar en cola
          addLog("Comprobante en procesamiento en el SRI, reintentando...", "info");
        }
      } catch (errAuth) {
        if (intentos === 1) throw errAuth;
      }
      
      intentos--;
      if (intentos > 0 && !authData) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!authData) {
      throw new Error("No se pudo obtener una respuesta de autorización final del SRI.");
    }

    addLog(`SRI Autorización: AUTORIZADO (Clave: ${documentoData.claveAcceso})`, "success");
    return authData;

  } catch (err) {
    addLog(`Error en transmisión real al SRI: ${err.message || err}`, "error");
    throw { status: 'error', error: err.message || 'Error en transmisión al SRI', logs };
  }
}

// Fallback de Simulación para desarrollo local
function ejecutarSimulacionSRI(documentoData, configSRI, onLogUpdate) {
  return new Promise((resolve, reject) => {
    let logs = [];
    const addLog = (message, status = 'info') => {
      logs.push({ time: new Date().toLocaleTimeString(), message, status });
      onLogUpdate([...logs]);
    };
    
    addLog("Iniciando validación previa del comprobante...", "info");
    setTimeout(() => {
      if (!validarIdentificacion(documentoData.rucReceptor)) {
        addLog(`Error: RUC/CI del receptor inválido (${documentoData.rucReceptor}).`, "error");
        reject({ status: 'rechazado', error: 'Identificación de receptor inválida', logs });
        return;
      }
      addLog("Validación previa exitosa. Campos obligatorios completos.", "success");
      
      setTimeout(() => {
        addLog("Generando sobre XML firmado usando XAdES-BES (Simulado)...", "info");
        addLog("XML firmado de manera exitosa.", "success");
        
        setTimeout(() => {
          const envName = configSRI.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
          addLog(`Conectando con WebService Recepción SRI [Ambiente: ${envName}] (Simulado)...`, "info");
          addLog("Respuesta SRI Recepción: RECIBIDO", "success");
          
          setTimeout(() => {
            addLog("Conectando con WebService Autorización SRI (Simulado)...", "info");
            addLog(`SRI Autorización: AUTORIZADO (Simulado)`, "success");
            resolve({
              status: 'autorizado',
              claveAcceso: documentoData.claveAcceso,
              pdfUrl: `https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/detalle.jsf?claveAcceso=${documentoData.claveAcceso}`,
              xmlUrl: "data:text/xml;charset=utf-8," + encodeURIComponent(documentoData.xml),
              logs
            });
          }, 1500);
        }, 1000);
      }, 1000);
    }, 800);
  });
}

function empaquetarResolucionSRI(ambiente) {
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `${ambiente === '2' ? 'PROD' : 'TEST'}-AUT-${num}`;
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

  // Validar estructura del RUC antes de consultar
  if (!validarIdentificacion(clean)) {
    throw new Error(`La identificación ${clean} no es un RUC/CI válido según el algoritmo de verificación ecuatoriano.`);
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
    } catch (parseErr) {
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
    } catch (_) {
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
