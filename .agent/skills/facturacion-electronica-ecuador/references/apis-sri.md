# APIs y WebServices SRI Ecuador — Referencia completa

## 1. Endpoints oficiales SRI

### Ambiente de PRUEBAS
```
Recepción:     https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
Autorización:  https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
```

### Ambiente de PRODUCCIÓN
```
Recepción:     https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
Autorización:  https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
```

### Consulta de RUC (validación)
```
SOAP: https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/EjecutarConsulta?wsdl
REST (no oficial pero disponible):
  GET https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumeroruc?numeroRuc={RUC}
```

---

## 2. Servicio de Recepción — SOAP

### Método: `validarComprobante`

**Request SOAP:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>{BASE64_DEL_XML_FIRMADO}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>
```

**Response SOAP — RECIBIDA:**
```xml
<RespuestaRecepcionComprobante>
  <estado>RECIBIDA</estado>
  <comprobantes>
    <comprobante>
      <claveAcceso>4909202301179214120010010000000011234567811</claveAcceso>
      <mensajes/>
    </comprobante>
  </comprobantes>
</RespuestaRecepcionComprobante>
```

**Response SOAP — DEVUELTA (errores):**
```xml
<RespuestaRecepcionComprobante>
  <estado>DEVUELTA</estado>
  <comprobantes>
    <comprobante>
      <claveAcceso>...</claveAcceso>
      <mensajes>
        <mensaje>
          <identificador>35</identificador>
          <mensaje>CLAVE DE ACCESO REGISTRADA</mensaje>
          <tipo>ERROR</tipo>
          <informacionAdicional>La clave de acceso ya fue registrada</informacionAdicional>
        </mensaje>
      </mensajes>
    </comprobante>
  </comprobantes>
</RespuestaRecepcionComprobante>
```

---

## 3. Servicio de Autorización — SOAP

### Método: `autorizacionComprobante`

**Request SOAP:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>4909202301179214120010010000000011234567811</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>
```

**Response SOAP — AUTORIZADO:**
```xml
<RespuestaAutorizacionComprobante>
  <numeroComprobantes>1</numeroComprobantes>
  <autorizaciones>
    <autorizacion>
      <estado>AUTORIZADO</estado>
      <numeroAutorizacion>4909202301179214120010010000000011234567811</numeroAutorizacion>
      <fechaAutorizacion>2023-01-09T14:30:25.000-05:00</fechaAutorizacion>
      <ambiente>PRODUCCION</ambiente>
      <comprobante><![CDATA[<?xml version="1.0" encoding="UTF-8"?>...XML_ORIGINAL...]]></comprobante>
      <mensajes/>
    </autorizacion>
  </autorizaciones>
</RespuestaAutorizacionComprobante>
```

**Response SOAP — EN PROCESO:**
```xml
<autorizacion>
  <estado>EN PROCESO</estado>
  <!-- Sin numeroAutorizacion — reintentar en 2-3 segundos -->
</autorizacion>
```

**Response SOAP — NO AUTORIZADO:**
```xml
<autorizacion>
  <estado>NO AUTORIZADO</estado>
  <mensajes>
    <mensaje>
      <identificador>43</identificador>
      <mensaje>RUC DEL EMISOR INVALIDO</mensaje>
      <tipo>ERROR</tipo>
    </mensaje>
  </mensajes>
</autorizacion>
```

---

## 4. Implementación completa Node.js/TypeScript

```typescript
// sri-service.ts
import axios from 'axios';
import * as soap from 'soap';

const ENDPOINTS = {
  pruebas: {
    recepcion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  produccion: {
    recepcion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
};

type Ambiente = 'pruebas' | 'produccion';

export interface ResultadoEnvio {
  estado: 'RECIBIDA' | 'DEVUELTA' | 'ERROR';
  claveAcceso: string;
  mensajes: Array<{ identificador: string; mensaje: string; tipo: string }>;
}

export interface ResultadoAutorizacion {
  estado: 'AUTORIZADO' | 'NO AUTORIZADO' | 'EN PROCESO';
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  xmlAutorizado?: string;
  mensajes: Array<{ identificador: string; mensaje: string; tipo: string }>;
}

// ─── ENVÍO AL SRI ────────────────────────────────────────────────────────────

export async function enviarComprobante(
  xmlFirmadoBase64: string,
  ambiente: Ambiente,
  reintentos = 3
): Promise<ResultadoEnvio> {
  const wsdl = ENDPOINTS[ambiente].recepcion;

  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      const client = await soap.createClientAsync(wsdl, { wsdl_options: { timeout: 30000 } });
      const [result] = await client.validarComprobanteAsync({ xml: xmlFirmadoBase64 });

      const respuesta = result.RespuestaRecepcionComprobante;
      const comprobante = respuesta.comprobantes?.comprobante;

      return {
        estado: respuesta.estado,
        claveAcceso: comprobante?.claveAcceso ?? '',
        mensajes: parsearMensajes(comprobante?.mensajes),
      };
    } catch (err) {
      if (intento === reintentos) throw new Error(`SRI Recepción falló tras ${reintentos} intentos: ${err}`);
      await esperar(2000 * intento); // backoff exponencial
    }
  }
  throw new Error('Error inesperado en envío');
}

// ─── AUTORIZACIÓN ────────────────────────────────────────────────────────────

export async function autorizarComprobante(
  claveAcceso: string,
  ambiente: Ambiente,
  maxEspera = 30000 // ms máximo esperando autorización
): Promise<ResultadoAutorizacion> {
  const wsdl = ENDPOINTS[ambiente].autorizacion;
  const inicio = Date.now();

  while (Date.now() - inicio < maxEspera) {
    try {
      const client = await soap.createClientAsync(wsdl, { wsdl_options: { timeout: 15000 } });
      const [result] = await client.autorizacionComprobanteAsync({ claveAccesoComprobante: claveAcceso });

      const autorizacion = result.RespuestaAutorizacionComprobante
        ?.autorizaciones?.autorizacion;

      if (!autorizacion) throw new Error('Respuesta vacía del SRI');

      const estado = autorizacion.estado;

      if (estado === 'EN PROCESO') {
        await esperar(3000);
        continue;
      }

      return {
        estado,
        numeroAutorizacion: autorizacion.numeroAutorizacion,
        fechaAutorizacion: autorizacion.fechaAutorizacion,
        xmlAutorizado: autorizacion.comprobante,
        mensajes: parsearMensajes(autorizacion.mensajes),
      };
    } catch (err) {
      await esperar(2000);
    }
  }
  throw new Error(`Timeout: El SRI no autorizó en ${maxEspera / 1000}s`);
}

// ─── FLUJO COMPLETO ──────────────────────────────────────────────────────────

export async function emitirComprobante(params: {
  xmlFirmadoBase64: string;
  claveAcceso: string;
  ambiente: Ambiente;
}): Promise<ResultadoAutorizacion> {
  // 1. Enviar
  const envio = await enviarComprobante(params.xmlFirmadoBase64, params.ambiente);

  if (envio.estado === 'DEVUELTA') {
    throw new Error(`SRI devolvió el comprobante: ${JSON.stringify(envio.mensajes)}`);
  }

  // 2. Autorizar (el SRI procesa de forma asíncrona)
  await esperar(1500); // pausa inicial antes de consultar
  return autorizarComprobante(params.claveAcceso, params.ambiente);
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

function parsearMensajes(mensajes: any): Array<{ identificador: string; mensaje: string; tipo: string }> {
  if (!mensajes?.mensaje) return [];
  const lista = Array.isArray(mensajes.mensaje) ? mensajes.mensaje : [mensajes.mensaje];
  return lista.map((m: any) => ({
    identificador: m.identificador ?? '',
    mensaje: m.mensaje ?? '',
    tipo: m.tipo ?? '',
  }));
}

function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 5. Validación de RUC / Cédula

```typescript
// validaciones.ts

// Validar cédula ecuatoriana (10 dígitos)
export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const digitos = cedula.split('').map(Number);
  const verificador = digitos[9];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let val = digitos[i] * (i % 2 === 0 ? 2 : 1);
    if (val >= 10) val -= 9;
    suma += val;
  }

  const residuo = suma % 10;
  const digitoEsperado = residuo === 0 ? 0 : 10 - residuo;
  return digitoEsperado === verificador;
}

// Validar RUC persona natural (cédula + 001)
export function validarRucPersonaNatural(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;
  if (ruc.substring(10) !== '001') return false;
  return validarCedula(ruc.substring(0, 10));
}

// Validar RUC sociedad (tercer dígito = 9)
export function validarRucSociedad(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;
  const provincia = parseInt(ruc.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  if (ruc[2] !== '9') return false;
  if (ruc.substring(10) !== '001') return false;

  const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = ruc.split('').map(Number);
  const suma = coeficientes.reduce((acc, coef, i) => acc + coef * digitos[i], 0);
  const residuo = suma % 11;
  const digitoEsperado = residuo === 0 ? 0 : 11 - residuo;
  return digitoEsperado === digitos[9];
}

// Validar RUC sector público (tercer dígito = 6)
export function validarRucSectorPublico(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;
  if (ruc[2] !== '6') return false;
  if (ruc.substring(10) !== '0001') return false;

  const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = ruc.split('').map(Number);
  const suma = coeficientes.reduce((acc, coef, i) => acc + coef * digitos[i], 0);
  const residuo = suma % 11;
  const digitoEsperado = residuo === 0 ? 0 : 11 - residuo;
  return digitoEsperado === digitos[8];
}

// Validar cualquier identificación
export function validarIdentificacion(
  tipo: 'RUC' | 'CEDULA' | 'PASAPORTE',
  valor: string
): boolean {
  switch (tipo) {
    case 'CEDULA': return validarCedula(valor);
    case 'RUC':
      if (valor[2] === '9') return validarRucSociedad(valor);
      if (valor[2] === '6') return validarRucSectorPublico(valor);
      return validarRucPersonaNatural(valor);
    case 'PASAPORTE': return valor.length >= 5 && valor.length <= 20;
    default: return false;
  }
}
```

---

## 6. Numeración y secuenciales

```typescript
// numeracion.ts — gestión de secuenciales correlativos

export interface ConfigNumeracion {
  establecimiento: string;  // 3 dígitos: '001'
  puntoEmision: string;     // 3 dígitos: '001'
  tipoComprobante: string;  // '01'=factura, '04'=NC, '05'=ND, '06'=GR, '07'=retencion
}

// En BD: tabla numeracion_comprobantes
// CREATE TABLE numeracion_comprobantes (
//   id SERIAL PRIMARY KEY,
//   establecimiento CHAR(3) NOT NULL,
//   punto_emision CHAR(3) NOT NULL,
//   tipo_comprobante CHAR(2) NOT NULL,
//   ultimo_secuencial INTEGER NOT NULL DEFAULT 0,
//   UNIQUE(establecimiento, punto_emision, tipo_comprobante)
// );

// Obtener próximo secuencial (con bloqueo para evitar duplicados)
export async function siguienteSecuencial(
  db: any, // tu cliente de BD
  config: ConfigNumeracion
): Promise<string> {
  // Usar transacción con SELECT FOR UPDATE para evitar race conditions
  const result = await db.transaction(async (trx: any) => {
    const row = await trx('numeracion_comprobantes')
      .where({
        establecimiento: config.establecimiento,
        punto_emision: config.puntoEmision,
        tipo_comprobante: config.tipoComprobante,
      })
      .forUpdate()
      .first();

    const nuevoSecuencial = (row?.ultimo_secuencial ?? 0) + 1;

    if (nuevoSecuencial > 999999999) {
      throw new Error('Secuencial superó el límite de 9 dígitos');
    }

    await trx('numeracion_comprobantes')
      .where({ establecimiento: config.establecimiento, punto_emision: config.puntoEmision, tipo_comprobante: config.tipoComprobante })
      .update({ ultimo_secuencial: nuevoSecuencial });

    return nuevoSecuencial;
  });

  return String(result).padStart(9, '0'); // '000000001'
}
```

---

## 7. Servicios de facturación de terceros (alternativa al SRI directo)

Cuando no se quiere conectar directo al SRI (menor complejidad de firma electrónica):

| Proveedor | API | Notas |
|---|---|---|
| **Comprobantes SRI** (sri.gob.ec) | SOAP directo | Requiere certificado propio |
| **Facturero** | REST JSON | Maneja firma y envío, retorna XML autorizado |
| **Datil** | REST JSON | Popular en Ecuador, buen SDK |
| **SRI Tools** | REST | Open source, auto-hospedado |
| **FirmaEC** | Librería Node/Java | Solo para firma, sin envío |

### Integración con Datil (ejemplo)
```typescript
// datil-service.ts
const DATIL_API = 'https://app.datil.co/api/v2';

export async function emitirFacturaDatil(factura: any, apiKey: string) {
  const response = await fetch(`${DATIL_API}/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': apiKey,
    },
    body: JSON.stringify(factura),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Datil error: ${JSON.stringify(error)}`);
  }

  return response.json();
  // Retorna: { id, estado, clave_acceso, numero_autorizacion, ... }
}
```