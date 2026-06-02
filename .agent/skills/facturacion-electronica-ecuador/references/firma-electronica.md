# Firma Electrónica, Clave de Acceso, ATS y Errores SRI

---

## 1. CLAVE DE ACCESO — Generación y dígito verificador

### Estructura (49 dígitos)
```
[fechaEmision:8][tipoComprobante:2][ruc:13][ambiente:1][serie:6][secuencial:9][codigoNumerico:8][tipoEmision:1][digitoVerificador:1]
```

```typescript
// clave-acceso.ts

export function generarClaveAcceso(params: {
  fechaEmision: Date;
  tipoComprobante: string;   // '01','04','05','06','07'
  ruc: string;
  ambiente: 1 | 2;
  establecimiento: string;   // 3 dígitos
  puntoEmision: string;      // 3 dígitos
  secuencial: string;        // 9 dígitos
  tipoEmision?: 1 | 2;       // 1=normal, 2=contingencia
}): string {
  const fecha = formatFecha(params.fechaEmision);    // ddMMyyyy
  const codigoNumerico = generarCodigoNumerico();     // 8 dígitos aleatorios
  const tipoEmision = String(params.tipoEmision ?? 1);

  const clave48 =
    fecha +
    params.tipoComprobante +
    params.ruc +
    String(params.ambiente) +
    params.establecimiento +
    params.puntoEmision +
    params.secuencial +
    codigoNumerico +
    tipoEmision;

  if (clave48.length !== 48) {
    throw new Error(`Clave de acceso debe tener 48 dígitos antes del verificador, tiene ${clave48.length}`);
  }

  const verificador = calcularDigitoVerificador(clave48);
  return clave48 + verificador;
}

// Algoritmo módulo 11 (pesos 2-7 cíclicos de derecha a izquierda)
function calcularDigitoVerificador(clave48: string): string {
  const pesos = [2, 3, 4, 5, 6, 7];
  let suma = 0;

  for (let i = clave48.length - 1; i >= 0; i--) {
    const pesoIndex = (clave48.length - 1 - i) % pesos.length;
    suma += parseInt(clave48[i]) * pesos[pesoIndex];
  }

  const residuo = suma % 11;
  const digitoVerificador = residuo === 0 ? 0 : residuo === 1 ? 1 : 11 - residuo;
  return String(digitoVerificador);
}

function generarCodigoNumerico(): string {
  return Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
}

function formatFecha(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const yyyy = String(fecha.getFullYear());
  return dd + mm + yyyy;
}

// Verificar clave de acceso recibida
export function verificarClaveAcceso(clave49: string): boolean {
  if (clave49.length !== 49) return false;
  const clave48 = clave49.substring(0, 48);
  const digitoRecibido = clave49[48];
  const digitoCalculado = calcularDigitoVerificador(clave48);
  return digitoRecibido === digitoCalculado;
}
```

---

## 2. FIRMA ELECTRÓNICA

### Tipos de certificados en Ecuador
| Tipo | Emisor | Uso ERP |
|---|---|---|
| Archivo .p12 / .pfx | Banco Central, Security Data, ANF | Recomendado para servidores |
| Token USB | Banco Central, Security Data | Para persona natural, no recomendado en servidor |

### Proveedores de certificados
- **Banco Central del Ecuador:** https://www.eci.bce.ec
- **Security Data:** https://www.securitydata.net.ec
- **ANF AC Ecuador:** https://www.anf.es/ecuador

### Implementación firma XAdES-BES con Node.js

```typescript
// firma-electronica.ts
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import * as fs from 'fs';

interface CertificadoConfig {
  p12Path: string;     // ruta al archivo .p12
  password: string;    // contraseña del certificado
}

interface ResultadoFirma {
  xmlFirmado: string;
  xmlFirmadoBase64: string;
}

export async function firmarXML(
  xmlSinFirmar: string,
  cert: CertificadoConfig
): Promise<ResultadoFirma> {
  // 1. Cargar certificado .p12
  const p12Buffer = fs.readFileSync(cert.p12Path);
  const p12Base64 = p12Buffer.toString('base64');
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, cert.password);

  // 2. Extraer clave privada y certificado
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = bags[forge.pki.oids.certBag]![0];
  const certificate = certBag.cert!;

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0];
  const privateKey = keyBag.key!;

  // 3. Preparar PEM
  const certPem = forge.pki.certificateToPem(certificate);
  const keyPem = forge.pki.privateKeyToPem(privateKey as forge.pki.PrivateKey);
  const certBase64 = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\n/g, '');

  // 4. Firmar con XAdES-BES (requerido por SRI Ecuador)
  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: certPem,
  });

  sig.addReference({
    xpath: '//*[@id="comprobante"]',
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  sig.signingKey = keyPem;
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';

  // Agregar certificado en KeyInfo
  sig.keyInfoProvider = {
    getKeyInfo: () =>
      `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
  } as any;

  sig.computeSignature(xmlSinFirmar);
  const xmlFirmado = sig.getSignedXml();
  const xmlFirmadoBase64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');

  return { xmlFirmado, xmlFirmadoBase64 };
}

// Verificar vigencia del certificado
export function verificarVigenciaCertificado(p12Path: string, password: string): {
  vigente: boolean;
  fechaExpiracion: Date;
  diasRestantes: number;
} {
  const p12Buffer = fs.readFileSync(p12Path);
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(forge.util.decode64(p12Buffer.toString('base64'))),
    password
  );
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert = bags[forge.pki.oids.certBag]![0].cert!;
  const fechaExpiracion = cert.validity.notAfter;
  const diasRestantes = Math.floor((fechaExpiracion.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    vigente: diasRestantes > 0,
    fechaExpiracion,
    diasRestantes,
  };
}
```

---

## 3. ATS — Anexo Transaccional Simplificado

### Estructura XML del ATS

```xml
<?xml version="1.0" encoding="UTF-8"?>
<iva xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.21"
     xsi:noNamespaceSchemaLocation="ats.xsd">

  <TipoIDInformante>04</TipoIDInformante>     <!-- 04=RUC -->
  <IdInformante>1792141210001</IdInformante>
  <razonSocial>EMPRESA S.A.</razonSocial>
  <Anio>2023</Anio>
  <Mes>01</Mes>
  <numEstabRuc>001</numEstabRuc>
  <totalVentas>15000.00</totalVentas>
  <codigoOperativo>IVA</codigoOperativo>

  <!-- ══ COMPRAS ══════════════════════════════════════════════════ -->
  <compras>
    <detalleCompras>
      <codSustento>01</codSustento>           <!-- 01=facturas, 02=liquidación compras -->
      <tpIdProv>04</tpIdProv>
      <idProv>0912345678001</idProv>
      <tipoComprobante>01</tipoComprobante>
      <parteRel>NO</parteRel>                 <!-- partes relacionadas -->
      <fechaRegistro>2023-01-15</fechaRegistro>
      <establecimiento>001</establecimiento>
      <puntoEmision>001</puntoEmision>
      <secuencial>000000010</secuencial>
      <fechaEmision>2023-01-14</fechaEmision>
      <autorizacion>2301202301109214120010010000000101234567811</autorizacion>
      <baseNoGravIva>0.00</baseNoGravIva>
      <baseImponible>0.00</baseImponible>
      <baseImpGrav>500.00</baseImpGrav>
      <baseImpExe>0.00</baseImpExe>
      <montoIce>0.00</montoIce>
      <montoIva>75.00</montoIva>              <!-- 500 × 15% -->
      <valRetBien10>0.00</valRetBien10>
      <valRetServ20>0.00</valRetServ20>
      <valorRetBienes>5.00</valorRetBienes>   <!-- ret fuente bienes 1% -->
      <valorRetServicios>0.00</valorRetServicios>
      <valRetServ50>0.00</valRetServ50>
      <valorRetIva>22.50</valorRetIva>        <!-- ret IVA 30% -->
      <valorRetIva100>0.00</valorRetIva100>
      <totbasesImpReemb>0.00</totbasesImpReemb>
      <!-- Retenciones emitidas -->
      <estabRetencion1>001</estabRetencion1>
      <ptoEmiRetencion1>001</ptoEmiRetencion1>
      <secRetencion1>000000001</secRetencion1>
      <autRetencion1>2301202307109214120010010000000101234567811</autRetencion1>
      <fechaEmiRet1>2023-01-19</fechaEmiRet1>
      <docModificado>NA</docModificado>
      <estabModificado>NA</estabModificado>
      <ptoEmiModificado>NA</ptoEmiModificado>
      <secModificado>NA</secModificado>
      <autModificado>NA</autModificado>
    </detalleCompras>
  </compras>

  <!-- ══ VENTAS ════════════════════════════════════════════════════ -->
  <ventas>
    <detalleVentas>
      <tpIdCliente>04</tpIdCliente>
      <idCliente>1791234567001</idCliente>
      <parteRelVtas>NO</parteRelVtas>
      <tipoComprobante>01</tipoComprobante>
      <tipoEmision>E</tipoEmision>            <!-- E=electrónico, F=físico -->
      <numeroComprobantes>1</numeroComprobantes>
      <baseNoGravIva>0.00</baseNoGravIva>
      <baseImponible>0.00</baseImponible>
      <baseImpGrav>1000.00</baseImpGrav>
      <montoIva>150.00</montoIva>
      <montoIce>0.00</montoIce>
      <valorRetIva>0.00</valorRetIva>
      <valorRetRenta>0.00</valorRetRenta>
    </detalleVentas>
  </ventas>

  <!-- ══ VENTAS ESTABLECIMIENTOS ──────── (si hay más establecimientos) -->
  <ventasEstablecimiento>
    <ventaEst>
      <codEstab>001</codEstab>
      <ventas12>15000.00</ventas12>
      <ventas0>0.00</ventas0>
      <otrosIngresos>0.00</otrosIngresos>
      <ventaExe>0.00</ventaExe>
    </ventaEst>
  </ventasEstablecimiento>

</iva>
```

---

## 4. Códigos de error SRI — Tabla completa

| Código | Mensaje | Causa | Solución |
|---|---|---|---|
| **RECEPCIÓN** | | | |
| 1 | SISTEMA WEBSERVICE NO DISPONIBLE | SRI en mantenimiento | Reintentar en 5-10 min |
| 15 | FIRMA NO VÁLIDA | Certificado inválido o XML mal formado | Verificar firma y XML |
| 16 | CERTIFICADO CADUCADO | Certificado vencido | Renovar certificado |
| 23 | CLAVE DE ACCESO NO CORRESPONDE AL COMPROBANTE | Clave no coincide con datos XML | Recalcular clave de acceso |
| 25 | FECHA DE EMISIÓN INCORRECTA | Fecha futura o muy antigua (>30 días) | Usar fecha correcta |
| 29 | SECUENCIAL INCORRECTO | No es numérico o < 9 dígitos | Formatear con padStart(9,'0') |
| 35 | CLAVE DE ACCESO REGISTRADA | Ya se envió este comprobante | Consultar autorización |
| 39 | XML NO CUMPLE ESQUEMA XSD | XML inválido | Validar contra XSD SRI |
| 41 | RUC DEL EMISOR NO EXISTE | RUC no registrado en SRI | Verificar RUC |
| 43 | RUC DEL EMISOR INVALIDO | RUC mal formado | Verificar dígito verificador |
| 45 | RUC EMISOR SUSPENDIDO | RUC suspendido en SRI | Regularizar situación |
| 47 | NÚMERO AUTORIZACION ESTABLECIMIENTO NO VÁLIDO | Establecimiento no autorizado | Verificar autorización estab. |
| 49 | CONTRIBUYENTE ES RIMPE | Emite nota de venta, no factura | Verificar tipo contribuyente |
| **AUTORIZACIÓN** | | | |
| 60 | COMPROBANTE NO INFORMADO | Clave no enviada aún | Enviar primero a recepción |
| 63 | FIRMA CADUCADA | Cert venció tras envío | Renovar y reenviar |
| 65 | NO AUTORIZADO | Error de negocio | Ver mensajes detallados |
| 70 | EN PROCESO | SRI aún procesando | Reintentar en 3-5 seg |

---

## 5. Manejo de contingencia offline

```typescript
// contingencia.ts — guardar comprobantes cuando el SRI no responde

import * as fs from 'fs';
import * as path from 'path';

interface ComprobanteContingencia {
  claveAcceso: string;
  xmlFirmadoBase64: string;
  xmlFirmado: string;
  fechaEmision: Date;
  intentos: number;
  ultimoIntento: Date;
  error: string;
}

const DIR_CONTINGENCIA = process.env.CONTINGENCIA_DIR ?? './contingencia';

export function guardarContingencia(comp: ComprobanteContingencia): void {
  if (!fs.existsSync(DIR_CONTINGENCIA)) fs.mkdirSync(DIR_CONTINGENCIA, { recursive: true });

  const archivo = path.join(DIR_CONTINGENCIA, `${comp.claveAcceso}.json`);
  fs.writeFileSync(archivo, JSON.stringify(comp, null, 2));

  // También guardar XML firmado por si se necesita
  const archivoXml = path.join(DIR_CONTINGENCIA, `${comp.claveAcceso}.xml`);
  fs.writeFileSync(archivoXml, comp.xmlFirmado);
}

// Proceso que corre cada N minutos para reintentar pendientes
export async function procesarContingenciaPendiente(
  emitirFn: (base64: string, clave: string) => Promise<any>
): Promise<void> {
  if (!fs.existsSync(DIR_CONTINGENCIA)) return;

  const archivos = fs.readdirSync(DIR_CONTINGENCIA).filter(f => f.endsWith('.json'));

  for (const archivo of archivos) {
    const comp: ComprobanteContingencia = JSON.parse(
      fs.readFileSync(path.join(DIR_CONTINGENCIA, archivo), 'utf8')
    );

    if (comp.intentos >= 10) continue; // descartar tras 10 intentos

    try {
      await emitirFn(comp.xmlFirmadoBase64, comp.claveAcceso);
      // Si éxito: eliminar de contingencia
      fs.unlinkSync(path.join(DIR_CONTINGENCIA, archivo));
      fs.unlinkSync(path.join(DIR_CONTINGENCIA, `${comp.claveAcceso}.xml`));
    } catch {
      comp.intentos++;
      comp.ultimoIntento = new Date();
      fs.writeFileSync(path.join(DIR_CONTINGENCIA, archivo), JSON.stringify(comp, null, 2));
    }
  }
}
```