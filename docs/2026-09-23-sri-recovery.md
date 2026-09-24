# Facturación SRI: persistencia y recuperación

## Incidente comprobado

La consulta de autorización oficial en producción confirmó que la factura
001-001-000000164 del emisor 1754376901001 fue autorizada el
21/09/2026 a las 11:30:44, UTC-05:00. La respuesta original y el XML autorizado
se conservaron en `.local-sri/`, excluido de Git por contener datos del cliente.
Esta comprobación no significa que se haya importado a la base productiva.
En producción se comprobó que Ventas termina en la factura 163 y que el
configurador aún indicaba 164 como siguiente. El 24/09/2026 se cambió a 165
y se verificó el valor persistido tras recargar la página.

## Causa encontrada en el código

El flujo incrementaba el secuencial, enviaba al SRI y guardaba la venta únicamente
después de recibir autorización. Su manejo general de errores revertía el
secuencial incluso si el SRI había autorizado y el fallo ocurría al guardar,
sincronizar inventario o sincronizar finanzas. Un timeout tampoco demostraba un
rechazo. Es un mecanismo que explica el caso reportado; no hay una traza histórica
del error del navegador para confirmar cuál operación específica falló ese día.

## Cambios

- Reserva atómica de documento, clave, XML firmado y secuencial antes del envío.
- Contador persistente por tenant, RUC, ambiente, tipo documental y serie; la
  configuración anterior se mantiene compatible y no puede bajar el contador.
- Firma inválida o fallo de reserva impiden enviar. Después de reservar no se
  libera el número por un error de red o una operación posterior.
- Consultas de autorización conservan la clave y no convierten un timeout en rechazo.
- Un reintento explícito consulta primero y, si aún no hay resolución, usa el
  mismo XML firmado; nunca genera otra clave para ese intento.
- Respuestas 43 y 70 conducen a consultar autorización; no a reutilizar el número.
- Una autorización confirmada no se degrada por una respuesta tardía de error.
- Inventario y finanzas se completan con sus operaciones idempotentes existentes;
  su fallo queda visible como sincronización pendiente.
- Recuperación por clave valida RUC y ambiente del tenant, conserva un registro
  existente compatible o crea una factura recuperada. Nunca deduce cobros ni
  vínculos de productos. Los registros nuevos quedan por conciliar.
- El recuperador eleva el siguiente número al menos al autorizado + 1, respetando
  cualquier número mayor. Rechaza conflictos con otra clave o un borrador ambiguo.
- Descargas conservan XML firmado/autorizado original. No regeneran ni firman
  el comprobante histórico. Se ofrece respuesta SRI original, RIDE imprimible
  y acceso al portal oficial. Los enlaces RIDE respetan HashRouter.
- El RIDE conserva emisor, receptor y valores de líneas históricos; no inventa
  una fecha de autorización cuando no se ha confirmado.
- Cerrar un intento fiscal guardado desde el POS lo lleva a Ventas y evita dejar
  ese mismo intento en el carrito para emitir otra venta accidentalmente.

## Aplicación a la factura reportada

1. Publicar esta versión y mantener detenida la reemisión del comprobante afectado.
   El número siguiente ya quedó en 165 en producción; el código publicado
   todavía debe incluir el contador duradero y la recuperación.
2. En Ventas, usar «Consultar y recuperar del SRI» con la clave original.
3. Verificar número, autorización, XML y RIDE. El siguiente número será al menos
   165 para esa serie y ambiente; nunca reducir manualmente el contador.
4. Si se recupera un registro nuevo, revisar movimientos preexistentes de cobro,
   CxC, banco e inventario antes de conciliarlos. El XML fiscal por sí solo no
   prueba que se haya cobrado ni identifica inequívocamente productos locales.

No se emitieron comprobantes reales durante las pruebas ni se modificó el tenant
productivo. La herramienta de sesión del navegador no estuvo disponible para
ejecutar la importación productiva desde esta tarea.

## Opciones de evolución

**A. Corrección inmediata (implementada en el código):** persistencia previa,
consulta y recuperación manual segura, seguida de conciliación visible.

**B. Servicio fiscal en servidor (recomendado como siguiente etapa):** trasladar
firma, envío y consultas a una cola durable con reintentos controlados, control de
concurrencia, almacenamiento de documentos y seguimiento aunque se cierre el
navegador. Requiere diseño y despliegue de backend; no está incluido en este cambio.

## Normativa y límites

Referencia revisada: [SRI, esquema off-line, ficha técnica 2.34, julio de 2026](https://www.sri.gob.ec/facturacion-electronica).
Esta corrección aborda identidad, recepción, autorización y conservación de XML.
No certifica el cumplimiento completo de todos los tipos de comprobantes,
retenciones, reglas fiscales ni esquemas XSD del sistema.
La revisión integral debe incluir el anexo 26 (identificación del proveedor del
software), requisitos y vigencias de las resoluciones aplicables. El RUC del
proveedor del software no se debe inferir del RUC de un tenant.

## Validación

- `npm test`: operaciones comerciales y regresiones fiscales con almacén transaccional simulado.
- `node tests/browser-sri-run.mjs`: recuperación desde Radix UI, descarga del XML
  intacto, consulta de un pendiente y salida del POS; SRI y Firebase aislados.
- Compilación de producción y lint de los archivos del cambio fiscal.
- El parser también se contrastó localmente con la respuesta real autorizada de
  la factura reportada, sin incorporarla a los fixtures públicos.
