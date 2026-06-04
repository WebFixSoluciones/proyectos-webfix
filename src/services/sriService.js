/**
 * Servicio del Core SRI (Ecuador)
 * Maneja validaciones tributarias, generación de clave de acceso, estructura XML y estados del SRI.
 */

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

  const activeItems = items.length > 0 ? items : (facturaData.items || []);
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
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${emisorConfig.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${emisorConfig.razonSocial}</razonSocial>
    <nombreComercial>${emisorConfig.nombreComercial || emisorConfig.razonSocial}</nombreComercial>
    <ruc>${emisorConfig.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${emisorConfig.establecimiento}</estab>
    <ptoEmi>${emisorConfig.puntoEmision}</ptoEmi>
    <secuencial>${String(facturaData.secuencial || '1').padStart(9, '0')}</secuencial>
    <dirMatriz>${emisorConfig.direccionMatriz || 'Ecuador'}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${facturaData.date.split('-').reverse().join('/')}</fechaEmision>
    <dirEstablecimiento>${emisorConfig.direccionMatriz || 'Ecuador'}</dirEstablecimiento>
    <obligadoContabilidad>${emisorConfig.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${obtenerTipoIdentificacionSRI(terceroData)}</tipoIdentificacionComprador>
    <razonSocialComprador>${terceroData.name}</razonSocialComprador>
    <identificacionComprador>${terceroData.ruc}</identificacionComprador>
    <totalSinImpuestos>${Number(facturaData.baseImponible).toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${facturaData.ivaPorcentaje === 15 ? '4' : '2'}</codigoPorcentaje>
        <baseImponible>${Number(facturaData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(facturaData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${Number(facturaData.total).toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${facturaData.paymentMethod === 'transferencia' ? '20' : '01'}</formaPago>
        <total>${Number(facturaData.total).toFixed(2)}</total>
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
    impuestosXml += `
    <impuesto>
      <codigo>${ret.codigo}</codigo>
      <codigoRetencion>${ret.codigoRetencion}</codigoRetencion>
      <baseImponible>${Number(ret.baseImponible).toFixed(2)}</baseImponible>
      <porcentajeRetener>${Number(ret.porcentajeRetener).toFixed(2)}</porcentajeRetener>
      <valorRetenido>${Number(ret.valorRetenido).toFixed(2)}</valorRetenido>
      <codDocSustento>${ret.codDocSustento || '01'}</codDocSustento>
      <numDocSustento>${ret.numDocSustento || '000-000-000000000'}</numDocSustento>
      <fechaEmisionDocSustento>${ret.fechaEmisionDocSustento || retencionData.date.split('-').reverse().join('/')}</fechaEmisionDocSustento>
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
    <fechaEmisionDocSustento>${ncData.fechaEmisionDocSustento || ncData.date.split('-').reverse().join('/')}</fechaEmisionDocSustento>
    <totalSinImpuestos>${Number(ncData.baseImponible).toFixed(2)}</totalSinImpuestos>
    <valorModificacion>${Number(ncData.total).toFixed(2)}</valorModificacion>
    <motivo>${ncData.motivo || 'Devolución de mercadería'}</motivo>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${ncData.ivaPorcentaje === 15 ? '4' : '2'}</codigoPorcentaje>
        <baseImponible>${Number(ncData.baseImponible).toFixed(2)}</baseImponible>
        <valor>${Number(ncData.ivaValor).toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
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


// Simulador de Transmisión SRI (Proceso asíncrono con bitácora)
export function simularTransmisionSRI(documentoData, configSRI, onLogUpdate) {
  return new Promise((resolve, reject) => {
    let logs = [];
    const addLog = (message, status = 'info') => {
      const logEntry = {
        time: new Date().toLocaleTimeString(),
        message,
        status
      };
      logs.push(logEntry);
      onLogUpdate([...logs]);
    };

    addLog("Iniciando validación previa del comprobante...", "info");

    setTimeout(() => {
      // 1. Validaciones previas
      if (!validarIdentificacion(documentoData.rucReceptor)) {
        addLog(`Error: RUC/CI del receptor inválido (${documentoData.rucReceptor}).`, "error");
        reject({ status: 'rechazado', error: 'Identificación de receptor inválida', logs });
        return;
      }
      if (Number(documentoData.total) <= 0) {
        addLog("Error: El total del comprobante debe ser mayor a cero.", "error");
        reject({ status: 'rechazado', error: 'Total inválido', logs });
        return;
      }
      addLog("Validación previa exitosa. Campos obligatorios completos.", "success");

      // 2. Firmar XML
      setTimeout(() => {
        if (!configSRI.certificadoCargado) {
          addLog("Firma electrónica (.p12) no cargada o contraseña incorrecta.", "error");
          reject({ status: 'rechazado', error: 'Falta Firma Electrónica', logs });
          return;
        }
        addLog("Generando sobre XML firmado usando XAdES-BES...", "info");
        addLog(`Certificado: ${configSRI.certificadoNombre || 'firma.p12'} detectado.`, "info");
        addLog("XML firmado criptográficamente de manera exitosa.", "success");

        // 3. Conexión y Recepción
        setTimeout(() => {
          const envName = configSRI.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
          addLog(`Conectando con WebService Recepción SRI [Ambiente: ${envName}]...`, "info");
          addLog("Transmitiendo paquete SOAP del comprobante...", "info");

          setTimeout(() => {
            addLog("Respuesta SRI Recepción: RECIBIDO", "success");

            // 4. Autorización
            setTimeout(() => {
              addLog("Conectando con WebService Autorización SRI...", "info");
              addLog(`Buscando clave de acceso: ${documentoData.claveAcceso}...`, "info");

              setTimeout(() => {
                const randomVal = Math.random();
                if (randomVal < 0.05) {
                  // Pequeña chance de rechazo simulado para mostrar manejo de errores
                  addLog("SRI Autorización: RECHAZADO - Clave de acceso ya procesada o error de secuencial.", "error");
                  reject({ status: 'rechazado', error: 'Rechazado por secuencial duplicado', logs });
                } else {
                  const resolucion = empaquetarResolucionSRI(configSRI.ambiente);
                  addLog(`SRI Autorización: AUTORIZADO (${resolucion})`, "success");
                  addLog("Generando archivo visual RIDE en PDF...", "info");
                  
                  // Generar URLs simuladas
                  const mockPdfUrl = "https://www.sri.gob.ec/comprobantes-electronicos-internet/publico/detalle.jsf";
                  
                  resolve({
                    status: 'autorizado',
                    claveAcceso: documentoData.claveAcceso,
                    pdfUrl: mockPdfUrl,
                    xmlUrl: "data:text/xml;charset=utf-8," + encodeURIComponent(documentoData.xml),
                    logs
                  });
                }
              }, 1200);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 800);
  });
}

function empaquetarResolucionSRI(ambiente) {
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `${ambiente === '2' ? 'PROD' : 'TEST'}-AUT-${num}`;
}

// Consulta REAL de RUC / CI desde APIs del SRI de Ecuador
// Usa la API de CipherByte como fuente principal con fallback a SRI directo.
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
  // FUENTE 1: API de CipherByte (principal)
  // ═══════════════════════════════════════════════════════════
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // timeout 12s

    const res = await fetch(`https://aggregator.cipherbyte.ec/company/${rucParaConsulta}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const apiData = await res.json();
      
      // Verificar que la API devolvió datos reales (no vacíos)
      if (apiData && (apiData.razonSocial || apiData.numeroRuc)) {
        return mapearRespuestaCipherByte(apiData, clean, rucParaConsulta);
      } else {
        errores.push('CipherByte: La API respondió pero sin datos para este RUC.');
      }
    } else if (res.status === 404) {
      errores.push(`CipherByte: RUC ${rucParaConsulta} no encontrado en la base de datos.`);
    } else {
      errores.push(`CipherByte: Error HTTP ${res.status} - ${res.statusText}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      errores.push('CipherByte: Tiempo de espera agotado (>12s). El servidor no respondió.');
    } else {
      errores.push(`CipherByte: ${err.message || 'Error de conexión.'}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FUENTE 2: Consulta directa al SRI (catálogo de contribuyentes)
  // ═══════════════════════════════════════════════════════════
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000);

    const sriUrl = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/existePorNumeroRuc?numeroRuc=${rucParaConsulta}`;
    const sriRes = await fetch(sriUrl, {
      signal: controller2.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId2);

    if (sriRes.ok) {
      const sriData = await sriRes.json();
      if (sriData && (sriData.razonSocial || sriData.nombreComercial)) {
        return mapearRespuestaSRI(sriData, clean, rucParaConsulta);
      }
    }
  } catch (err2) {
    errores.push(`SRI Directo: ${err2.name === 'AbortError' ? 'Tiempo de espera agotado.' : (err2.message || 'Error de conexión.')}`);
  }

  // ═══════════════════════════════════════════════════════════
  // FUENTE 3: Consulta al SRI método alternativo (SOAP/REST público)
  // ═══════════════════════════════════════════════════════════
  try {
    const controller3 = new AbortController();
    const timeoutId3 = setTimeout(() => controller3.abort(), 10000);

    const sriUrl2 = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?&numeroRuc=${rucParaConsulta}`;
    const sriRes2 = await fetch(sriUrl2, {
      signal: controller3.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId3);

    if (sriRes2.ok) {
      const sriData2 = await sriRes2.json();
      // Este endpoint puede devolver un array o un objeto
      const record = Array.isArray(sriData2) ? sriData2[0] : sriData2;
      if (record && (record.razonSocial || record.nombreComercial)) {
        return mapearRespuestaSRI(record, clean, rucParaConsulta);
      }
    }
  } catch (err3) {
    errores.push(`SRI Alternativo: ${err3.name === 'AbortError' ? 'Tiempo de espera agotado.' : (err3.message || 'Error de conexión.')}`);
  }

  // ═══════════════════════════════════════════════════════════
  // TODAS LAS FUENTES FALLARON — Error transparente al usuario
  // ═══════════════════════════════════════════════════════════
  console.error("Todas las fuentes de consulta de RUC fallaron:", errores);
  throw new Error(
    `No se pudieron obtener los datos reales del RUC ${rucParaConsulta} desde el SRI. ` +
    `Verifique su conexión a internet e intente nuevamente. ` +
    `Detalles técnicos: ${errores.join(' | ')}`
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
