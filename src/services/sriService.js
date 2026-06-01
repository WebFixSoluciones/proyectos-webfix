/**
 * Servicio del Core SRI (Ecuador)
 * Maneja validaciones tributarias, generación de clave de acceso, estructura XML y estados del SRI.
 */

// Validador de RUC / CI Ecuatoriano
export function validarIdentificacion(identificacion) {
  if (!identificacion) return false;
  const len = identificacion.length;
  if (len !== 10 && len !== 13) return false;

  // Si es RUC de 13 dígitos, los 3 últimos deben ser 001
  if (len === 13 && !identificacion.endsWith('001')) {
    return false;
  }

  // Tomar los primeros 10 dígitos (que corresponden a la cédula o base del RUC)
  const cedula = identificacion.substring(0, 10);
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
  const claveAcceso = generarClaveAcceso({
    fechaEmision: facturaData.date,
    tipoComprobante: '01',
    ruc: emisorConfig.ruc,
    ambiente: emisorConfig.ambiente,
    establecimiento: emisorConfig.establecimiento,
    puntoEmision: emisorConfig.puntoEmision,
    secuencial: facturaData.secuencial || '000000001'
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
    <tipoIdentificacionComprador>${terceroData.ruc.length === 10 ? '05' : '04'}</tipoIdentificacionComprador>
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
</factura>`;

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

// Consulta simulada de RUC / CI desde la base de datos del SRI
export async function consultarRucSri(rucOrCi) {
  // Simular retraso de red
  await new Promise(resolve => setTimeout(resolve, 800));

  const clean = String(rucOrCi).trim();
  if (clean.length !== 10 && clean.length !== 13) {
    throw new Error("La identificación debe tener 10 (Cédula) o 13 (RUC) dígitos.");
  }

  const esEmpresa = clean.startsWith('179') || clean.startsWith('099') || clean.substring(2, 3) === '9';
  
  // Base de datos de prueba predefinida
  const testDatabase = {
    '1790000000001': {
      name: 'WEBFIX SOLUCIONES TECNOLOGICAS S.A.',
      ruc: '1790000000001',
      tipoIdentificacion: 'ruc',
      direccion: 'Av. de los Shyris N34-102 y Holanda, Edificio Alfa, Oficina 5A, Quito',
      telefono: '022987654',
      email: 'facturacion@webfix.com.ec',
      tipoContribuyente: 'general',
      razonSocial: 'WEBFIX SOLUCIONES TECNOLOGICAS S.A.'
    },
    '1792345678001': {
      name: 'CORPORACION FAVORITA C.A.',
      ruc: '1792345678001',
      tipoIdentificacion: 'ruc',
      direccion: 'Av. General Enríquez s/n y Vía Cotogchoa, Sangolquí',
      telefono: '022999000',
      email: 'proveedores@favorita.com',
      tipoContribuyente: 'general',
      razonSocial: 'CORPORACION FAVORITA C.A.'
    },
    '0992345678001': {
      name: 'DISENOS Y DESARROLLOS WEB ECUADOR CIA. LTDA.',
      ruc: '0992345678001',
      tipoIdentificacion: 'ruc',
      direccion: 'Av. Francisco de Orellana, Edificio World Trade Center, Guayaquil',
      telefono: '042630120',
      email: 'info@webdev.com.ec',
      tipoContribuyente: 'rimpe_emprendedor',
      razonSocial: 'DISENOS Y DESARROLLOS WEB ECUADOR CIA. LTDA.'
    },
    '1712345678': {
      name: 'JUAN CARLOS PEREZ GOMEZ',
      ruc: '1712345678',
      tipoIdentificacion: 'cedula',
      direccion: 'Calle Larga 12-45 y Benigno Malo, Cuenca',
      telefono: '0998765432',
      email: 'juan.perez@gmail.com',
      tipoContribuyente: 'rimpe_popular',
      razonSocial: 'JUAN CARLOS PEREZ GOMEZ'
    },
    '1723456789': {
      name: 'MARIA BELEN TORRES RUIZ',
      ruc: '1723456789',
      tipoIdentificacion: 'cedula',
      direccion: 'Av. República del Salvador N36-140 y Suecia, Quito',
      telefono: '0987654321',
      email: 'maria.torres@outlook.com',
      tipoContribuyente: 'rimpe_emprendedor',
      razonSocial: 'MARIA BELEN TORRES RUIZ'
    }
  };

  if (testDatabase[clean]) {
    return testDatabase[clean];
  }

  // Generador dinámico de datos realistas
  const nombresRandom = ["TECNOLOGIAS DE VANGUARDIA", "SERVICIOS INTEGRALES", "CONSTRUCTORA ANDINA", "ALIMENTOS FRESCOS", "IMPORTADORA DEL VALLE"];
  const sufijosRandom = ["S.A.", "CIA. LTDA.", "C.A.", "S.A.S."];
  const personasRandom = ["CARLOS ALBERTO SILVA MORA", "ANA GABRIELA ESPINOSA DIAZ", "LORENA ELIZABETH MEJIA REYES", "ROBERTO ESTEBAN VEGA PAZ"];
  const direccionesRandom = [
    "Av. Amazonas N21-220 y Robles, Quito",
    "Calle 10 de Agosto y Tarqui, Ambato",
    "Av. Carlos Julio Arosemena Km 2.5, Guayaquil",
    "Calle Bolívar 5-80 y Tarqui, Loja",
    "Av. Remigio Crespo Toral 4-90, Cuenca"
  ];

  if (esEmpresa) {
    const idxName = Math.floor(Math.random() * nombresRandom.length);
    const idxSuf = Math.floor(Math.random() * sufijosRandom.length);
    const idxDir = Math.floor(Math.random() * direccionesRandom.length);
    const companyName = `${nombresRandom[idxName]} ${sufijosRandom[idxSuf]}`;
    return {
      name: companyName,
      ruc: clean,
      tipoIdentificacion: 'ruc',
      direccion: direccionesRandom[idxDir],
      telefono: '0' + (2 + Math.floor(Math.random() * 7)) + Math.floor(1000000 + Math.random() * 9000000),
      email: `facturacion@${companyName.toLowerCase().replace(/[^a-z]/g, '')}.com.ec`,
      tipoContribuyente: Math.random() > 0.5 ? 'general' : 'rimpe_emprendedor',
      razonSocial: companyName
    };
  } else {
    const idxPers = Math.floor(Math.random() * personasRandom.length);
    const idxDir = Math.floor(Math.random() * direccionesRandom.length);
    const personName = personasRandom[idxPers];
    const isRucPerson = clean.length === 13;
    return {
      name: personName,
      ruc: clean,
      tipoIdentificacion: isRucPerson ? 'ruc' : 'cedula',
      direccion: direccionesRandom[idxDir],
      telefono: '09' + Math.floor(10000000 + Math.random() * 90000000),
      email: `${personName.toLowerCase().split(' ')[0]}.${personName.toLowerCase().split(' ')[2] || 'user'}@gmail.com`,
      tipoContribuyente: Math.random() > 0.5 ? 'rimpe_popular' : 'rimpe_emprendedor',
      razonSocial: personName
    };
  }
}
