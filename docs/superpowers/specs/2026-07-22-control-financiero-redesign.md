# Control Financiero — Rediseño Integral

**Date:** 2026-07-22
**Status:** Design spec (pre-implementation)
**Approach:** Rebuild completo desde cero. 11 submódulos, uno por fase.

---

## 1. Objetivo

Rehacer el módulo financiero del ERP con trazabilidad completa, abonos parciales, amortización de préstamos, tracking de tarjetas, conciliación bancaria, forecast de caja, integración automática con Ventas/Compras/Inventario, y reportería especializada.

**Regla de oro:** Cada submódulo debe tener filtros, búsqueda, estados, acciones, totales, subtotales, exportación, trazabilidad y vínculo con el documento origen.

---

## 2. Arquitectura General

### 2.1 Firebase Collections (nuevas + migradas)

| Colección | Propósito | Creada en fase |
|-----------|-----------|----------------|
| `fin_movimientos` | Registro central de todo ingreso/egreso. Maestra. | 1 |
| `fin_cxc` | Cuentas por cobrar: facturas de venta a crédito, abonos, saldos. | 2 |
| `fin_cxp` | Cuentas por pagar: facturas de compra a crédito, abonos, retenciones. | 3 |
| `fin_bancos` | Cuentas bancarias y de caja, saldos, movimientos. | 4 |
| `fin_tarjetas` | Tarjetas de crédito corporativas, consumos, pagos, diferidos. | 5 |
| `fin_prestamos` | Préstamos bancarios, tabla de amortización, cuotas, pagos. | 6 |
| `fin_plan_cuentas` | Plan de cuentas contable (catálogo). | 9 |
| `fin_asientos` | Asientos contables automáticos y manuales. | 9 |
| `fin_auditoria` | Log de toda operación (quién, qué, cuándo, desde dónde). | 1 |

### 2.2 Componentes (un archivo por submódulo)

```
src/components/finances/
  MovimientosView.jsx       # Fase 1
  CuentasPorCobrarView.jsx  # Fase 2
  CuentasPorPagarView.jsx   # Fase 3
  BancosCajaView.jsx        # Fase 4
  TarjetasCreditosView.jsx  # Fase 5
  PrestamosView.jsx         # Fase 6
  CapturaInteligenteView.jsx # Fase 7
  ResumenFinancieroView.jsx # Fase 8
  ContabilidadView.jsx      # Fase 9
  ImpuestosSriView.jsx      # Fase 10
  ReportesView.jsx          # Fase 11
  FinanceModule.jsx         # Router/controlador (rehecho)
```

### 2.3 FinanceModule.jsx (nuevo router)

El `FinanceModule` nuevo tendrá estado `activeTab` y renderizará el componente correspondiente. Sin lógica de negocio, solo enrutamiento.

**Tabs:**
```
movimientos | cxc | cxp | bancos | tarjetas | prestamos | captura | resumen | contabilidad | impuestos | reportes
```

### 2.4 Integración con Ventas y Compras

- Toda factura de venta (`ingreso`, `factura`) → crea automáticamente entrada en `fin_cxc` si método de pago no es contado completo.
- Toda factura de compra (`egreso`, `factura`) → crea automáticamente entrada en `fin_cxp` si método de pago no es contado completo.
- Compra con tarjeta de crédito → entrada en `fin_tarjetas`, no en `fin_cxp`.
- Todo cobro/abono/pago → actualiza `fin_movimientos` + `fin_cxc`/`fin_cxp` + `fin_auditoria`.

---

## 3. Fase 1: Movimientos Financieros

### 3.1 Propósito

Registro central de todo ingreso y egreso. Es el corazón del sistema. Todo lo demás se alimenta de aquí o alimenta aquí.

### 3.2 Colección: `fin_movimientos`

```
fin_movimientos/{id}
  tipo: 'ingreso' | 'egreso'
  fecha: timestamp
  fechaVencimiento: timestamp | null
  monto: number
  saldoPendiente: number  // Para seguimiento de abonos
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito' | 'cheque' | 'cruce_cuentas' | 'prestamo_bancario' | 'otro'
  documento: {
    tipo: 'factura' | 'nota_venta' | 'nota_credito' | 'nota_debito' | 'retencion' | 'liquidacion' | 'gasto' | 'ingreso_vario' | 'gasto_hormiga'
    numero: string
    claveAcceso: string | null
    urlXml: string | null
    urlPdf: string | null
  }
  tercero: {
    id: string
    nombre: string
    ruc: string
  }
  partidas: [  // Desglose (al menos 1)
    {
      cuenta: string           // ID de cuenta contable
      centroCosto: string | null
      proyecto: string | null
      categoria: string        // 'gastos_administrativos' | 'costos' | 'marketing' | 'activos' | 'impuestos' | 'nomina' | 'otro'
      descripcion: string
      baseImponible: number
      iva: number
      ice: number
      irbpnr: number
      retencionFuente: number
      retencionIva: number
      total: number
      deducible: boolean
    }
  ]
  pagos: [  // Historial de abonos
    {
      id: string
      fecha: timestamp
      monto: number
      metodoPago: string
      referencia: string
      registradoPor: string  // uid del usuario
    }
  ]
  estado: 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  sriStatus: 'no_aplica' | 'pendiente_envio' | 'autorizado' | 'rechazado' | 'devuelta' | 'anulado'
  origen: 'ventas' | 'compras' | 'finanzas' | 'captura_inteligente' | 'sri'
  origenId: string | null  // ID del documento en Ventas/Compras que originó este movimiento
  archivos: [{ name: string, url: string, type: string }]
  notas: string
  creadoPor: string
  creadoEn: timestamp
  actualizadoEn: timestamp
  auditLog: [{ accion: string, usuario: string, fecha: timestamp, cambios: object }]
```

### 3.3 Estados UI

| Estado | Comportamiento |
|--------|---------------|
| **Carga** | Skeleton rows en tabla, spinner en KPI cards |
| **Vacío** | Ilustración + "No hay movimientos registrados. Crea el primer ingreso o gasto." + botón "Nuevo Movimiento" |
| **Error** | Banner con mensaje + botón "Reintentar" |
| **Éxito** | Toast de confirmación después de crear/editar/eliminar |

### 3.4 Filtros

- Rango de fechas (desde/hasta con datepicker)
- Mes/Año (atajos: Este mes, Mes anterior, Este año)
- Tipo (ingreso/egreso/todos)
- Estado (pendiente/parcial/pagado/anulado/todos)
- Método de pago
- Tercero (búsqueda con autocompletar)
- Categoría
- Centro de costo
- Proyecto
- SRI Status
- Origen (ventas/compras/finanzas/captura_inteligente/sri)
- Búsqueda por número de documento o descripción

### 3.5 Columnas de la tabla

| Columna | Descripción |
|---------|-------------|
| Fecha | DD/MM/YYYY |
| Tipo | Badge: Ingreso (verde) / Egreso (rojo) |
| Documento | Tipo + número |
| Tercero | Nombre + RUC |
| Descripción | Primera línea de la partida |
| Categoría | Badge |
| Método de pago | Icono + texto |
| Monto | $ formateado |
| Saldo pendiente | $ (si estado != pagado) |
| Estado | Badge de estado |
| SRI | Badge SRI |
| Acciones | Editar, Ver, Eliminar, Abonar |

### 3.6 Totales

- **Total ingresos** del período filtrado
- **Total egresos** del período filtrado
- **Saldo neto** (ingresos - egresos)
- **Conteo** de movimientos

### 3.7 Acciones por fila

- **Editar**: Abre modal/formulario de edición
- **Ver detalle**: Modal con todas las partidas, pagos, auditoría
- **Eliminar**: Confirmación + soft delete (marcar anulado, no borrar)
- **Abonar**: Si estado = pendiente o parcial, abre modal de abono
- **Ver documento**: Abre PDF/XML si existe

### 3.8 Exportación

- CSV con todas las columnas visibles + partidas
- PDF con resumen del período

### 3.9 Reglas de negocio

- No se puede eliminar físicamente un movimiento. Solo anular.
- Si el movimiento viene de Ventas/Compras, no se puede editar tipo/documento/monto (solo abonar).
- Cada abono parcial actualiza `saldoPendiente` y `estado`.
- Todo cambio queda registrado en `auditLog`.

---

## 4. Fase 2: Cuentas por Cobrar (CxC)

### 4.1 Propósito

Seguimiento de facturas de venta a crédito. Cada factura de venta que no se cobre al contado genera automáticamente una entrada aquí.

### 4.2 Colección: `fin_cxc`

```
fin_cxc/{id}
  movimientoId: string       // FK → fin_movimientos
  tercero: { id, nombre, ruc }
  factura: {
    tipo: string
    numero: string
    claveAcceso: string | null
    fecha: timestamp
    fechaVencimiento: timestamp
    montoTotal: number
    iva: number
  }
  abonos: [{
    id: string
    fecha: timestamp
    monto: number
    metodoPago: string
    referencia: string
    movimientoId: string     // FK → fin_movimientos (el abono es un movimiento de tipo ingreso)
  }]
  saldoPendiente: number
  estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | 'anulado'
  diasVencido: number        // Calculado
  notas: string
  creadoEn: timestamp
  actualizadoEn: timestamp
  auditLog: [...]
```

### 4.3 Integración automática

Cuando se crea una factura de venta en el módulo de Ventas con método de pago ≠ efectivo/contado completo:
1. Se crea entrada en `fin_movimientos` (tipo=ingreso, estado=pendiente)
2. Se crea entrada en `fin_cxc` con `movimientoId` apuntando a #1
3. Se registra en `fin_auditoria`

### 4.4 Filtros

- Rango de fechas, mes, año
- Estado (pendiente/parcial/pagado/vencido/anulado)
- Tercero (cliente)
- Antigüedad (0-30, 31-60, 61-90, +90 días) — bucket selector

### 4.5 Columnas

Fecha factura | Vencimiento | Cliente | Documento | Monto total | Abonado | Saldo pendiente | Días vencido | Estado | Acciones

### 4.6 Totales

- **Total cartera**: suma de saldos pendientes
- **Cartera vencida**: suma de saldos con días vencido > 0
- **Total facturado**: suma de montos totales
- **Total abonado**: suma de abonos en el período
- **Conteo** de facturas por estado

### 4.7 Reportes rápidos

- Aging 0-30 / 31-60 / 61-90 / +90 días con totales por bucket
- Top 5 clientes por saldo pendiente
- Cobros del período (abonos en rango de fechas)

---

## 5. Fase 3: Cuentas por Pagar (CxP)

### 5.1 Propósito

Seguimiento de facturas de compra a crédito. Toda factura de compra que no se pague al contado genera automáticamente una entrada aquí.

### 5.2 Colección: `fin_cxp`

```
fin_cxp/{id}
  movimientoId: string       // FK → fin_movimientos
  tercero: { id, nombre, ruc }
  factura: {
    tipo: string
    numero: string
    claveAcceso: string | null
    fecha: timestamp
    fechaVencimiento: timestamp
    montoTotal: number
    baseImponible: number
    iva: number
    retencionFuente: number
    retencionIva: number
  }
  abonos: [{
    id: string
    fecha: timestamp
    monto: number
    metodoPago: string
    referencia: string
    movimientoId: string     // FK → fin_movimientos (el abono es un movimiento de tipo egreso)
  }]
  saldoPendiente: number
  estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | 'anulado'
  diasVencido: number
  notas: string
  creadoEn: timestamp
  actualizadoEn: timestamp
  auditLog: [...]
```

### 5.3 Integración automática

Cuando se crea una factura de compra en Compras con método de pago ≠ efectivo/contado completo:
1. Se crea entrada en `fin_movimientos` (tipo=egreso, estado=pendiente)
2. Se crea entrada en `fin_cxp` con `movimientoId` apuntando a #1
3. Se registra retención si aplica
4. Se registra en `fin_auditoria`

### 5.4 Similar a CxC pero con columnas extra para retenciones

Retención fuente | Retención IVA | Base imponible

### 5.5 Totales

- Total obligaciones: suma de saldos pendientes
- Obligaciones vencidas
- Retenciones por pagar
- Total pagado en el período

### 5.6 Reportes rápidos

- Aging por proveedor (0-30/31-60/61-90/+90)
- Top 5 proveedores por saldo
- Pagos del período
- Retenciones aplicadas por período

---

## 6. Fase 4: Bancos y Caja

### 6.1 Propósito

Gestión de cuentas bancarias y caja chica. Conciliación de movimientos. Saldos reales vs contables.

### 6.2 Colección: `fin_bancos`

```
fin_bancos/{id}
  nombre: string              // 'Banco Pichincha Cta. Cte. #123'
  tipo: 'banco' | 'caja' | 'inversion' | 'otro'
  entidad: string             // Nombre del banco
  numeroCuenta: string
  moneda: 'USD'
  saldoInicial: number
  saldoActual: number         // Calculado de movimientos conciliados
  saldoPendiente: number      // Movimientos aún no conciliados
  estado: 'activo' | 'inactivo' | 'cerrado'
  movimientos: [{             // Subcolección lógica
    id: string
    fecha: timestamp
    descripcion: string
    referencia: string
    monto: number
    tipo: 'debito' | 'credito'
    conciliado: boolean
    movimientoId: string | null  // FK → fin_movimientos si fue generado desde el ERP
    conciliadoPor: string | null
    conciliadoEn: timestamp | null
  }]
  creadoEn: timestamp
  actualizadoEn: timestamp
```

### 6.3 Funcionalidades clave

- CRUD de cuentas bancarias y cajas
- Registro manual de movimientos bancarios (débitos/créditos)
- Conciliación: match automático por monto, fecha, referencia
- Propuesta de coincidencias con nivel de confianza
- Arqueo de caja: apertura, cierre, diferencia
- Saldo actual = saldo inicial + créditos - débitos conciliados

### 6.4 Filtros

- Cuenta, rango de fechas, tipo (débito/crédito), conciliado/pendiente

### 6.5 Columnas

Fecha | Descripción | Referencia | Débito | Crédito | Conciliado | Acciones

---

## 7. Fase 5: Tarjetas y Créditos

### 7.1 Propósito

Control de tarjetas de crédito corporativas y líneas de crédito. Tracking de consumos, fechas de corte/pago, diferidos, cupos.

### 7.2 Colección: `fin_tarjetas`

```
fin_tarjetas/{id}
  nombre: string              // 'Visa Banco Pichincha'
  emisor: string              // 'Banco Pichincha'
  numeroAlias: string         // Últimos 4 dígitos o alias
  tipo: 'visa' | 'mastercard' | 'amex' | 'diners' | 'credito_empresarial'
  cupoTotal: number
  saldoUtilizado: number      // Calculado
  saldoDisponible: number     // Calculado: cupoTotal - saldoUtilizado
  fechaCorte: number          // Día del mes (1-31)
  fechaPago: number           // Día del mes (1-31)
  tasaInteres: number         // % anual
  pagoMinimo: number          // % o monto fijo
  cuentaBancariaId: string    // FK → fin_bancos
  estado: 'activo' | 'bloqueado' | 'cancelado'
  consumos: [{
    id: string
    fecha: timestamp
    descripcion: string
    establecimiento: string
    monto: number
    moneda: 'USD'
    cuotas: number            // 1 = contado, >1 = diferido
    cuotasRestantes: number
    categoria: 'gasto_operativo' | 'compra_inventario' | 'gasto_personal' | 'no_deducible' | 'anticipo' | 'otro'
    movimientoId: string | null  // FK → fin_movimientos
    respaldoUrl: string | null
    clasificado: boolean
  }]
  pagos: [{
    id: string
    fecha: timestamp
    monto: number
    referencia: string
    movimientoId: string      // FK → fin_movimientos
  }]
  corteActual: {
    fechaInicio: timestamp
    fechaFin: timestamp
    fechaPago: timestamp
    totalConsumos: number
    pagoMinimo: number
    pagoTotal: number
    pagado: boolean
  }
  creadoEn: timestamp
  actualizadoEn: timestamp
  auditLog: [...]
```

### 7.3 Columnas

Tarjeta | Emisor | Cupo total | Saldo usado | Disponible | Corte | Pago | Estado | Acciones

Vista detalle:
- Consumos del período actual con clasificación
- Consumos diferidos (cuotas pendientes)
- Historial de pagos
- Próximas cuotas

### 7.4 Reglas

- Al registrar un consumo con tarjeta, si es diferido (>1 cuota), se crean entradas programadas para cada cuota.
- Cada pago a la tarjeta actualiza `saldoUtilizado` y `saldoDisponible`.
- Alerta cuando saldo disponible < 20% del cupo.
- Alerta cuando fecha de pago se acerca (< 5 días).

---

## 8. Fase 6: Obligaciones Financieras / Préstamos

### 8.1 Propósito

Control de préstamos bancarios empresariales. Amortización automática, seguimiento de cuotas, pagos parciales, intereses.

### 8.2 Colección: `fin_prestamos`

```
fin_prestamos/{id}
  entidad: string             // 'Banco Pichincha'
  numeroContrato: string
  fechaDesembolso: timestamp
  montoDesembolsado: number
  tasaInteres: number         // % anual
  plazoMeses: number
  numeroCuotas: number
  periodicidad: 'mensual' | 'quincenal' | 'trimestral'
  metodoAmortizacion: 'frances' | 'aleman' | 'americano'
  cuentaBancariaId: string    // FK → fin_bancos
  observaciones: string
  archivos: [{ name, url, type }]
  estado: 'vigente' | 'cancelado' | 'mora'
  cuotas: [{
    numero: number
    fechaVencimiento: timestamp
    valorTotal: number
    capital: number
    interes: number
    saldoPendiente: number
    estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido'
    pagos: [{
      id: string
      fecha: timestamp
      monto: number
      capitalAplicado: number
      interesAplicado: number
      metodoPago: string
      referencia: string
      movimientoId: string    // FK → fin_movimientos
    }]
  }]
  saldoPendienteTotal: number // Suma de saldoPendiente de todas las cuotas
  capitalPagado: number
  interesPagado: number
  creadoEn: timestamp
  actualizadoEn: timestamp
  auditLog: [...]
```

### 8.3 Tabla de amortización

Al crear un préstamo, el sistema genera automáticamente el array `cuotas` usando:

- **Método Francés** (cuota fija): `cuota = monto * (i * (1+i)^n) / ((1+i)^n - 1)` donde i = tasa mensual, n = número de cuotas
- **Método Alemán** (capital fijo): `capital_cuota = monto / n`, interés = saldo pendiente * i (decreciente cada cuota)
- **Método Americano** (interés fijo, capital al final): interés = monto * i cada período, capital = 0 hasta última cuota donde capital = monto total

### 8.4 Columnas

Entidad | Contrato | Monto | Tasa | Cuotas | Saldo pendiente | Capital pagado | Interés pagado | Estado | Acciones

Vista detalle:
- Tabla de amortización completa (todas las cuotas con estado y saldo)
- Próximas cuotas a vencer
- Cuotas vencidas (rojo)
- Historial de pagos por cuota

### 8.5 Reglas

- Pago parcial de cuota: se aplica primero a interés, luego a capital.
- Pago total de cuota: se marca como pagada.
- Pago anticipado: reduce saldo de cuotas futuras.
- Cada pago genera movimiento en `fin_movimientos` (tipo=egreso).

---

## 9. Fase 7: Captura Inteligente

### 9.1 Propósito

Subir foto, PDF o XML de un comprobante. IA extrae campos, detecta duplicados, clasifica y sugiere registro. Si el documento ya existe en Ventas/Compras, lo vincula en vez de duplicarlo.

### 9.2 Funcionalidades

- **Upload**: Drag & drop o selector de archivos (PDF, JPG, PNG, XML)
- **OCR**: Gemini extrae fecha, monto, tercero, RUC, tipo, IVA, retención
- **Detección de duplicados**: Por número de documento + RUC + fecha ±3 días
- **Vinculación automática**: Si coincide con factura de Ventas/Compras → vincular, no duplicar
- **Previsualización**: Muestra campos extraídos con nivel de confianza (Alto/Medio/Bajo)
- **Corrección manual**: Campos editables antes de confirmar
- **Confirmación**: Crea entrada en `fin_movimientos` con `origen: 'captura_inteligente'`

### 9.3 Estados

| Estado | UI |
|--------|-----|
| Sin archivo | Área de drop + botón |
| Analizando | Spinner + "Analizando comprobante..." |
| Resultado | Campos extraídos con badges de confianza |
| Duplicado detectado | Banner amarillo + link al documento original |
| Error | "No se pudo analizar. Intenta con otra imagen o ingresa manualmente." |
| Confirmado | Toast + redirección al movimiento creado |

---

## 10. Fase 8: Resumen Financiero / Dashboard

### 10.1 Propósito

Panel de control con KPIs, flujo de caja, forecast, alertas y accesos rápidos.

### 10.2 Componentes del dashboard

- **KPIs principales**: Ingresos del mes, Egresos del mes, Saldo neto, CxC pendiente, CxP pendiente, Deuda total
- **Flujo de caja semanal**: Gráfico de barras con entradas/salidas/saldo
- **Forecast 4 semanas**: Proyección usando CxC (cobros esperados), CxP (pagos programados), préstamos (cuotas), gastos recurrentes
- **Alertas**: Facturas vencidas CxC, Facturas por vencer CxP, Cuotas de préstamo próximas, Cortes de tarjeta próximos, Saldo bajo en bancos
- **Gráfico de composición**: Egresos por categoría (pastel)
- **Aging resumido**: CxC y CxP por buckets

### 10.3 Forecast (proyección de caja)

Escenarios: **Conservador** (60% cobros esperados), **Esperado** (85%), **Agresivo** (100%).

Cálculo semanal:
```
Saldo inicial + Cobros CxC esperados - Pagos CxP programados - Cuotas préstamos - Gastos recurrentes estimados = Saldo proyectado
```

---

## 11. Fase 9: Contabilidad

### 11.1 Propósito

Plan de cuentas, asientos contables automáticos desde movimientos, libro diario.

### 11.2 Colección: `fin_plan_cuentas`

```
fin_plan_cuentas/{id}
  codigo: string           // '1.1.01'
  nombre: string           // 'Caja General'
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto' | 'costo'
  nivel: number            // 1, 2, 3, 4 (jerarquía)
  padreId: string | null
  aceptaMovimientos: boolean
  estado: 'activo' | 'inactivo'
```

### 11.3 Colección: `fin_asientos`

```
fin_asientos/{id}
  fecha: timestamp
  descripcion: string
  lineas: [{
    cuentaId: string
    debe: number
    haber: number
    descripcion: string
    centroCostoId: string | null
    proyectoId: string | null
  }]
  origen: 'manual' | 'movimiento' | 'cxc' | 'cxp' | 'prestamo' | 'tarjeta' | 'bancos'
  origenId: string | null
  estado: 'borrador' | 'definitivo' | 'anulado'
  creadoPor: string
  creadoEn: timestamp
```

### 11.4 Reglas

- Cada creación de movimiento en `fin_movimientos` genera asiento contable automático.
- Partida doble: suma de débitos = suma de haberes.
- Asientos en borrador pueden editarse. En definitivo solo anularse.

---

## 12. Fase 10: Impuestos y SRI

### 12.1 Propósito

Cálculo de IVA, retenciones, generación de ATS, anexos, estado de documentos electrónicos.

### 12.2 Funcionalidades

- **IVA**: Resumen de IVA ventas vs IVA compras (crédito fiscal). Por período mensual.
- **Retenciones**: Retenciones en la fuente emitidas y recibidas. Por período.
- **ATS**: Generación del Anexo Transaccional Simplificado en XML.
- **Documentos electrónicos**: Estado de cada comprobante (autorizado/pendiente/rechazado/anulado).
- **Alertas**: Documentos por vencer, certificado digital próximo a caducar, documentos rechazados sin corregir.

### 12.3 Columnas

Concepto | Base imponible | IVA | Ret. Fuente | Ret. IVA | Período | Estado

---

## 13. Fase 11: Reportes Especializados

### 13.1 Propósito

Reportes avanzados con filtros, agrupación, visualización y exportación.

### 13.2 Catálogo de reportes

| Reporte | Datos de origen | Visualización |
|---------|----------------|---------------|
| Aging CxC | `fin_cxc` | Tabla con buckets 0-30/31-60/61-90/+90, totales por bucket |
| Aging CxP | `fin_cxp` | Igual que CxC |
| Flujo de caja | `fin_movimientos` + `fin_bancos` | Tabla semanal + gráfico de barras |
| Cartera vencida | `fin_cxc` | Tabla con días vencido, semáforo de riesgo |
| Obligaciones por vencer | `fin_cxp` | Tabla con próximos 30 días |
| Cronograma préstamos | `fin_prestamos` | Tabla de amortización completa + resumen |
| Consumos tarjeta | `fin_tarjetas` | Por período, por categoría, diferidos pendientes |
| Gastos hormiga | `fin_movimientos` | Agrupado por día/semana/mes, por categoría |
| Rentabilidad por cliente | `fin_cxc` + `fin_movimientos` | Margen por cliente |
| Presupuesto vs Real | `fin_movimientos` + presupuestos | Comparativa mensual |
| Auditoría de cambios | `fin_auditoria` | Tabla con usuario, acción, fecha, cambios |
| Conciliación bancaria | `fin_bancos` | Partidas conciliadas vs pendientes |

### 13.3 Controles comunes

- Rango de fechas
- Agrupación (día/semana/mes/año)
- Filtro por submódulo origen
- Exportación: CSV y PDF

---

## 14. Colección de Auditoría: `fin_auditoria`

Cada operación de escritura en cualquier colección financiera registra:

```
fin_auditoria/{id}
  coleccion: string          // 'fin_movimientos' | 'fin_cxc' | ...
  documentoId: string
  accion: 'crear' | 'editar' | 'anular' | 'abonar' | 'conciliar' | 'pagar' | 'eliminar'
  usuario: string            // uid
  usuarioEmail: string
  fecha: timestamp
  cambios: { antes: object | null, despues: object | null }
  modulo: string             // 'ventas' | 'compras' | 'finanzas' | ...
  ip: string | null
```

---

## 15. Reglas transversales (todos los submódulos)

1. **Zero shadows** — Flat Modern Design, solo bordes.
2. **Token-first** — Usar clases Tailwind mapeadas en `@theme`.
3. **Radius**: 6px cards, 6px buttons, 4px badges.
4. **Estados UI obligatorios**: skeleton (carga), empty state, error con retry, toast de éxito.
5. **Filtros persistentes**: guardar en localStorage por submódulo.
6. **Exportación**: CSV siempre disponible. PDF en reportes.
7. **Soft delete**: nunca borrar físicamente. Marcar como anulado.
8. **Auditoría**: todo cambio registrado en `fin_auditoria`.
9. **Mobile**: tablas responsive (ocultar columnas auxiliares en <640px).
10. **Sin dark mode**: solo modo claro.

---

## 16. Plan de Implementación (orden de fases)

| Fase | Submódulo | Estimado | Depende de |
|------|-----------|----------|------------|
| 1 | Movimientos Financieros | ~1500 líneas | Nada |
| 2 | Cuentas por Cobrar | ~800 líneas | Fase 1 |
| 3 | Cuentas por Pagar | ~800 líneas | Fase 1 |
| 4 | Bancos y Caja | ~700 líneas | Fase 1 |
| 5 | Tarjetas y Créditos | ~900 líneas | Fase 1, 4 |
| 6 | Préstamos | ~1000 líneas | Fase 1, 4 |
| 7 | Captura Inteligente | ~500 líneas | Fase 1 |
| 8 | Resumen Financiero | ~600 líneas | Fase 1-6 |
| 9 | Contabilidad | ~800 líneas | Fase 1 |
| 10 | Impuestos y SRI | ~700 líneas | Fase 1-3 |
| 11 | Reportes | ~800 líneas | Fase 1-6 |

---

## 17. Eliminación de código existente

Antes de iniciar la Fase 1, se eliminarán los siguientes archivos y colecciones:

### Archivos a eliminar:
```
src/components/finances/FinanceModule.jsx       (rehecho como nuevo router)
src/components/finances/FinanceDashboard.jsx    (reemplazado por ResumenFinancieroView)
src/components/finances/AccountsReceivablePayable.jsx  (reemplazado por CxC/CxP nuevos)
src/components/finances/GastosCreditosModule.jsx       (reemplazado por Tarjetas + Préstamos)
src/components/finances/ComprasGastosView.jsx          (reemplazado por CapturaInteligente)
src/components/finances/ReportsView.jsx                (reemplazado por Reportes nuevos)
src/components/finances/SalesDashboard.jsx             (absorbido por Resumen)
src/components/finances/FinanceChat.jsx                (absorbido por CapturaInteligente)
src/components/finances/FinanceSettings.jsx            (rehecho o absorbido)
src/components/finances/ProductsView.jsx               (se mantiene si aún se usa)
src/components/finances/ThirdPartiesView.jsx           (se mantiene, es de Personas)
src/components/finances/DiscountsPromotionsView.jsx    (se mantiene)
src/components/finances/PosView.jsx                    (se mantiene, es POS)
src/components/finances/TransactionForm.jsx            (reemplazado por formulario en MovimientosView)
src/components/finances/TransactionsView.jsx           (reemplazado por MovimientosView)
src/components/finances/PurchaseForm.jsx               (reemplazado por formulario en MovimientosView)
src/components/finances/ComprasSriView.jsx             (absorbido en ImpuestosSriView)
src/components/finances/QuotesView.jsx                 (se mantiene)
src/components/finances/RidePreviewModal.jsx           (se mantiene, es RIDE)
```

### Colecciones Firebase a eliminar/migrar:
- `finances_transactions` → migrar datos a `fin_movimientos` (nueva estructura)
- `finances_liabilities` → migrar a `fin_prestamos` y `fin_tarjetas`
- `finances_sri_compras` → absorber en `fin_movimientos` con `origen: 'sri'`
- `finances_third_parties` → mantener (es Personas)
- `finances_products` → mantener (es legacy, posible migrar a inventory_products)
- `finances_settings/config` → mantener (configuración SRI)
- `finances_discounts` → mantener
- `finances_promotions` → mantener
- `finances_quotes` → mantener
- `finances_cash_sessions` → mantener (POS)
