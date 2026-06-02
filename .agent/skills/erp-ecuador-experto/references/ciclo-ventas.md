# Ciclo de Ventas y Nómina Ecuador — Procesos ERP

## Tabla de contenidos
1. [Ciclo completo de ventas](#ventas)
2. [Nómina y beneficios sociales Ecuador](#nomina)
3. [Inventarios y costos](#inventarios)

---

## 1. Ciclo completo de ventas

### Flujo de estados de documentos

```
PROSPECTO → CLIENTE
COTIZACIÓN → [aprobada] → PEDIDO → [confirmado] → FACTURA → [cobrada] → COBRO
                                        │
                                 [parcialmente]
                                        │
                              GUÍA DE REMISIÓN (si hay despacho físico)
                                        │
                                   ENTREGA
FACTURA → [devolución] → NOTA DE CRÉDITO → ajusta C×C + inventario
```

### Estados de cotización
`borrador → enviada → vista → aprobada_cliente → convertida_pedido | rechazada | vencida`

### Estados de pedido
`borrador → confirmado → en_preparacion → parcialmente_despachado → despachado → facturado | cancelado`

### Estados de factura
`borrador → enviada_sri → autorizada | no_autorizada | anulada`
`autorizada → pendiente_cobro → parcialmente_cobrada → cobrada`

### Reglas de negocio ventas
```
- Verificar límite de crédito antes de confirmar pedido
- Reservar stock en inventario al confirmar pedido
- Liberar reserva si pedido se cancela
- No permitir facturar si hay facturas vencidas > X días (configurable)
- Calcular precio según lista de precios del cliente
- Aplicar descuentos en cascada: lista → cliente → manual (con aprobación)
- Generar retención recibida si el cliente es agente de retención
```

### Listas de precios
```sql
listas_precios (id, nombre, moneda, activa, fecha_vigencia_desde, fecha_vigencia_hasta)
listas_precios_detalle (id, lista_id, producto_id, precio, precio_minimo, descuento_max_pct)
```

### Comisiones de vendedores
```
comisiones (
  id, vendedor_id, periodo_mes, periodo_anio,
  total_ventas, total_cobrado,
  base_comision,                  -- sobre cobrado o facturado (configurable)
  porcentaje_comision,
  valor_comision,
  estado                          -- calculada, aprobada, pagada
)
```

---

## 2. Nómina Ecuador — Beneficios sociales 2025-2026

### Salario Básico Unificado (SBU) 2025: $470,00

### Componentes del rol de pagos

```
INGRESOS:
+ Sueldo base
+ Horas extras 50% (diurnas)       → HE × (SBU/240) × 1.5
+ Horas extras 100% (nocturnas/feriado) → HE × (SBU/240) × 2.0
+ Comisiones
+ Bonos
+ Fondos de reserva (si no acumula en IESS)
= TOTAL INGRESOS

DESCUENTOS:
- Aporte personal IESS 9.45%
- Impuesto a la renta en relación dependencia (proyección anual / 12)
- Préstamos IESS
- Anticipos de sueldo
= TOTAL DESCUENTOS

LÍQUIDO A PAGAR = Total Ingresos - Total Descuentos
```

### Beneficios sociales y provisiones mensuales

| Beneficio | Cálculo | Provisión mensual |
|---|---|---|
| Décimo tercer sueldo | 1/12 de remuneraciones anuales | sueldo/12 |
| Décimo cuarto sueldo | 1 SBU anual / 12 | $470/12 = $39,17 |
| Vacaciones | 15 días por año / 12 | sueldo/24 |
| Fondos de reserva | Desde el 2° año: 8.33% del sueldo | sueldo × 8.33% |
| Aporte patronal IESS | 12.15% del sueldo | sueldo × 12.15% |

### Tabla aportes IESS 2025
| Concepto | % | Sobre |
|---|---|---|
| Aporte personal | 9.45% | Sueldo + horas extras + comisiones |
| Aporte patronal | 11.15% | Misma base |
| Seguro desempleo patronal | 1.00% | Misma base |
| **Total patronal** | **12.15%** | |
| SECAP (patronal) | 0.50% | Sobre sueldo base |
| IECE (patronal) | 0.50% | Sobre sueldo base |

### Décimos — reglas de pago
- **Décimo Tercer:** pagar hasta el 24 de diciembre (o mensualizar con autorización empleado)
- **Décimo Cuarto:** pagar hasta el 15 de marzo (Sierra/Oriente) o 15 agosto (Costa/Galápagos)
- **Vacaciones:** 15 días hábiles por año; pagar al momento de goce o al salir

### Proyección IR empleados (RDEP)
```
1. Sumar todos los ingresos proyectados del año
2. Restar deducciones personales (gastos: vivienda, salud, educación, alimentación, vestimenta)
3. Aplicar tabla progresiva IR personas naturales
4. Dividir resultado / 12 = retención mensual
5. Ajustar en diciembre con los valores reales
```

### Deducciones personales 2025 (límites)
| Tipo gasto | Límite |
|---|---|
| Vivienda | 0.325 × fracción básica desgravada = $3.809,65 |
| Salud | 2.125 × fracción básica = $24.906,25 |
| Educación | 0.325 × fracción básica = $3.809,65 |
| Alimentación | 0.325 × fracción básica = $3.809,65 |
| Vestimenta | 0.325 × fracción básica = $3.809,65 |
| **TOTAL máximo** | **3.15 × fracción básica = $36.924,30** |

---

## 3. Inventarios y costos

### Métodos de costeo permitidos en Ecuador (NEC 11 / NIC 2)

**Costo Promedio Ponderado (más común en ERP Ecuador):**
```
Al ingresar mercadería:
nuevo_cpp = ((stock_anterior × cpp_anterior) + (cantidad_nueva × costo_nuevo)) 
            / (stock_anterior + cantidad_nueva)

Al salir mercadería:
costo_salida = cantidad_salida × cpp_vigente
```

**FIFO (Primeras Entradas, Primeras Salidas):**
- Mantener lotes ordenados por fecha de ingreso
- La salida siempre consume el lote más antiguo primero
- Más complejo pero más preciso en inflación

### Estructura kardex

```sql
kardex (
  id, producto_id, bodega_id,
  fecha, tipo_movimiento,          -- ingreso_compra, salida_venta, transferencia, ajuste, devolucion
  documento_origen_tipo,           -- factura_compra, factura_venta, ajuste, transferencia
  documento_origen_id,
  cantidad_entrada, cantidad_salida,
  costo_unitario,
  saldo_unidades,                  -- stock resultante
  saldo_valor,                     -- valoración resultante
  costo_promedio_resultante,       -- CPP después del movimiento
  lote_id,                         -- si usa FIFO o control de lotes
  usuario_id, created_at
)
```

### Ajustes de inventario (conteo físico)

```
Proceso:
1. Congelar movimientos del inventario (opcional)
2. Registrar conteo físico por bodega/categoría
3. Sistema compara: stock_sistema vs conteo_físico
4. Diferencias positivas → asiento: DEBE Inventario / HABER Ajuste Inventario
5. Diferencias negativas → asiento: DEBE Ajuste Inventario / HABER Inventario
6. Documentar razón de diferencias
7. Aprobar ajuste (requiere nivel gerencial)
```

### Transferencias entre bodegas
```
Asiento:
DEBE:   1.1.3.01 Inventario Bodega Destino   xxx
HABER:  1.1.3.01 Inventario Bodega Origen    xxx
(mismo valor, sin costo adicional)
```

### Kits y ensamblajes
```sql
kits_componentes (
  id, kit_id,              -- FK a productos (tipo=kit)
  componente_id,           -- FK a productos
  cantidad,
  es_opcional
)
-- Al vender un kit: descontar inventario de cada componente
-- El costo del kit = suma de costos de sus componentes
```