# Especificación de Diseño: Submódulo y Flujo de Preventas

Este documento describe la especificación técnica y de negocio para la incorporación del nuevo submódulo de **Preventas** en la sección de Ventas.

## 1. Contexto de Negocio (Flujo Comercial)
Una preventa es un pedido o venta registrada de forma anticipada antes de la entrega o despacho físico de la mercadería. En el sistema, estas transacciones se emiten legalmente utilizando facturación electrónica normal (autorizadas por el SRI), pero se clasifican internamente como preventas para gestionar operativamente el stock y la entrega.

### Flujo Propuesto:
1. **Emisión de la Preventa:** El usuario puede crear una preventa desde el nuevo submódulo de "Preventas" haciendo clic en `+ Registrar Preventa`. Esto abre el formulario de venta directa (`TransactionForm`) prellenado con la bandera `isPreventa: true` y el estado de despacho `deliveryStatus: 'pendiente'`. El comprobante se genera y autoriza ante el SRI normalmente.
2. **Control de Despacho (Gestión Operativa):** En la lista de "Preventas", el usuario puede visualizar todas las preventas y su estado de despacho:
   - **Pendiente (Clock Icon):** Indica que la mercadería aún no ha sido entregada.
   - **Entregado (Truck Icon):** Indica que el pedido ha sido despachado físicamente.
3. **Acción de Entrega:** Desde la misma fila del listado de preventas, el usuario cuenta con un botón interactivo para alternar/marcar la preventa como "Entregada" o "Pendiente". Esto actualiza el estado directamente en la base de datos sin requerir abrir el formulario.
4. **Separación de Historiales:** Para evitar confusión, las preventas se visualizan únicamente en la pestaña dedicada a **Preventas** y en la pestaña de **Documentos SRI** (como facturas legales), pero se ocultan de la lista de **Historial de Ventas** común para que el usuario pueda diferenciar claramente las ventas directas despachadas en el acto de las preventas pendientes.

---

## 2. Estructura de Submenús en Ventas (Barra Lateral)
El nuevo menú de la sección "Ventas" en la barra lateral se configurará de la siguiente manera:
1. **Historial de Ventas** (antes *"Resumen"*) -> Muestra el listado de ventas regulares (excluyendo preventas).
2. **Registrar Venta** -> Al hacer clic, abre inmediatamente el modal de facturación directa (`TransactionForm`) en blanco, sobre el fondo del Historial de Ventas.
3. **Punto de Venta (POS)** -> Se mantiene sin cambios para facturación de caja rápida.
4. **Preventas** (NUEVO) -> Muestra el listado dedicado de preventas con gestión de estado de despacho y la opción `+ Registrar Preventa`.
5. **Cotizaciones** (antes *"Cotizaciones / Proformas"*) -> Gestión de cotizaciones de clientes.
6. **Notas de Crédito** -> Gestión de notas de crédito comerciales.
7. **Retenciones de Venta** (antes *"Retenciones Recibidas"*) -> Registro de retenciones efectuadas por clientes.

---

## 3. Cambios Propuestos

### 1. Barra Lateral: `src/App.jsx`
- Actualizar el arreglo de submenús en la sección de Ventas.
- Agregar el identificador `preventas` al mapeador de títulos y descripciones de subpestañas.

### 2. Controlador Central: `src/components/finances/FinanceModule.jsx`
- Interceptar cuando `initialSubTab` sea `'ventas_preventa'` para redirigir a `'resumen_ventas'` y abrir el modal global en blanco.
- Añadir el renderizado del submódulo `preventas` en el cuerpo principal de Ventas usando `TransactionsView` con la prop `isPreventaTab={true}`.

### 3. Listado de Transacciones: `src/components/finances/TransactionsView.jsx`
- Soportar la propiedad `isPreventaTab` para filtrar transacciones.
- Ocultar transacciones con `isPreventa === true` de la pestaña general `'ventas_resumen'`.
- Mostrar columna de "Despacho" con estado e interactividad en tiempo real (acción para alternar entre "Pendiente" y "Entregado").
- Cambiar la etiqueta del botón de registro a `+ Registrar Preventa` e inyectar `isPreventa: true` al abrir el formulario cuando se esté en esta pestaña.
