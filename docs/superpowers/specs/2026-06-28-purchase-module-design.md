# Especificación de Diseño: Módulo de Compras, Historial e Ingreso con XML/Clave de Acceso

Este documento detalla la especificación para el submódulo de **Historial de Compras** y el nuevo formulario interactivo de **Registro de Compra** con importación XML, extracción automática de datos desde clave de acceso de 49 dígitos e integración con el Kardex.

## 1. Contexto de Negocio
El registro de egresos (compras) a proveedores requiere un flujo de trabajo optimizado que reduzca la digitación manual y enlace los productos comprados directamente al inventario físico de las bodegas.

### Características Clave:
1. **Historial de Compras (En reemplazo de Resumen):** Se presentará una grilla completa con filtros por mes/año, buscador y botón de registro rápido.
2. **Clave de Acceso Inteligente:** Al escribir o pegar los 49 dígitos de la clave de acceso de una factura SRI:
   - Se auto-extrae la **Fecha de Emisión** (primeros 8 dígitos: `DDMMAAAA`).
   - Se auto-extrae el **Número de Comprobante** (serie y secuencial en posiciones 24-38).
   - Se auto-extrae el **RUC del Proveedor** (posiciones 10-23) y se selecciona automáticamente de la lista.
3. **Importación XML Directa:** Un botón permitirá cargar el archivo `.xml` del proveedor para auto-completar los datos de cabecera, proveedor (creación rápida si no existe) y el desglose de productos con cantidades, costos unitarios, descuentos y totales de línea.
4. **Enlace con Sucursal y Bodega:** Al guardar, se asocia el egreso a una sucursal y bodega de destino específica, ingresando el stock al Kardex.

---

## 2. Estructura de Submenús en Compras (Barra Lateral)
1. **Historial de Compras** (antes *"Resumen"*) -> Listado completo y registro de compras.
2. **Facturas Recibidas SRI** -> Conciliación y sincronización SRI.
3. **Gastos con IA** -> Captura y clasificación de gastos rápidos.
4. **Notas de Crédito** -> Registro de notas de crédito de proveedores.
5. **Retenciones Emitidas** -> Emisión de retenciones de Renta e IVA.

---

## 3. Cambios Propuestos

### 1. Barra Lateral: `src/App.jsx`
- Renombrar el submenú `compras_resumen` de "Resumen" a "Historial de Compras".
- Actualizar el título y descripción del subtab en el objeto metadatos.

### 2. Módulo de Finanzas: `src/components/finances/FinanceModule.jsx`
- Importar `PurchaseForm`.
- Configurar la renderización de `TransactionsView` para el tab `compras_resumen`.
- Agregar soporte en `TransactionsView` para filtrar por `compras_resumen` (egresos no retenciones).
- Condicionar la apertura del modal global para que, si es una compra (`type === 'egreso'` y no es retención/nota de crédito), dibuje `PurchaseForm` en lugar de `TransactionForm`.

---

## 4. Plan de Verificación

### Pruebas de Compilación
- Ejecutar `npm run build` para asegurar la compilación del proyecto sin errores.

### Pruebas Visuales Manuales
- Validar que el submenú de Compras en la barra lateral diga "Historial de Compras".
- Abrir "Historial de Compras" y hacer clic en `+ Registrar Compra`.
- Validar la visualización del formulario con campos de Sucursal, Bodega, Clave de Acceso, Detalles, Proveedor (con botón de creación rápida '+') y Grilla de Productos.
- Probar pegando una clave de acceso de 49 dígitos y verificar el auto-llenado de fecha, número y selección de proveedor.
- Probar subiendo un archivo XML y verificar la carga automática de los items en la tabla e importes.
