# Tributación SRI Ecuador — Normativa vigente 2025-2026

## Tabla de contenidos
1. [IVA — tarifas y códigos](#iva)
2. [Retenciones en la fuente — tabla completa](#retenciones-fuente)
3. [Retenciones de IVA](#retenciones-iva)
4. [Facturación electrónica — estructura y validaciones](#fe)
5. [Declaraciones y formularios](#declaraciones)
6. [RIMPE — régimen simplificado](#rimpe)
7. [Impuesto a la Renta personas naturales y jurídicas](#ir)
8. [Comprobantes de venta válidos](#comprobantes)

---

## 1. IVA — Tarifas vigentes

| Tarifa | Código SRI | Aplica a |
|---|---|---|
| 15% | 2 | Bienes y servicios gravados (tarifa general desde 2024) |
| 0% | 0 | Canasta básica, medicamentos, exportaciones, educación, salud |
| Exento | 6 | No forma parte de base imponible (seguros, servicios financieros) |
| No objeto | 7 | Fuera del ámbito del IVA (transferencias sin valor, aportes capital) |

**Nota importante 2024:** La tarifa general del IVA en Ecuador subió del 12% al 15% (Ley Orgánica Eficiencia Económica). En el ERP todos los productos con IVA deben usar 15% como tarifa estándar.

**Crédito tributario de IVA:**
- IVA en compras de bienes/servicios usados en actividades gravadas → crédito tributario 100%
- IVA en compras para actividades mixtas (gravadas y exentas) → proporcionalidad
- IVA en gastos personales → no genera crédito tributario

---

## 2. Retenciones en la fuente del Impuesto a la Renta

### Retenciones a personas naturales (tabla 2025-2026)

| Código | Concepto | % |
|---|---|---|
| 303 | Honorarios profesionales y dietas | 10% |
| 304 | Servicios predomina intelecto (no título profesional) | 8% |
| 307 | Servicios predomina mano de obra | 2% |
| 308 | Servicios entre sociedades | 2% |
| 309 | Servicios publicidad y comunicación | 1% |
| 310 | Transporte privado de pasajeros / carga | 1% |
| 312 | Transferencia de bienes muebles | 1% |
| 319 | Arrendamiento bienes inmuebles (PN) | 8% |
| 320 | Arrendamiento bienes inmuebles (PJ) | 8% |
| 322 | Seguros y reaseguros (primas) | 1% |
| 323 | Rendimientos financieros | 2% |
| 325 | Loterías, rifas, apuestas | 15% |
| 327 | Venta de combustibles a comercializadoras | 2/1000 |
| 328 | Venta de combustibles a consumidores | 3% |
| 330 | Otras retenciones | 2% |
| 332 | Compra de bienes inmuebles | 1% |
| 340 | Otras retenciones 1% | 1% |
| 341 | Otras retenciones 2% | 2% |

### Reglas de retención en la fuente:
- **No retener si:** el valor de la factura es < $50 (excepción: honorarios siempre retener)
- **No retener a:** contribuyentes RISE (hasta 2023, RIMPE emprendedor desde 2024)
- **Siempre retener a:** contribuyentes especiales según tabla especial
- **Retención debe emitirse:** máximo 5 días hábiles después de registrar la factura

---

## 3. Retenciones de IVA

| Tipo de agente retenedor | % Retención IVA | Código |
|---|---|---|
| Contribuyente Especial → Persona Natural | 30% | 721 |
| Contribuyente Especial → Sociedad | 30% | 721 |
| Contribuyente Especial → Servicios | 70% | 723 |
| Contribuyente Especial → Liquidación compra | 100% | 725 |
| Sector público → Bienes | 30% | 721 |
| Sector público → Servicios | 70% | 723 |
| Sociedad → Servicios de PN (honorarios) | 100% | 725 |

**Regla clave:** Solo son agentes de retención de IVA: contribuyentes especiales, sector público, y sociedades en casos específicos (servicios de PN).

---

## 4. Facturación Electrónica

### Tipos de comprobantes electrónicos
| Código | Tipo | Uso |
|---|---|---|
| 01 | Factura | Venta de bienes/servicios |
| 04 | Nota de Crédito | Devoluciones, descuentos posteriores |
| 05 | Nota de Débito | Ajustes a facturas (intereses, diferencias) |
| 06 | Guía de Remisión | Transporte de mercadería |
| 07 | Comprobante de Retención | Retenciones en la fuente e IVA |
| 03 | Liquidación de Compras | Compras a PN sin RUC |

### Proceso de autorización SRI
```
1. Generar XML según esquema SRI v2.1
2. Firmar con certificado electrónico (TOKEN o archivo .p12)
3. Enviar a: https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
4. Verificar estado: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline
5. Estado respuestas: RECIBIDA, EN_PROCESO, AUTORIZADO, NO_AUTORIZADO
6. Si AUTORIZADO → guardar número autorización + fecha
7. Generar RIDE (PDF) con datos de autorización
8. Enviar RIDE al email del cliente
```

### Clave de acceso (49 dígitos)
```
fechaEmision(8) + tipoComprobante(2) + ruc(13) + ambiente(1) + serie(6) + secuencial(9) + codigoNumerico(8) + tipoEmision(1) + digitoVerificador(1)
```

### Validaciones obligatorias antes de emitir
```
□ RUC emisor activo y vigente en SRI
□ Establecimiento y punto de emisión autorizados
□ Secuencial correlativo sin saltos
□ RUC/cédula del receptor válido (verificar dígito verificador)
□ Fecha de emisión dentro del rango permitido (no más de 30 días atrás)
□ Totales cuadran: subtotal + IVA - descuentos = total
□ Forma de pago incluida
□ Certificado electrónico vigente
```

---

## 5. Declaraciones y formularios SRI

### Calendario de obligaciones (contribuyente general)

| Formulario | Concepto | Frecuencia | Vence según 9° dígito RUC |
|---|---|---|---|
| Form 104 | IVA | Mensual | Del 10 al 28 del mes siguiente |
| Form 103 | Retenciones en la fuente | Mensual | Del 10 al 28 del mes siguiente |
| Form 101 | Impuesto a la Renta sociedades | Anual | Abril (5 al 26) según 9° dígito |
| Form 102 | Impuesto a la Renta PN obligadas contabilidad | Anual | Mayo (10 al 28) |
| Form 102A | IR PN no obligadas contabilidad | Anual | Mayo |
| ATS | Anexo Transaccional Simplificado | Mensual | Junto con declaración de IVA |
| RDEP | Relación dependencia | Anual | Febrero |

### Vencimientos por 9° dígito RUC (días del mes siguiente)
```
1 → día 10    2 → día 12    3 → día 14    4 → día 16    5 → día 18
6 → día 20    7 → día 22    8 → día 24    9 → día 26    0 → día 28
```

### ATS — campos requeridos por comprobante
```
Compras: tipoComprobante, fechaRegistro, establecimiento, puntoEmision, secuencial,
         fechaEmision, RUC proveedor, tipoProveedorSRI, valorTotal, baseNoGravada,
         baseImponible0, baseImponibleGravada, montoIVA, montoICE, valorRetFuente,
         valorRetIVA, tipoRetFuente, codRetFuente, estabRetencion, ptoEmiRetencion, 
         secuencialRetencion, fechaEmisionRetencion

Ventas: tipoComprobante, tipoEmision, numeroComprobante, fechaEmision,
        tipoIdentificacionCliente, RUCcliente, razonSocialCliente,
        valorTotal, baseImponible0, baseImponibleGravada, montoIVA,
        valorRetFuente, valorRetIVA (cuando el cliente retiene)
```

---

## 6. RIMPE — Régimen MIPYMES 2024-2026

### RIMPE Negocio Popular (antes RISE)
- Ingresos anuales hasta $20.000
- Cuota mensual fija según tabla de ingresos (no declara IVA ni IR separado)
- No están obligados a emitir comprobantes electrónicos (pueden usar facturas preimpresas)
- **En el ERP:** marcar proveedor como RIMPE_negocio → NO generar retención

### RIMPE Emprendedor
- Ingresos entre $20.001 y $300.000 anuales
- Pagan tarifa flat de IR: 2% sobre ingresos brutos
- **Sí deben emitir comprobantes electrónicos**
- **En el ERP:** marcar como RIMPE_emprendedor → NO generar retención en fuente de IR

### Régimen General
- Ingresos > $300.000 o actividades excluidas de RIMPE
- Obligados contabilidad si ingresos > $100.000 o activos > $180.000 o empleados > 10
- **En el ERP:** aplican todas las retenciones según tabla

---

## 7. Impuesto a la Renta

### Tarifa sociedades 2025-2026
- **25%** tarifa general
- **28%** si la sociedad tiene accionistas en paraísos fiscales o regímenes privilegiados
- **Anticipo IR:** max(50% IR causado año anterior - retenciones, 0.2% patrimonio + 0.2% costos + 0.4% activos + 0.4% ingresos)

### Tabla IR personas naturales 2025
| Fracción básica | Exceso hasta | Impuesto fracción básica | % fracción excedente |
|---|---|---|---|
| 0 | 11.722 | 0 | 0% |
| 11.722 | 14.930 | 0 | 5% |
| 14.930 | 19.384 | 160 | 10% |
| 19.384 | 25.766 | 606 | 12% |
| 25.766 | 33.736 | 1.372 | 15% |
| 33.736 | 44.721 | 2.567 | 20% |
| 44.721 | 59.537 | 4.764 | 25% |
| 59.537 | 79.388 | 8.467 | 30% |
| 79.388 | en adelante | 14.422 | 35% |

---

## 8. Comprobantes de venta válidos en Ecuador

| Comprobante | Emite | Sustenta gasto | Sustenta crédito IVA |
|---|---|---|---|
| Factura | Contribuyentes con RUC | Sí | Sí |
| Nota de venta (RISE/RIMPE NP) | RIMPE Negocio Popular | Sí (hasta límite) | No |
| Liquidación de compras | Quien compra a PN sin RUC | Sí | Sí |
| Tiquete de máquina registradora | Solo consumidor final | No (>$200 sí) | No |
| Nota de crédito | Vendedor original | Ajusta factura | Ajusta IVA |
| Comprobante de retención | Agente de retención | N/A | N/A |