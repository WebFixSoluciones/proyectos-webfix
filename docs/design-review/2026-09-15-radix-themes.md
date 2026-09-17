# Radix Themes en WebFix

## Decisión

Se integra `@radix-ui/themes` 3.3.0, versión exacta aprobada por el usuario y compatible con React 19. Themes 3.0.x declara compatibilidad hasta React 18.

## Alcance

- Proveedor global `WebFixTheme`: apariencia clara, acento azul, grises slate, paneles sólidos y radios medios.
- CSS de Themes en una capa independiente para permitir los estilos de distribución existentes de Tailwind. Los tokens WebFix se vinculan a la paleta de Themes; no se añaden sombras ni desenfoques.
- Componentes compartidos: botones, campos, tarjetas, insignias, tablas, separadores, diálogos y pestañas.
- Controles de pantallas existentes: 607 botones, 347 entradas, 20 áreas de texto, 130 selectores y 46 tablas pasan por componentes comunes. La migración incluye POS, ventas, compras, inventario, finanzas, usuarios, ajustes, acceso y páginas públicas.
- POS, formulario de venta y vista previa conservan el tema cuando se renderizan fuera de la raíz de la aplicación.

## Compatibilidad deliberada

Los selectores mantienen el elemento nativo para conservar `event.target`, valores, validación y selección móvil; reciben el tema compartido. Archivos, casillas, radios, rangos y otros tipos especiales mantienen sus controles nativos. Las tablas de los comprobantes imprimibles conservan su estructura para no introducir contenedores con desplazamiento en la impresión. Esto es una integración global de Themes con adaptadores, no una sustitución de todos los elementos HTML por componentes Radix.

La lógica de persistencia, impuestos, stock y pagos no se modifica en esta migración visual. Los cambios anteriores que ya estaban presentes en el espacio de trabajo se conservan.

## Validación

- Pruebas de comercio existentes: 15 casos.
- Navegador aislado con Firebase en memoria: registro de nota de venta con descripción, impacto en inventario, apertura/cancelación desde POS sin perder carrito, formularios de combo y servicios, vista móvil.
- Componentes compartidos: envío de formulario y `FormData`, selectores y casillas, tabla semántica, foco dentro del diálogo, cierre con Escape, restauración del foco y pestañas con flechas.
- Apertura de 11 submódulos financieros y compras. Estas pruebas comprueban renderizado y errores JavaScript, no certifican cada operación financiera.
- No se emiten comprobantes fiscales ni se modifican datos reales en estas pruebas. No se realiza despliegue.

## Ajustes de Cierre y SuperAdmin

- **Tarjetas POS (`PosProductCard.jsx`)**: Gestión integral de estados (disponible, bajo stock, agotado y servicios). Botón accesible con `disabled:opacity-60`, cursor controlado, límite de dos líneas (`line-clamp-2`) para nombres largos y badges contextuales.
- **Botones de Pago (`PosView.jsx`)**: Normalización de variantes en selección de medios de pago (efectivo, transferencia, tarjeta, crédito) tanto en checkout express como en el asistente paso a paso. Iconos y fondos coherentes con Radix Themes (`solid blue` para seleccionado, `surface gray` neutro para inactivo).
- **Consola SaaS y SuperAdmin (`SuperAdminPage.jsx`)**: Integración de modal emergente para revisión de comprobantes de transferencia bancaria (`selectedTransfer`), gestión y mitigación en modo God Mode, resguardo de aislamiento estricto por inquilino y control de suscripciones y planes.

## Observaciones

La compilación mantiene la advertencia de tamaño del paquete principal. La instalación también informa avisos de seguridad en dependencias del proyecto ajenas a Themes; requieren revisión independiente y no se aplican actualizaciones mayores automáticas.

Documentación oficial: https://www.radix-ui.com/themes/docs/overview/getting-started
