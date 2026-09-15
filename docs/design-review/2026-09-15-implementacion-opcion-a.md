# Opción A — implementación y validación

## Diseño

Paleta azul, superficies claras, bordes discretos y escala compartida de tipografía, espaciado y controles. Se retiraron sombras, desenfoques, variantes oscuras y numerosas reglas globales que impedían controlar la apariencia de cada pantalla. La base visual alcanza ventas, inventario, finanzas, navegación, configuración y páginas públicas.

Capturas de los componentes reales con datos aislados de prueba:

- [POS](screenshots/pos.png)
- [Venta administrativa](screenshots/venta-administrativa.png)
- [Configuración de combos](screenshots/inventario-combo.png)
- [Venta en móvil](screenshots/venta-movil.png)

## Proceso de venta

1. Elegir productos y cliente en el POS.
2. Revisar importes, descuentos y medios de pago.
3. Abrir la revisión de la venta, con descripción editable por línea.
4. Confirmar el registro o la emisión desde la venta administrativa.
5. Registrar inventario y sincronizar el movimiento financiero y la cuenta por cobrar.

Volver de la revisión conserva el carrito. El bloqueo de procesamiento evita envíos repetidos por clic o teclado. Los documentos guardan un estado pendiente cuando falta completar una integración; el reintento de inventario utiliza referencias estables para evitar duplicaciones.

## Cambios funcionales

- `invoiceDescription` guarda el texto particular de una línea, conservando nombre e identidad del producto. Se utiliza en XML, RIDE, vista pública y ticket.
- Los comprobantes impresos usan los importes de línea guardados, incluidos descuentos y precios con IVA.
- IVA cero, precios incluidos y excluidos y redondeos pasan por funciones compartidas.
- Los pagos combinados separan efectivo aplicado, dinero recibido, vuelto y crédito. El arqueo suma cada medio utilizado.
- El registro de inventario agrupa líneas y componentes de combos y escribe movimientos y saldos juntos. Comprueba disponibilidad dentro de la operación de base de datos.
- Servicios y productos virtuales no consumen existencias. Los combos consumen componentes; las variantes conservan su producto padre.
- Traslados y ajustes del módulo nuevo usan el mismo registro de inventario; los traslados mantienen el costo de origen.
- Alta y edición de productos sincronizan los catálogos utilizados por inventario y ventas. La baja conserva el historial mediante desactivación.
- La sincronización financiera usa referencias estables, conserva abonos existentes y registra el desglose inicial de pagos.
- Las compras con inventario y las compras iniciales nuevas conservan una referencia para completar un registro pendiente sin duplicarlo.
- La anulación interna de notas de venta revierte su inventario y marca los registros financieros. Una factura fiscal no se presenta como anulada solamente por cambiar un estado local.

## Verificación

- `npm test`: pruebas de cálculo, pagos, combos, stock, reintentos, transferencia, sincronización financiera, descripción XML e impresión.
- `npm run test:browser`: venta administrativa guardada con descripción personalizada, actualización de inventario, regreso del POS conservando el carrito, selección de componentes de combo y presentación móvil sin desbordamiento ni excepciones JavaScript.
- `npm run lint`: revisión general del código.
- `npm run build`: compilación para producción.

Las pruebas del registro de datos usan un adaptador en memoria y las del navegador sustituyen Firebase con datos aislados. Las solicitudes externas del navegador están bloqueadas. El ejecutor de navegador utiliza Playwright y Edge; permite indicar la ubicación de Playwright con `WEBFIX_BROWSER_MODULES`.

## Alcance pendiente de verificación externa

No se desplegaron cambios ni se emitieron documentos reales ante el SRI. No se probaron firma electrónica, correo, impresoras físicas, reglas de seguridad de Firebase ni concurrencia contra un emulador o servidor real. La emisión fiscal y las integraciones locales son etapas separadas: una interrupción posterior a la autorización puede requerir completar la integración pendiente.

La compilación conserva una advertencia por el tamaño del paquete principal. La unificación visual global no equivale a una prueba funcional exhaustiva de todos los submódulos del ERP; las pruebas de esta entrega se concentran en los recorridos descritos arriba.
