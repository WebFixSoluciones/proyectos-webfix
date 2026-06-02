# Firma Electrónica y Estándares del SRI

Este documento describe las especificaciones técnicas para el firmado y la transmisión de comprobantes electrónicos autorizados por el SRI.

## 1. Firma Digital (.p12 / .pfx)
- Formato: PKCS#12 (clave privada y certificado de firma integrados).
- Tipo de firma requerida: **XAdES-BES** (XML Advanced Electronic Signatures - Basic Electronic Signature).
- Algoritmo de hash: SHA-256 para firmar el digest del XML.
- La firma digital debe contener el campo RUC del emisor para que el validador del SRI la reconozca como válida.

## 2. Generación de Clave de Acceso (49 dígitos)
La clave de acceso de 49 dígitos se compone de la siguiente secuencia numérica:

| Rango | Longitud | Campo | Descripción |
|---|---|---|---|
| 1-8 | 8 | Fecha de Emisión | Formato `DDMMYYYY` (ej. 01062026) |
| 9-10 | 2 | Tipo de Comprobante | `01` para Factura, `07` para Retención, etc. |
| 11-23 | 13 | RUC | RUC del emisor (13 dígitos) |
| 24 | 1 | Tipo Ambiente | `1` Pruebas, `2` Producción |
| 25-30 | 6 | Serie | Establecimiento (3) + Punto de Emisión (3) (ej. `001001`) |
| 31-39 | 9 | Secuencial | Número secuencial (9 dígitos) (ej. `000000001`) |
| 40-47 | 8 | Código Numérico | Número aleatorio o secuencial para control interno |
| 48 | 1 | Tipo Emisión | `1` Emisión Normal |
| 49 | 1 | Dígito Verificador | Calculado con algoritmo de **Módulo 11** |

### Algoritmo Módulo 11 (Dígito Verificador)
1. Multiplicar cada dígito de los primeros 48 dígitos por una secuencia de factores cíclicos `[2, 3, 4, 5, 6, 7]`, de derecha a izquierda.
2. Sumar todos los productos.
3. Calcular el residuo de dividir la suma entre 11 (`suma % 11`).
4. Restar el residuo de 11: `verificador = 11 - residuo`.
5. Si `verificador == 11`, el dígito es `0`. Si `verificador == 10`, el dígito es `1`. De lo contrario, se mantiene el resultado obtenido.