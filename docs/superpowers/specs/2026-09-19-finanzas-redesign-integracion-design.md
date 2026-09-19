# Especificación de Diseño: Rediseño Integral de Finanzas, Estandarización de Encabezados e Integración Sistémica ERP

**Fecha:** 19 de Septiembre de 2026  
**Estado:** Aprobado para Planificación  
**Autor:** Antigravity  
**Proyecto:** WebFix ERP (Ecuador)  

---

## 1. Visión General y Objetivos

El objetivo de esta iniciativa es completar, perfeccionar y conectar de punta a punta todo el subsistema de **Control Financiero** (11 submódulos) con el proceso operativo global del ERP (**Ventas Administrativas / Facturación SRI**, **Punto de Venta POS**, **Compras**, **Inventario / Kardex** y **Gestión de Personas / Clientes**).

### Metas Principales:
1. **Estandarización Visual de Encabezados (Radix Themes / Flat Modern):**
   Unificar las 11 pantallas de finanzas bajo un componente de encabezado homogéneo (`FinancialPageHeader`), garantizando consistencia en tipografía, insignias, botones de acción primaria y descripciones operativas.
2. **Conectividad Bancaria y Tesorería Real:**
   Integrar la selección de cuentas bancarias y fondos de caja activa (`fin_bancos`) directamente en las interfaces de cobro y pago (Ventas, POS, Compras, CxC, CxP). Cada transacción en efectivo, transferencia o depósito impacta automáticamente el saldo real y los registros de `fin_movimientos_bancarios` y `fin_movimientos`.
3. **Flujo Integral de Crédito, Anticipos y Cuentas por Cobrar (CxC):**
   - Soporte para pagos mixtos (ej: anticipo del 50% por transferencia bancaria y saldo restante a crédito en CxC).
   - Apertura ágil de línea de crédito desde Venta Administrativa con modal profesional.
   - Creación de Clientes con vista completa en el módulo de Personas, incluyendo configuración formal de crédito (cupo, días, garante, estado).
   - Autorización administrativa de crédito en Punto de Venta (POS) con validación de rol o PIN de supervisor.
4. **Modales Formales de Recaudación y Pago en Cartera (CxC y CxP):**
   Sustituir los prompts nativos del navegador por diálogos modales profesionales que permitan registrar abonos parciales o totales con selector de cuenta bancaria/caja, método de pago y referencia.
5. **Auditoría de Integridad y Consistencia:**
   Garantizar que no existan descuadres entre cuentas bancarias, movimientos financieros, asientos contables de doble partida y carteras.

---

## 2. Arquitectura de Integración ERP

### 2.1. Matriz de Conectividad entre Módulos

```
  ┌────────────────────────┐         ┌────────────────────────┐
  │  Ventas Administrativas │         │      POS de Caja       │
  │   (TransactionForm)    │         │       (PosView)        │
  └───────────┬────────────┘         └───────────┬────────────┘
              │ Contado (Transf/Efectivo)        │ Contado (Transf/Efectivo)
              │ o Crédito (CxC)                  │ o Cuenta Corriente (Fiado)
              ▼                                  ▼
  ┌───────────────────────────────────────────────────────────┐
  │                 MOTOR FINANCIERO CENTRAL                  │
  │  • Selector de Banco/Caja activo (fin_bancos)             │
  │  • Desglose Mixto: Anticipo Bancario + Saldo CxC          │
  │  • Gestión de Línea de Crédito y Autorización             │
  └───────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │   fin_bancos  │   │  fin_movim.   │   │    fin_cxc    │
  │   (Tesorería) │   │ (Movimientos) │   │   (Cartera)   │
  └───────────────┘   └───────────────┘   └───────────────┘
          ▲                   ▲                   ▲
          │                   │                   │
          │                   │ Pago Proveedor    │ Compra Crédito
          │ Débito Bancario   │                   │
  ┌───────┴───────────────────┴───────────────────┴───────┐
  │              Módulo de Compras (PurchaseForm)         │
  └───────────────────────────────────────────────────────┘
```

---

## 3. Especificación Detallada por Componente y Pantalla

### 3.1. Componente Unificado: `FinancialPageHeader.jsx`
* **Ubicación:** `src/components/finances/FinancialPageHeader.jsx`
* **Propósito:** Estandarizar la cabecera en los 11 submódulos.
* **Props:**
  - `icon` (Componente Lucide): Icono temático del submódulo.
  - `title` (String): Título principal formal (ej: "Cuentas por Cobrar (CxC)").
  - `description` (String): Texto explicativo de una línea sobre el propósito operativo.
  - `badge` (String/Objeto opcional): Texto o badge informativo (ej: "SRI Ecuador", "3 activas").
  - `badgeColor` (String): Color del badge según Radix Themes (green, blue, amber, gray).
  - `actions` (ReactNode opcional): Botones de acción, filtros o exportadores colocados a la derecha.
* **Diseño UI:**
  - Contenedor con borde inferior sutil `border-b border-[var(--gray-a4)]`, padding inferior de 16px.
  - Contenedor de icono con estilo badge de $40\times 40\text{px}$, esquinas redondeadas y acento temático.
  - Responsive: En pantallas móviles se apila verticalmente; en escritorio alinea título a la izquierda y acciones a la derecha.

---

### 3.2. Las 11 Pantallas Financieras Estandarizadas

#### 1. Resumen Financiero (`ResumenFinancieroView.jsx`)
* **Header:** Icono `PieChart` (Azul), Título: *"Resumen Financiero"*, Subtítulo: *"Panel ejecutivo de tesorería, liquidez y proyección de flujo de caja"*. Acciones: Selector de Mes (`UiInput type="month"`) + Botón de refrescar.
* **Conectividad:** Lee saldos reales consolidados de `fin_bancos`, `fin_movimientos`, `fin_cxc`, `fin_cxp`, `fin_prestamos` y `fin_tarjetas`.
* **Mejora:** KPIs calculados dinámicamente sobre transacciones reales de Firestore, alertas de vencimiento automáticas y proyección de caja (Forecast a 30, 60 y 90 días).

#### 2. Movimientos Financieros (`MovimientosView.jsx`)
* **Header:** Icono `DollarSign` (Verde), Título: *"Movimientos Financieros"*, Subtítulo: *"Libro central de ingresos, egresos y control de tesorería general"*. Acciones: Botón `+ Nuevo Movimiento` + Botón `Exportar CSV`.
* **Conectividad:** Refleja en tiempo real las ventas (ingresos) y compras/gastos (egresos). Al anular un movimiento, sincroniza la reversión en `fin_cxc` o `fin_cxp`.

#### 3. Cuentas por Cobrar — CxC (`CuentasPorCobrarView.jsx`)
* **Header:** Icono `TrendingUp` (Azul), Título: *"Cuentas por Cobrar (CxC)"*, Subtítulo: *"Cartera de clientes, antigüedad de saldos y cobranzas"*. Acciones: Selector de Estado + Botón `Exportar CSV`.
* **Nuevo Modal de Cobro (`FinancialPaymentModal`):**
  - Elimina el `prompt` nativo.
  - Selector de Medio de Pago: *Efectivo*, *Transferencia*, *Cheque*, *Tarjeta*.
  - Selector dinámico de cuenta bancaria o caja chica de destino (`fin_bancos`).
  - Monto a abonar (precarga el saldo pendiente, permite pagos parciales).
  - Número de comprobante / referencia bancaria.
  - Actualización atómica en `fin_cxc`, `fin_movimientos`, `fin_movimientos_bancarios` y `fin_bancos`.

#### 4. Cuentas por Pagar — CxP (`CuentasPorPagarView.jsx`)
* **Header:** Icono `ArrowUpCircle` (Ámbar), Título: *"Cuentas por Pagar (CxP)"*, Subtítulo: *"Obligaciones comerciales con proveedores y retenciones tributarias"*. Acciones: Selector de Estado + Botón `Exportar CSV`.
* **Nuevo Modal de Pago a Proveedor:**
  - Selector de cuenta bancaria o caja de salida (`fin_bancos`).
  - Registro de retenciones aplicadas y comprobante de egreso.
  - Actualización atómica de saldo de deuda y débito bancario.

#### 5. Bancos y Caja (`BancosCajaView.jsx`)
* **Header:** Icono `Building2` (Azul), Título: *"Bancos y Caja"*, Subtítulo: *"Gestión de cuentas corrientes, ahorros, caja chica y conciliación bancaria"*. Acciones: Botón `+ Nueva Cuenta` + Botón `Conciliación Inteligente`.
* **Conectividad:** Cada venta, compra o cobro/pago registrado con cuenta bancaria aparece reflejado inmediatamente en el extracto de movimientos bancarios (`fin_movimientos_bancarios`) con su saldo recalculado.

#### 6. Tarjetas y Créditos (`TarjetasCreditosView.jsx`)
* **Header:** Icono `CreditCard` (Púrpura), Título: *"Tarjetas y Créditos"*, Subtítulo: *"Administración de tarjetas corporativas, cupos y consumos diferidos"*. Acciones: Botón `+ Nueva Tarjeta` + Botón `Registrar Consumo`.
* **Conectividad:** Al pagar la tarjeta, permite seleccionar la cuenta de `fin_bancos` que realiza el débito.

#### 7. Préstamos Bancarios (`PrestamosView.jsx`)
* **Header:** Icono `Landmark` (Rojo), Título: *"Préstamos Bancarios"*, Subtítulo: *"Pasivos de financiamiento, tablas de amortización y cuotas"*. Acciones: Botón `+ Nuevo Préstamo`.
* **Conectividad:** Al pagar una cuota, desglosa contablemente Capital vs. Interés y debita la cuenta bancaria seleccionada.

#### 8. Captura Inteligente OCR (`CapturaInteligenteView.jsx`)
* **Header:** Icono `Scan` (Cian), Título: *"Captura Inteligente OCR"*, Subtítulo: *"Digitalización y lectura automatizada con IA de facturas físicas y comprobantes"*. Acciones: Botón `Subir Documento` + Refrescar.
* **Conectividad:** Al confirmar una captura validada, genera directamente la compra en `PurchaseForm` o el movimiento en `fin_movimientos` con su correspondiente cuenta bancaria si fue pagada.

#### 9. Contabilidad Integral (`ContabilidadView.jsx`)
* **Header:** Icono `BookOpen` (Verde), Título: *"Contabilidad Integral"*, Subtítulo: *"Plan de cuentas jerárquico, centros de costo y libro diario de asientos"*. Acciones: Pestañas de navegación + Botón `+ Nueva Cuenta / Asiento`.
* **Conectividad:** Los cobros, pagos, ventas y compras generan sus respectivos asientos de doble partida en `fin_asientos`.

#### 10. Impuestos y SRI (`ImpuestosSriView.jsx`)
* **Header:** Icono `Calculator` (Azul), Título: *"Impuestos y SRI"*, Subtítulo: *"Declaración mensual de IVA, retenciones en la fuente y generación de ATS"*. Acciones: Selectores de Año/Mes + Botón `Descargar ATS (XML)`.
* **Conectividad:** Consolida las compras y ventas autorizadas del período y genera el XML válido para el SRI de Ecuador.

#### 11. Reportes Especializados y Auditoría (`ReportesView.jsx`)
* **Header:** Icono `BarChart3` (Gris), Título: *"Reportes Especializados y Auditoría"*, Subtítulo: *"Flujo de caja, aging consolidado, balance y registro de auditoría inmutable"*. Acciones: Selector de Reporte + Botones `Exportar CSV` y `Exportar PDF`.

---

## 4. Flujo Avanzado de Crédito a Clientes, Anticipos y POS

### 4.1. Esquema de Datos del Cliente (`finances_third_parties`)
Se formalizan y amplían los campos de crédito en el perfil de terceros:
```typescript
interface ThirdPartyCreditConfig {
  tieneCredito: boolean;           // true si tiene crédito habilitado
  limiteCredito: number;           // Cupo máximo en USD (ej: 500.00)
  diasCredito: number;             // Plazo en días (ej: 15, 30, 45, 60)
  estadoCredito: 'activo' | 'suspendido' | 'en_evaluacion' | 'bloqueado_mora';
  garanteNombre?: string;
  garanteTelefono?: string;
  observacionesCredito?: string;
  fechaAprobacionCredito?: string;
  aprobadoPor?: string;
}
```

### 4.2. Venta Administrativa y Facturación SRI ([`TransactionForm.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/finances/TransactionForm.jsx))
1. **Selector de Banco en Transferencias / Depósitos:**
   - Carga cuentas activas de `fin_bancos`.
   - Muestra: `[Nombre Entidad] - [Tipo Cuenta] (Saldo disponible: $X)`.
   - Campo para ingresar el N° de Comprobante / Voucher.
2. **Pagos Mixtos y Anticipos:**
   - Permite combinar medios de pago: ej. $20 Transferencia (afecta banco) + $30 Crédito (afecta CxC).
3. **Validación y Apertura de Crédito en Caliente:**
   - Si se selecciona Crédito (`cruce_cuentas`) y el cliente no tiene crédito (`!cliente.tieneCredito` o cupo = 0):
     - Diálogo: *"El cliente [Nombre] no cuenta con una línea de crédito autorizada. ¿Deseas configurar y abrir su línea de crédito ahora?"*
     - Al confirmar, abre el **Modal de Gestión y Apertura de Crédito**:
       - Configurar Cupo, Días de crédito, Garante y Notas.
       - Guarda inmediatamente en el documento del cliente en Firestore y habilita la venta actual a crédito.
   - Si el crédito supera el cupo disponible:
     - Muestra alerta de sobregiro con desglose numérico (Cupo, Deuda actual, Total venta, Excedente) y opción de autorización si el usuario tiene privilegios administrativos.

### 4.3. Creación de Cliente en Módulo de Personas ([`ThirdPartiesView.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/finances/ThirdPartiesView.jsx))
* Al hacer clic en `+ Nuevo Cliente`, en lugar de un modal estrecho, se despliega una **vista de formulario amplia y completa**:
  - **Sección 1: Datos Generales y Fiscales** (RUC/Cédula con consulta automática al SRI, Razón Social, Nombre Comercial, Correo, Teléfono, Dirección, Ciudad, Tipo de Contribuyente).
  - **Sección 2: Gestión de Crédito y Finanzas:**
    - Switch: *Habilitar Línea de Crédito*.
    - Campo numérico: *Cupo Máximo Autorizado ($)*.
    - Selector: *Plazo de Pago (Días: 8, 15, 30, 45, 60, 90)*.
    - Estado de Crédito (*Activo / En Evaluación / Bloqueado*).
    - Datos del Garante / Referencias comerciales y notas de crédito.

### 4.4. Punto de Venta ([`PosView.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/finances/PosView.jsx))
* **Creación Rápida:** Mantiene el modal ágil y ligero para el cajero (Cédula/RUC, Nombre, Teléfono, Email).
* **Venta a Crédito / Fiado en POS:**
  - Al pulsar "Crédito / Cuenta Abierta":
    - Si el cliente tiene cupo activo y disponible $\ge$ total de la venta: se asigna a su cuenta corriente con un clic.
    - Si el cliente no tiene crédito configurado o su saldo excede el cupo:
      - Aparece el botón *"Solicitar Autorización de Crédito a Administración"*.
      - Diálogo con opción de autorización inmediata mediante contraseña/PIN de supervisor o usuario con rol `admin`.
      - Si el cajero es de nivel operativo sin autorización, se genera el registro de solicitud para evaluación en Administración.

---

## 5. Plan de Verificación y Criterios de Éxito

1. **Flujo Bancario en Ventas:**
   - Registrar una factura de venta con pago por Transferencia seleccionando una cuenta de `fin_bancos`.
   - Verificar que el saldo de la cuenta bancaria aumente por el monto correspondiente y se liste en `fin_movimientos_bancarios`.
2. **Flujo de Cartera y Abonos Mixtos:**
   - Emitir una venta de $100 con $40 en transferencia y $60 a crédito.
   - Constatar que la cuenta bancaria suba $40 y que en `fin_cxc` aparezca la deuda de $60.
   - Realizar un abono parcial de $30 en `CuentasPorCobrarView` usando el nuevo modal con selector de banco y verificar que el saldo restante baje a $30.
3. **Apertura de Crédito en Venta Administrativa:**
   - Seleccionar un cliente nuevo sin crédito y marcar pago a crédito.
   - Verificar que salte la advertencia, se abra el modal de apertura, se guarde el cupo en el cliente y la venta proceda con éxito.
4. **Pantalla Completa de Cliente en Personas:**
   - Crear un cliente con crédito en `ThirdPartiesView` y comprobar que sus datos fiscales y de crédito persistan en Firestore.
5. **Estandarización UI:**
   - Navegar por los 11 submódulos y verificar que todos compartan la cabecera `FinancialPageHeader` sin desfases estéticos ni diferencias estructurales.
6. **Integridad de Compilación:**
   - Ejecutar `npm run build` y pruebas automatizadas asegurando cero errores y lint limpio.
