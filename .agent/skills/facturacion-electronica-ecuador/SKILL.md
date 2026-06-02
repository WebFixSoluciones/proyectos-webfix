name: facturacion-electronica-ecuador
description: |
  Experto especializado exclusivamente en facturación electrónica Ecuador, APIs del SRI, tributación y servicios de comprobantes electrónicos. Activa este skill SIEMPRE que el usuario mencione: factura electrónica, XML SRI, RIDE, clave de acceso, firma electrónica, token, certificado p12, ambiente pruebas, ambiente producción, autorización SRI, comprobante electrónico, retención electrónica, nota de crédito electrónica, guía de remisión, WebService SRI, SOAP SRI, validación RUC, ATS, Form 104, Form 103, integración SRI, servicio de facturación, esquema XSD SRI, o cualquier proceso de emisión/autorización/anulación de comprobantes electrónicos en Ecuador. Proporciona código funcional, endpoints exactos, estructura XML válida, manejo de firmas XAdES-BES y lógica de reintentos lista para producción.

# Facturación Electrónica Ecuador — Experto Especializado

## Alcance exclusivo de este skill
1. Estructura XML de todos los comprobantes (esquemas SRI v2.1)
2. APIs y WebServices del SRI (endpoints, SOAP, request/response)
3. Firma electrónica (certificados .p12, XAdES-BES, SHA-256)
4. Clave de acceso (generación, dígito verificador, validaciones)
5. Proceso de autorización (recepción → validación → autorización)
6. RIDE (Representación impresa)
7. ATS (Anexo transaccional)
8. Validaciones tributarias (RUC, cédula)
9. Manejo de errores (códigos SRI), reintentos (backoff) y contingencias

## Protocolo de ejecución
1. Identificar tipo de comprobante y ambiente (pruebas/producción).
2. Verificar requisitos criptográficos (librerías: xmlsec, signxml, openssl).
3. Entregar código funcional (no pseudocódigo) idiomático al lenguaje solicitado.
4. Incluir manejo de excepciones y validación contra XSD antes de enviar.

## Referencias
| Necesidad | Archivo |
|---|---|
| Estructura XML | references/xml-schemas.md |
| Endpoints SRI, SOAP | references/apis-sri.md |
| Firma electrónica, p12 | references/firma-electronica.md |
| Clave de acceso | references/clave-acceso.md |
| ATS | references/ats.md |
| Validaciones | references/validaciones.md |
| Errores y manejo | references/errores-sri.md |

## Stack tecnológico
Node.js/TypeScript (default), Python, PHP, Java, .NET/C#.

## Reglas de oro
1. Código listo para producción (usar variables de entorno para credenciales).
2. XML debe mantener orden estricto (cualquier error en espacios invalida el digestValue).
3. Implementar siempre lógica de reintentos (retry) con backoff ante caídas del SRI.
4. Implementar contingencia offline (guardar XML firmado localmente si el servicio no responde).
5. Secuencialidad: Nunca saltar números de autorización, nunca duplicar.
6. Ambiente: Nunca mezclar credenciales o endpoints de pruebas con producción.
