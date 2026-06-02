import { validarIdentificacion, obtenerTipoIdentificacionSRI, generarFacturaXML } from './services/sriService.js';

console.log("=== PRUEBAS DE CUMPLIMIENTO SRI ===");

// 1. Prueba de validación de identificaciones
const cfValid = validarIdentificacion('9999999999999');
console.log("Consumidor Final válido (9999999999999):", cfValid ? "SÍ (Correcto)" : "NO (Error)");

const rucValid = validarIdentificacion('1790000000001');
console.log("RUC corporativo válido (1790000000001):", rucValid ? "SÍ (Correcto)" : "NO (Error)");

const cedValid = validarIdentificacion('1712345678');
console.log("Cédula válida (1712345678):", cedValid ? "SÍ (Correcto)" : "NO (Error)");

// 2. Mapeador de tipo de identificación
const cfType = obtenerTipoIdentificacionSRI({ ruc: '9999999999999', tipoIdentificacion: 'consumidor_final' });
console.log("Tipo Identificación Consumidor Final (esperado 07):", cfType);

const cedType = obtenerTipoIdentificacionSRI({ ruc: '1712345678', tipoIdentificacion: 'cedula' });
console.log("Tipo Identificación Cédula (esperado 05):", cedType);

const rucType = obtenerTipoIdentificacionSRI({ ruc: '1790000000001', tipoIdentificacion: 'ruc' });
console.log("Tipo Identificación RUC (esperado 04):", rucType);

// 3. XML Generación para Consumidor Final
const emisorConfig = {
  ruc: '1790000000001',
  ambiente: '1',
  establecimiento: '001',
  puntoEmision: '001',
  razonSocial: 'WEBFIX TEST S.A.',
  obligadoContabilidad: true,
  direccionMatriz: 'Quito'
};

const facturaData = {
  date: '2026-06-02',
  secuencial: '000000123',
  codigoNumerico: '98765432',
  baseImponible: 100.00,
  ivaPorcentaje: 15,
  ivaValor: 15.00,
  total: 115.00,
  paymentMethod: 'efectivo'
};

const terceroData = {
  name: 'Consumidor Final',
  ruc: '9999999999999',
  tipoIdentificacion: 'consumidor_final'
};

const { xml, claveAcceso } = generarFacturaXML(emisorConfig, facturaData, terceroData, [
  { name: 'Servicio de Consultoría', price: 100.00, quantity: 1, ivaCategory: 15 }
]);

console.log("\nClave de Acceso generada:", claveAcceso);
console.log("Código numérico extraído de la clave (esperado 98765432):", claveAcceso.substring(39, 47));
console.log("¿El tipo de identificación es 07 en el XML?", xml.includes("<tipoIdentificacionComprador>07</tipoIdentificacionComprador>") ? "SÍ (Correcto)" : "NO (Error)");
console.log("¿La identificación del comprador es 9999999999999?", xml.includes("<identificacionComprador>9999999999999</identificacionComprador>") ? "SÍ (Correcto)" : "NO (Error)");
