# Mapa de Dependencias entre Módulos ERP

Este archivo es el más crítico del sistema. Se carga SIEMPRE antes de implementar cualquier módulo.
Define qué módulos deben actualizarse cuando se agrega o modifica uno.

---

## Tabla de contenidos
1. [Grafo de dependencias completo](#grafo)
2. [Dependencias por módulo](#por-modulo)
3. [Asientos automáticos por evento](#asientos)
4. [Campos compartidos entre módulos](#campos-compartidos)
5. [Bus de eventos del sistema](#eventos)

---

## 1. Grafo de dependencias completo

```
CLIENTES ──────────────────────────────────────────────────────────┐
    └──► COTIZACIONES ──► PEDIDOS ──► FACTURACIÓN ELECTRÓNICA      │
                                           │                        │
                    ┌──────────────────────┤                        │
                    ▼                      ▼                        ▼
              INVENTARIO            CUENTAS×COBRAR ──► TESORERÍA/COBROS
                    │                      │
                    ▼                      ▼
              COSTO_VENTAS         CONTABILIDAD_GENERAL
                    │                      │
                    └──────────────────────┘
                                   │
                                   ▼
                            REPORTES_SRI (ATS, 104, 101)


PROVEEDORES ──────────────────────────────────────────────────────┐
    └──► ÓRDENES_COMPRA ──► RECEPCIÓN ──► FACTURAS_COMPRA         │
                                │               │                   │
                    ┌───────────┘               ▼                   │
                    ▼                   RETENCIONES_EMITIDAS        │
              INVENTARIO                        │                   │
                    │                           ▼                   ▼
                    ▼                   CUENTAS×PAGAR ──► TESORERÍA/PAGOS
              COSTO_PRODUCTO                    │
                                               ▼
                                      CONTABILIDAD_GENERAL


NÓMINA ──► IESS ──► IMPUESTO_RENTA_EMP ──► CONTABILIDAD_GENERAL
              │
              └──► TESORERÍA/PAGOS
```

---

## 2. Dependencias por módulo

### CLIENTES
**Impacta hacia:**
- Cotizaciones, Pedidos, Facturas → usa datos del cliente (RUC/cédula, dirección, email, condición de pago, lista de precios)
- Cuentas×Cobrar → límite de crédito, días de crédito, historial
- Retenciones → tipo de contribuyente (PN, PJ, contribuyente especial, RIMPE) determina % retención
- Reportes SRI / ATS → identificación fiscal del cliente

**Campos críticos del módulo Cliente:**
```sql
clientes (
  id, ruc_cedula, tipo_identificacion,  -- CC, RUC, pasaporte
  razon_social, nombre_comercial,
  tipo_contribuyente,                   -- PN, PJ, CE, RIMPE, publico
  obligado_contabilidad,                -- boolean
  regimen,                              -- general, RIMPE_negocio, RIMPE_emprendedor
  email_facturacion,                    -- para envío RIDE
  condicion_pago_id,                    -- crédito N días / contado
  limite_credito, saldo_credito_disponible,
  lista_precios_id,
  retencion_fuente_pct,                 -- calculado según tipo contribuyente
  retencion_iva_pct,                    -- calculado según tipo contribuyente
  direccion_matriz, telefono,
  activo, created_at, updated_at
)
```

---

### PRODUCTOS / CATÁLOGO
**Impacta hacia:**
- Facturación → precio, IVA, descripción, unidad
- Inventario → control de stock, bodega, kardex
- Costos → costo promedio/FIFO actualizado en cada movimiento
- Cotizaciones y Pedidos → disponibilidad en tiempo real
- Compras → costo referencial para órdenes de compra
- Contabilidad → cuentas contables por tipo de producto (mercadería, servicio, activo)

**Campos críticos:**
```sql
productos (
  id, codigo, codigo_barras, nombre, descripcion,
  tipo,                           -- producto, servicio, kit, activo_fijo
  categoria_id, subcategoria_id,
  unidad_medida_id,
  -- PRECIOS
  precio_venta_1, precio_venta_2, precio_venta_3,
  precio_minimo_venta,
  -- IMPUESTOS (CRÍTICO para facturación electrónica)
  tarifa_iva,                     -- 15, 0, exento, no_objeto
  codigo_iva_sri,                 -- 2=15%, 0=0%, 6=exento, 7=no_objeto
  ice_aplica, ice_porcentaje,
  -- INVENTARIO
  controla_inventario,            -- boolean
  stock_minimo, stock_maximo,
  bodega_default_id,
  metodo_costeo,                  -- promedio, fifo
  costo_promedio,                 -- actualizado automáticamente
  -- CONTABILIDAD
  cuenta_ventas_id,               -- 4.1.x según plan de cuentas
  cuenta_costo_ventas_id,         -- 5.1.x
  cuenta_inventario_id,           -- 1.1.3.x
  cuenta_compras_id,              -- transitoria de compras
  -- CLASIFICACIÓN SRI
  codigo_producto_sri,            -- tabla de bienes/servicios SRI
  activo
)
```

---

### FACTURACIÓN ELECTRÓNICA
**Depende de:** Clientes, Productos, Pedidos, Inventario, Config SRI
**Impacta hacia:** Cuentas×Cobrar, Contabilidad, Inventario, ATS/Reportes SRI

**Al emitir una factura, el sistema DEBE automáticamente:**
1. Generar XML firmado y enviar al SRI (ambiente pruebas/producción)
2. Registrar RIDE (PDF)
3. **Crear asiento contable:**
   ```
   DEBE:  1.1.2.01 Cuentas×Cobrar Cliente    → total factura
   HABER: 4.1.x.xx Ventas (por producto)     → subtotal 0%
   HABER: 4.1.x.xx Ventas (por producto)     → subtotal 15% IVA
   HABER: 2.1.3.01 IVA Ventas por Pagar      → valor IVA 15%
   ```
4. Decrementar stock en inventario (si controla_inventario)
5. Registrar costo de ventas (kardex → asiento costo)
6. Actualizar saldo en Cuentas×Cobrar
7. Incluir en ATS del mes
8. Actualizar estadísticas del cliente

**Estructura XML SRI (campos obligatorios 2026):**
```
infoTributaria: ruc, claveAcceso, codDoc(01=factura), estab, ptoEmi, secuencial, ambiente(1=pruebas,2=producción)
infoFactura: fechaEmision, dirEstablecimiento, tipoIdentificacionComprador, razonSocialComprador, 
             identificacionComprador, totalSinImpuestos, totalDescuento, totalConImpuestos, propina,
             importeTotal, moneda(DOLAR), formaPago
detalles: codigoPrincipal, descripcion, cantidad, precioUnitario, descuento, precioTotalSinImpuesto,
          impuestos(codigo,codigoPorcentaje,tarifa,baseImponible,valor)
```

---

### CUENTAS POR COBRAR
**Depende de:** Facturación, Clientes, Condiciones de Pago
**Impacta hacia:** Tesorería/Cobros, Contabilidad, Reportes de Cartera, Límite de Crédito Cliente

**Al agregar/usar este módulo, TAMBIÉN actualizar:**
- **Clientes:** agregar campos `saldo_pendiente`, `dias_mora_promedio`, `limite_credito_usado`
- **Facturación:** agregar estado `cobrada/parcial/vencida` visible en lista
- **Dashboard:** widget de cartera vencida, aging report
- **Tesorería:** formulario de cobro que liquida C×C y genera asiento
- **Contabilidad:** asiento de cobro automático:
  ```
  DEBE:  1.1.1.01 Banco / Caja              → valor cobrado
  HABER: 1.1.2.01 Cuentas×Cobrar            → mismo valor
  ```
- **Notas de Crédito:** afectan C×C (reducen saldo pendiente)

**Tabla principal:**
```sql
cuentas_por_cobrar (
  id, factura_id, cliente_id,
  fecha_emision, fecha_vencimiento,
  valor_original, valor_pagado, saldo_pendiente,
  estado,                          -- pendiente, parcial, pagada, vencida, incobrable
  dias_mora,                        -- calculado = hoy - fecha_vencimiento (si > 0)
  interes_mora,                     -- si aplica política de empresa
  numero_cuota, total_cuotas,       -- si pago en cuotas
  created_at, updated_at
)

cobros (
  id, cuenta_cobrar_id, cliente_id,
  fecha_cobro, valor,
  forma_pago,                       -- efectivo, transferencia, cheque, tarjeta
  referencia,                       -- número cheque / comprobante transferencia
  cuenta_bancaria_id,
  asiento_contable_id,              -- FK al asiento generado
  usuario_id, created_at
)
```

---

### CUENTAS POR PAGAR
**Depende de:** Facturas Compra, Proveedores, Retenciones
**Impacta hacia:** Tesorería/Pagos, Contabilidad, Reportes SRI

**Al registrar factura de compra, generar automáticamente:**
1. Registro en C×P con fecha vencimiento según condición proveedor
2. Retención en la fuente (si el emisor es obligado a retener)
3. Retención de IVA (si aplica según tipo contribuyente)
4. Asiento contable:
   ```
   DEBE:  1.1.3.xx Inventario / 5.x.x Gasto  → subtotal sin impuestos
   DEBE:  1.1.x.xx IVA Compras (crédito)      → IVA (si genera crédito tributario)
   HABER: 2.1.2.01 Cuentas×Pagar Proveedor   → total a pagar
   HABER: 2.1.4.01 Ret. Fuente por Pagar     → valor retención fuente
   HABER: 2.1.4.02 Ret. IVA por Pagar        → valor retención IVA
   ```

---

### INVENTARIO / KARDEX
**Depende de:** Productos, Bodegas, Facturación, Compras, Ajustes
**Impacta hacia:** Costos, Contabilidad, Reportes de Stock

**Cada movimiento de inventario genera asiento contable automático:**

| Tipo movimiento | Asiento |
|---|---|
| Ingreso por compra | DEBE Inventario / HABER C×P |
| Salida por venta | DEBE Costo Ventas / HABER Inventario |
| Transferencia bodega | DEBE Inv.Bodega2 / HABER Inv.Bodega1 |
| Ajuste positivo | DEBE Inventario / HABER Ajuste Inventario |
| Ajuste negativo | DEBE Ajuste Inventario / HABER Inventario |
| Devolución venta | DEBE Inventario / HABER Costo Ventas |

**Costo promedio ponderado (método NEC 11 Ecuador):**
```
nuevo_costo_promedio = (stock_actual × costo_actual + cantidad_ingreso × costo_ingreso) 
                       / (stock_actual + cantidad_ingreso)
```
Actualizar `productos.costo_promedio` en cada ingreso de inventario.

---

### RETENCIONES (módulo transversal)
**Se activa en:** Facturas Compra, Facturas Venta (cuando cliente retiene), Nómina
**Impacta:** Contabilidad, Declaraciones SRI (Form 103 mensual)

**Tabla de retenciones vigentes Ecuador 2025-2026:**
Ver `references/tributacion-sri.md` para tabla completa.

Campos en retención emitida:
```sql
retenciones_emitidas (
  id, tipo,                           -- fuente, iva
  factura_compra_id, proveedor_id,
  numero_retencion,                   -- establecimiento-puntoEmision-secuencial
  fecha_emision,
  base_imponible, porcentaje, valor_retenido,
  codigo_sri,                         -- 303, 307, 310, 312... (fuente) / 721,723,725 (IVA)
  concepto_sri,
  estado,                             -- emitida, anulada
  xml_sri, clave_acceso,              -- retención electrónica 2024+
  asiento_id
)
```

---

## 3. Asientos automáticos por evento

| Evento del sistema | Módulo origen | Asientos generados |
|---|---|---|
| Emitir factura venta | Facturación | C×C, Ventas, IVA Ventas, Costo Ventas, Inventario |
| Cobrar factura | Tesorería | Banco/Caja vs C×C |
| Registrar factura compra | Compras | Inventario/Gasto, IVA Compras, C×P, Retenciones |
| Pagar a proveedor | Tesorería | C×P vs Banco |
| Emitir retención | Retenciones | Ret.por Pagar vs IVA/Gasto |
| Nómina aprobada | RRHH | Sueldos, Aportes IESS, Ret.IR Empleados |
| Depreciación activo | Activos Fijos | Gasto Depreciación vs Dep.Acumulada |
| Cierre de inventario | Inventario | Ajuste de valoración si aplica |

---

## 4. Campos compartidos críticos (nunca duplicar, siempre FK)

```
tipos_identificacion     → Clientes, Proveedores, Empleados
condiciones_pago         → Clientes, Proveedores, Facturas
listas_precios           → Clientes, Productos, Cotizaciones, Pedidos
plan_de_cuentas          → Productos, Asientos, Configuración tributaria
bodegas                  → Productos, Inventario, Transferencias
unidades_medida          → Productos, Detalle facturas/pedidos
usuarios                 → Auditoría de todos los módulos
periodos_contables       → Asientos, Cierres, Declaraciones
configuracion_empresa    → RUC, nombre, ambiente SRI, numeración
```

---

## 5. Bus de eventos del sistema

Eventos que el sistema debe publicar y los suscriptores:

```javascript
// Cuando se emite una factura
EMIT: 'factura.emitida' → {
  suscriptores: [
    'cuentas_cobrar.crear_registro',
    'inventario.decrementar_stock',
    'contabilidad.generar_asiento',
    'sri.encolar_envio_xml',
    'cliente.actualizar_saldo',
    'reportes.invalidar_cache'
  ]
}

// Cuando se registra un cobro
EMIT: 'cobro.registrado' → {
  suscriptores: [
    'cuentas_cobrar.aplicar_cobro',
    'contabilidad.generar_asiento',
    'tesoreria.actualizar_saldo_banco',
    'cliente.actualizar_credito_disponible'
  ]
}

// Cuando ingresa mercadería
EMIT: 'inventario.ingreso' → {
  suscriptores: [
    'productos.actualizar_costo_promedio',
    'productos.actualizar_stock',
    'contabilidad.generar_asiento',
    'pedidos.verificar_disponibilidad_pendiente'
  ]
}
```