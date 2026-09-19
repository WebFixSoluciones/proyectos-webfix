# Rediseño Integral de Finanzas, Estandarización de Encabezados y Flujo ERP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la estandarización visual de encabezados en las 11 pantallas de finanzas, conectar la tesorería real con cuentas bancarias (`fin_bancos`) en Ventas, POS, Compras, CxC y CxP, y estructurar el flujo integral de líneas de crédito, anticipos y autorizaciones administrativas.

**Architecture:** Se creará un componente reutilizable de encabezado (`FinancialPageHeader`) para las 11 vistas. Se integrará la selección y actualización en tiempo real de cuentas bancarias de `fin_bancos` en los formularios de ventas (`TransactionForm`), punto de venta (`PosView`), compras (`PurchaseForm`) y recaudaciones (`CuentasPorCobrarView` / `CuentasPorPagarView`). Se renovará la vista de clientes en `ThirdPartiesView` a pantalla completa con gestión formal de crédito, integrando alertas de autorización en POS y apertura en caliente en ventas.

**Tech Stack:** React 19, Tailwind CSS 4, Radix Themes UI (`@radix-ui/themes`), Lucide React, Firebase Firestore.

---

### File Map:

#### New Files:
- `src/components/finances/FinancialPageHeader.jsx`: Componente de cabecera visual unificada para los submódulos financieros.
- `src/components/finances/FinancialPaymentModal.jsx`: Modal formal de recaudación (cobro CxC) y pago (proveedores CxP) con selección de Banco/Caja.
- `src/components/finances/CreditSetupModal.jsx`: Modal profesional para apertura y configuración de línea de crédito en caliente.
- `src/components/finances/CustomerDetailView.jsx`: Vista de pantalla completa para creación y edición de clientes con sección especializada de crédito.

#### Modified Files:
- `src/components/finances/ResumenFinancieroView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/MovimientosView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/CuentasPorCobrarView.jsx`: Integración de `FinancialPageHeader` y `FinancialPaymentModal`.
- `src/components/finances/CuentasPorPagarView.jsx`: Integración de `FinancialPageHeader` y `FinancialPaymentModal`.
- `src/components/finances/BancosCajaView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/TarjetasCreditosView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/PrestamosView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/CapturaInteligenteView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/ContabilidadView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/ImpuestosSriView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/ReportesView.jsx`: Integración de `FinancialPageHeader`.
- `src/components/finances/TransactionForm.jsx`: Selector de cuenta bancaria en transferencias, pagos mixtos (anticipo + crédito) y apertura de crédito en caliente.
- `src/components/finances/PosView.jsx`: Selector de cuenta bancaria en transferencias y botón de solicitud de autorización de crédito en caja.
- `src/components/finances/PurchaseForm.jsx`: Selector de cuenta bancaria o caja chica de salida en compras de contado.
- `src/services/integracionFinanzasService.js`: Sincronización automática de movimientos bancarios y afectación de saldos en `fin_bancos`.
- `src/components/finances/ThirdPartiesView.jsx`: Integración de la vista completa de cliente con parámetros de crédito.

---

### Task 1: Componente `FinancialPageHeader` y Estandarización de las 11 Pantallas

**Files:**
- Create: `src/components/finances/FinancialPageHeader.jsx`
- Modify: `src/components/finances/ResumenFinancieroView.jsx`
- Modify: `src/components/finances/MovimientosView.jsx`
- Modify: `src/components/finances/CuentasPorCobrarView.jsx`
- Modify: `src/components/finances/CuentasPorPagarView.jsx`
- Modify: `src/components/finances/BancosCajaView.jsx`
- Modify: `src/components/finances/TarjetasCreditosView.jsx`
- Modify: `src/components/finances/PrestamosView.jsx`
- Modify: `src/components/finances/CapturaInteligenteView.jsx`
- Modify: `src/components/finances/ContabilidadView.jsx`
- Modify: `src/components/finances/ImpuestosSriView.jsx`
- Modify: `src/components/finances/ReportesView.jsx`

- [ ] **Step 1: Crear el componente `FinancialPageHeader.jsx`**
  Implementar el componente con props `icon`, `title`, `description`, `badge`, `badgeColor` y `actions`.
- [ ] **Step 2: Aplicar `FinancialPageHeader` en las pantallas 1 a 5**
  Actualizar `ResumenFinancieroView`, `MovimientosView`, `CuentasPorCobrarView`, `CuentasPorPagarView` y `BancosCajaView`.
- [ ] **Step 3: Aplicar `FinancialPageHeader` en las pantallas 6 a 11**
  Actualizar `TarjetasCreditosView`, `PrestamosView`, `CapturaInteligenteView`, `ContabilidadView`, `ImpuestosSriView` y `ReportesView`.
- [ ] **Step 4: Verificar visualmente y compilar**
  Ejecutar `npm run build` para comprobar que no existan errores de sintaxis o imports en las 11 vistas.
- [ ] **Step 5: Commit**
  `git commit -m "feat(finances): crear FinancialPageHeader y estandarizar encabezados en los 11 submodulos"`

---

### Task 2: Servicio de Sincronización Bancaria (`fin_bancos` y `fin_movimientos_bancarios`)

**Files:**
- Modify: `src/services/bancosService.js`
- Modify: `src/services/integracionFinanzasService.js`
- Modify: `src/services/financialTransactions.js`

- [ ] **Step 1: Crear función helper en `bancosService.js`**
  Agregar `registrarOperacionBancariaDirecta(db, { cuentaId, tipo, monto, descripcion, referencia, movimientoId, pagoId, usuario })` para acreditar o debitar `fin_bancos` y registrar `fin_movimientos_bancarios`.
- [ ] **Step 2: Conectar `sincronizarDocumento` en `integracionFinanzasService.js`**
  Cuando la venta o compra sea pagada mediante `transferencia` o `efectivo` y contenga `cuentaBancariaId`, invocar la afectación bancaria atómica.
- [ ] **Step 3: Ejecutar pruebas unitarias de servicios financieros**
  Ejecutar `npm test` para garantizar que la lógica de cálculo y persistencia sea válida.
- [ ] **Step 4: Commit**
  `git commit -m "feat(finances): soporte para sincronizacion automatica con fin_bancos en ventas y compras"`

---

### Task 3: Selector de Cuentas Bancarias en Ventas Administrativas (`TransactionForm`) y POS (`PosView`)

**Files:**
- Modify: `src/components/finances/TransactionForm.jsx`
- Modify: `src/components/finances/PosView.jsx`

- [ ] **Step 1: Cargar cuentas bancarias activas en `TransactionForm.jsx`**
  Suscribir o consultar `fin_bancos` para obtener las cuentas corrientes, de ahorros y cajas activas.
- [ ] **Step 2: Renderizar selector de cuenta bancaria al elegir Transferencia en `TransactionForm.jsx`**
  Reemplazar el input de texto simple de "Banco / Referencia" por un dropdown con las cuentas de la empresa y un campo separado para el número de comprobante.
- [ ] **Step 3: Agregar selector de cuenta bancaria en el checkout de `PosView.jsx`**
  Permitir al cajero seleccionar a qué cuenta de la empresa transfirió el cliente al pagar por transferencia.
- [ ] **Step 4: Sincronizar el ID de la cuenta bancaria en la transacción guardada**
  Enviar `cuentaBancariaId` en el payload de la transacción para que `sincronizarVenta` acredite la cuenta.
- [ ] **Step 5: Commit**
  `git commit -m "feat(ventas): selector dinamico de cuentas bancarias en TransactionForm y PosView"`

---

### Task 4: Selector de Cuentas Bancarias en Compras (`PurchaseForm`)

**Files:**
- Modify: `src/components/finances/PurchaseForm.jsx`

- [ ] **Step 1: Cargar cuentas bancarias en `PurchaseForm.jsx`**
  Obtener las cuentas activas desde `fin_bancos`.
- [ ] **Step 2: Desplegar selector de cuenta de origen al pagar por transferencia o efectivo**
  Permitir seleccionar de qué banco o caja chica se pagó al proveedor.
- [ ] **Step 3: Conectar con `sincronizarCompra` para debitar el saldo bancario**
- [ ] **Step 4: Commit**
  `git commit -m "feat(compras): selector de cuenta bancaria de salida en PurchaseForm"`

---

### Task 5: Modal de Apertura de Crédito en Caliente y Pagos Mixtos en Ventas

**Files:**
- Create: `src/components/finances/CreditSetupModal.jsx`
- Modify: `src/components/finances/TransactionForm.jsx`
- Modify: `src/components/finances/PosView.jsx`

- [ ] **Step 1: Crear `CreditSetupModal.jsx`**
  Modal con campos: Cupo asignado ($), Plazo en días (15, 30, 45, 60), Garante, Teléfono de garante y Observaciones. Al guardar, actualiza el perfil del cliente en `finances_third_parties`.
- [ ] **Step 2: Integrar validación de crédito en `TransactionForm.jsx`**
  Si el cliente no tiene crédito (`!cliente.tieneCredito`), abrir alerta para invocar `CreditSetupModal`. Al confirmar, asignar el crédito y habilitar la venta a crédito.
- [ ] **Step 3: Soportar pagos mixtos (Anticipo con Transferencia + Saldo a Crédito)**
  Registrar la parte de transferencia en `fin_bancos` y enviar el saldo pendiente a `fin_cxc` con fecha de vencimiento.
- [ ] **Step 4: Implementar alerta y solicitud de autorización de crédito en `PosView.jsx`**
  Permitir solicitar autorización administrativa o ingresar PIN de supervisor si el cliente no tiene cupo en POS.
- [ ] **Step 5: Commit**
  `git commit -m "feat(credito): modal de apertura de credito en caliente y soporte a pagos mixtos"`

---

### Task 6: Pantalla Completa de Creación y Edición de Cliente con Crédito en `ThirdPartiesView`

**Files:**
- Create: `src/components/finances/CustomerDetailView.jsx`
- Modify: `src/components/finances/ThirdPartiesView.jsx`

- [ ] **Step 1: Crear `CustomerDetailView.jsx`**
  Vista amplia a pantalla completa (no modal apretado) con secciones para:
  1. Datos Fiscales y SRI (RUC/Cédula con consulta automática).
  2. Datos de Contacto y Ubicación.
  3. Sección Especializada de Crédito (Switch habilitar crédito, Cupo Máximo $, Plazo días, Estado de crédito, Garante y Notas).
- [ ] **Step 2: Integrar `CustomerDetailView` en `ThirdPartiesView.jsx`**
  Sustituir el modal básico por la navegación inline hacia `CustomerDetailView` al crear o editar cliente.
- [ ] **Step 3: Guardar y sincronizar campos de crédito en `finances_third_parties`**
- [ ] **Step 4: Commit**
  `git commit -m "feat(personas): vista completa de creacion de clientes con gestion de credito"`

---

### Task 7: Modal Formal de Recaudación y Pago en CxC y CxP (`FinancialPaymentModal`)

**Files:**
- Create: `src/components/finances/FinancialPaymentModal.jsx`
- Modify: `src/components/finances/CuentasPorCobrarView.jsx`
- Modify: `src/components/finances/CuentasPorPagarView.jsx`

- [ ] **Step 1: Crear `FinancialPaymentModal.jsx`**
  Modal con selector de método de pago (Efectivo, Transferencia, Cheque, Tarjeta), selector de cuenta bancaria o caja chica (`fin_bancos`), monto a pagar (con cálculo de saldo pendiente), comprobante y notas.
- [ ] **Step 2: Reemplazar el `prompt` en `CuentasPorCobrarView.jsx`**
  Vincular el botón de cobrar a `FinancialPaymentModal` y actualizar `postFinancialPayment`.
- [ ] **Step 3: Reemplazar el `prompt` en `CuentasPorPagarView.jsx`**
  Vincular el botón de pago a proveedor a `FinancialPaymentModal` y actualizar `postFinancialPayment`.
- [ ] **Step 4: Commit**
  `git commit -m "feat(cartera): modal formal de cobros y pagos con seleccion de cuenta bancaria"`

---

### Task 8: Verificación Global, Pruebas Automatizadas y Build

**Files:**
- Test: `tests/**/*`
- Verify: `npm test`
- Verify: `npm run build`

- [ ] **Step 1: Ejecutar pruebas unitarias**
  `npm test`
- [ ] **Step 2: Ejecutar compilación de producción**
  `npm run build`
- [ ] **Step 3: Verificar navegación y responsividad**
- [ ] **Step 4: Commit final**
  `git commit -m "chore: verificacion global de finanzas y build de produccion"`
