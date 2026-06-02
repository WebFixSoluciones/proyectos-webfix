# Contabilidad Ecuador — NEC, NIIF y Plan de Cuentas

## Tabla de contenidos
1. [Plan de Cuentas estándar Ecuador](#plan-cuentas)
2. [Normas aplicables NEC / NIIF](#normas)
3. [Asientos contables estándar ERP](#asientos)
4. [Estados financieros requeridos](#estados)
5. [Cierre contable](#cierre)

---

## 1. Plan de Cuentas estándar Ecuador (estructura mínima ERP)

```
1. ACTIVO
  1.1 ACTIVO CORRIENTE
    1.1.1 EFECTIVO Y EQUIVALENTES
      1.1.1.01 Caja General
      1.1.1.02 Caja Chica
      1.1.1.03 Banco Pichincha Cta. Cte. XXXX
      1.1.1.04 Banco Guayaquil Cta. Cte. XXXX
    1.1.2 ACTIVOS FINANCIEROS
      1.1.2.01 Cuentas por Cobrar Clientes
      1.1.2.02 (-) Provisión Cuentas Incobrables
      1.1.2.03 Otras Cuentas por Cobrar
      1.1.2.04 Crédito Tributario IVA
      1.1.2.05 Crédito Tributario Impuesto a la Renta
      1.1.2.06 Anticipo Impuesto a la Renta
      1.1.2.07 IVA en Compras (crédito tributario)
    1.1.3 INVENTARIOS
      1.1.3.01 Inventario de Mercaderías
      1.1.3.02 Inventario de Materia Prima
      1.1.3.03 Inventario de Productos en Proceso
      1.1.3.04 Inventario de Productos Terminados
      1.1.3.05 (-) Provisión por Obsolescencia
    1.1.4 ACTIVOS POR IMPUESTOS CORRIENTES
      1.1.4.01 IVA Pagado (crédito tributario)
      1.1.4.02 Retenciones en la Fuente Recibidas
      1.1.4.03 Retenciones de IVA Recibidas
    1.1.5 OTROS ACTIVOS CORRIENTES
      1.1.5.01 Gastos Pagados por Anticipado
      1.1.5.02 Anticipo a Proveedores
  
  1.2 ACTIVO NO CORRIENTE
    1.2.1 PROPIEDAD, PLANTA Y EQUIPO
      1.2.1.01 Terrenos
      1.2.1.02 Edificios e Instalaciones
      1.2.1.03 Muebles y Enseres
      1.2.1.04 Equipo de Oficina
      1.2.1.05 Equipo de Computación
      1.2.1.06 Vehículos
      1.2.1.07 Maquinaria y Equipo
      1.2.1.08 (-) Depreciación Acumulada Edificios
      1.2.1.09 (-) Depreciación Acumulada Muebles
      1.2.1.10 (-) Depreciación Acumulada Eq. Oficina
      1.2.1.11 (-) Depreciación Acumulada Eq. Cómputo
      1.2.1.12 (-) Depreciación Acumulada Vehículos
      1.2.1.13 (-) Depreciación Acumulada Maquinaria

2. PASIVO
  2.1 PASIVO CORRIENTE
    2.1.1 CUENTAS Y DOCUMENTOS POR PAGAR
      2.1.1.01 Cuentas por Pagar Proveedores
      2.1.1.02 Documentos por Pagar
      2.1.1.03 Anticipo de Clientes
    2.1.2 OBLIGACIONES CON INST. FINANCIERAS
      2.1.2.01 Préstamos Bancarios Corto Plazo
    2.1.3 OBLIGACIONES TRIBUTARIAS
      2.1.3.01 IVA en Ventas por Pagar
      2.1.3.02 Retenciones en la Fuente por Pagar
      2.1.3.03 Retenciones de IVA por Pagar
      2.1.3.04 Impuesto a la Renta por Pagar
      2.1.3.05 Participación Trabajadores por Pagar
    2.1.4 OBLIGACIONES CON EL IESS
      2.1.4.01 Aporte Personal IESS por Pagar (9.45%)
      2.1.4.02 Aporte Patronal IESS por Pagar (12.15%)
      2.1.4.03 Préstamos IESS Empleados por Pagar
    2.1.5 OBLIGACIONES LABORALES
      2.1.5.01 Sueldos por Pagar
      2.1.5.02 Décimo Tercer Sueldo por Pagar
      2.1.5.03 Décimo Cuarto Sueldo por Pagar
      2.1.5.04 Vacaciones por Pagar
      2.1.5.05 Fondos de Reserva por Pagar
    2.1.6 OTROS PASIVOS CORRIENTES
      2.1.6.01 Intereses por Pagar

  2.2 PASIVO NO CORRIENTE
    2.2.1.01 Préstamos Bancarios Largo Plazo
    2.2.2.01 Provisión Jubilación Patronal
    2.2.2.02 Provisión Desahucio

3. PATRIMONIO
  3.1 CAPITAL
    3.1.1.01 Capital Social / Suscrito
  3.2 RESERVAS
    3.2.1.01 Reserva Legal (10% utilidad)
    3.2.1.02 Reserva Estatutaria
    3.2.1.03 Reserva Facultativa
  3.3 RESULTADOS
    3.3.1.01 Utilidad del Ejercicio
    3.3.1.02 Pérdida del Ejercicio
    3.3.1.03 Utilidades Retenidas de Ejercicios Anteriores
    3.3.1.04 Pérdidas Acumuladas

4. INGRESOS
  4.1 INGRESOS OPERACIONALES
    4.1.1.01 Ventas Gravadas 15% IVA
    4.1.1.02 Ventas Gravadas 0% IVA
    4.1.1.03 Ventas Exentas de IVA
    4.1.1.04 (-) Devoluciones en Ventas
    4.1.1.05 (-) Descuentos en Ventas
  4.2 INGRESOS NO OPERACIONALES
    4.2.1.01 Intereses Ganados
    4.2.1.02 Utilidad en Venta de Activos
    4.2.1.03 Otros Ingresos

5. COSTOS Y GASTOS
  5.1 COSTO DE VENTAS
    5.1.1.01 Costo de Ventas Mercaderías
    5.1.1.02 Costo de Ventas Productos Terminados
  5.2 GASTOS DE ADMINISTRACIÓN
    5.2.1.01 Sueldos y Salarios Administrativos
    5.2.1.02 Aporte Patronal IESS (Administrativo)
    5.2.1.03 Décimo Tercer Sueldo (Administrativo)
    5.2.1.04 Décimo Cuarto Sueldo (Administrativo)
    5.2.1.05 Vacaciones (Administrativo)
    5.2.1.06 Fondos de Reserva (Administrativo)
    5.2.1.07 Honorarios Profesionales
    5.2.1.08 Arrendamiento Oficinas
    5.2.1.09 Servicios Básicos
    5.2.1.10 Suministros de Oficina
    5.2.1.11 Depreciación Activos (Administrativo)
    5.2.1.12 Provisión Cuentas Incobrables
    5.2.1.13 Gastos de Gestión (Atención clientes)
    5.2.1.14 Gastos de Viaje
    5.2.1.15 Comunicaciones
    5.2.1.16 Mantenimiento y Reparaciones
    5.2.1.17 Seguros
    5.2.1.18 Gastos Bancarios
  5.3 GASTOS DE VENTAS
    5.3.1.01 Sueldos Vendedores
    5.3.1.02 Comisiones en Ventas
    5.3.1.03 Publicidad y Marketing
    5.3.1.04 Transporte y Fletes
  5.4 GASTOS FINANCIEROS
    5.4.1.01 Intereses Pagados
    5.4.1.02 Comisiones Bancarias
    5.4.1.03 Diferencial Cambiario
  5.5 PARTICIPACIÓN TRABAJADORES (15%)
    5.5.1.01 15% Participación Trabajadores
  5.6 IMPUESTO A LA RENTA
    5.6.1.01 Impuesto a la Renta del Ejercicio
```

---

## 2. Normas aplicables

### NEC vs NIIF en Ecuador 2026
- **NIIF completas:** empresas cotizadas en bolsa, sector financiero, y empresas con activos > $4M o ingresos > $5M o más de 200 empleados
- **NIIF para PYMES:** empresas medianas (por debajo de los umbrales NIIF completas)
- **NEC:** solo para empresas muy pequeñas no obligadas a NIIF

### NEC relevantes para ERP
- **NEC 1:** Presentación de estados financieros
- **NEC 11:** Inventarios → valoración al costo (promedio ponderado o FIFO)
- **NEC 12:** Propiedades, Planta y Equipo → depreciación
- **NEC 17:** Ingresos → reconocimiento en el momento de transferencia de riesgos

### NIIF clave para ERP
- **NIIF 15:** Reconocimiento de ingresos (5 pasos)
- **NIIF 9:** Instrumentos financieros (cuentas por cobrar, provisión incobrables)
- **NIC 2:** Inventarios (idéntico a NEC 11 en concepto)
- **NIC 16:** Propiedad, planta y equipo

### Tasas de depreciación (SRI — Reglamento LORTI)
| Activo | Vida útil | % anual |
|---|---|---|
| Inmuebles (excepto terrenos) | 20 años | 5% |
| Muebles y enseres | 10 años | 10% |
| Maquinaria y equipo | 10 años | 10% |
| Equipo de cómputo | 3 años | 33.33% |
| Vehículos | 5 años | 20% |

---

## 3. Asientos contables estándar ERP

### Venta con factura (IVA 15%)
```
Ejemplo: Venta $1.000 + IVA 15% = $1.150
Costo de la mercadería vendida: $600

ASIENTO 1 — Venta
DEBE:   1.1.2.01 Ctas×Cobrar Clientes      1.150,00
HABER:  4.1.1.01 Ventas Gravadas 15%       1.000,00
HABER:  2.1.3.01 IVA Ventas por Pagar        150,00

ASIENTO 2 — Costo de ventas (simultáneo)
DEBE:   5.1.1.01 Costo de Ventas             600,00
HABER:  1.1.3.01 Inventario Mercaderías      600,00
```

### Compra con retención
```
Ejemplo: Compra $500 + IVA 15% = $575
Retención fuente 1% = $5 | Retención IVA 30% = $22,50

ASIENTO
DEBE:   1.1.3.01 Inventario Mercaderías      500,00
DEBE:   1.1.4.01 IVA en Compras               75,00  ← crédito tributario
HABER:  2.1.1.01 Ctas×Pagar Proveedores      547,50  ← (575 - 5 - 22.50)
HABER:  2.1.3.02 Ret. Fuente por Pagar         5,00
HABER:  2.1.3.03 Ret. IVA por Pagar           22,50
```

### Cobro de cartera
```
DEBE:   1.1.1.03 Banco                      1.150,00
HABER:  1.1.2.01 Ctas×Cobrar Clientes       1.150,00
```

### Pago a proveedor con descuento
```
DEBE:   2.1.1.01 Ctas×Pagar Proveedores      547,50
HABER:  1.1.1.03 Banco                       547,50
```

### Nómina mensual
```
Ejemplo: Sueldo bruto $800 | Ap.personal 9.45%=$75.60 | Ap.patronal 12.15%=$97.20

ASIENTO NÓMINA
DEBE:   5.2.1.01 Sueldos Administrativos     800,00
DEBE:   5.2.1.02 Aporte Patronal IESS         97,20
HABER:  2.1.4.01 Ap. Personal IESS             75,60
HABER:  2.1.4.02 Ap. Patronal IESS             97,20
HABER:  2.1.5.01 Sueldos por Pagar            724,40  ← (800 - 75.60)
```

---

## 4. Estados financieros mínimos

### Balance General (Estado de Situación Financiera)
```
Estructura de presentación:
ACTIVOS CORRIENTES          xxx
  Efectivo y equiv.          xx
  Cuentas×Cobrar             xx
  Inventarios                xx
  Crédito tributario         xx
ACTIVOS NO CORRIENTES       xxx
  PP&E neto                  xx
TOTAL ACTIVOS               xxx

PASIVOS CORRIENTES          xxx
  Ctas×Pagar                 xx
  Obligaciones tributarias   xx
  Obligaciones laborales     xx
PASIVOS NO CORRIENTES       xxx
PATRIMONIO                  xxx
  Capital                    xx
  Reservas                   xx
  Utilidad ejercicio         xx
TOTAL PAS+PAT               xxx   ← debe = TOTAL ACTIVOS
```

### Estado de Resultados Integral
```
(+) INGRESOS OPERACIONALES       xxx
(-) COSTO DE VENTAS              (xxx)
(=) UTILIDAD BRUTA               xxx
(-) GASTOS ADMINISTRACIÓN        (xxx)
(-) GASTOS VENTAS                (xxx)
(=) UTILIDAD OPERACIONAL         xxx
(+/-) OTROS INGRESOS/GASTOS      xxx
(=) UTILIDAD ANTES 15% TRAB.     xxx
(-) 15% Participación trabajad.  (xxx)
(=) UTILIDAD ANTES IR            xxx
(-) Impuesto a la Renta 25%      (xxx)
(=) UTILIDAD NETA DEL EJERCICIO  xxx
```

---

## 5. Cierre contable

### Cierre mensual (períodos contables)
```
1. Verificar que todos los asientos estén registrados
2. Conciliación bancaria completada
3. Calcular y registrar depreciaciones del mes
4. Generar declaraciones SRI (Form 104, 103)
5. Verificar saldos de IVA (crédito vs débito)
6. Bloquear período para nuevos asientos
7. Generar reportes del período
```

### Cierre anual
```
1. Completar cierre de los 12 meses
2. Ajustes NIIF (provisiones, deterioro, etc.)
3. Calcular 15% participación trabajadores
4. Calcular Impuesto a la Renta
5. Asiento de cierre de resultados:
   DEBE:   4.x.x Todas las cuentas de ingreso
   HABER:  5.x.x Todas las cuentas de gasto/costo
   NETO → 3.3.1.01 Utilidad o 3.3.1.02 Pérdida
6. Preparar declaración Form 101/102
7. Preparar estados financieros auditados (si aplica)
```