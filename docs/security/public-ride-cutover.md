# Cierre de la lectura pública de comprobantes

La ruta `/api/public-ride` entrega una proyección del RIDE sin campos internos de
inventario, caja, sincronización financiera o configuración SMTP. Las facturas
electrónicas requieren su clave SRI; las notas de venta admiten un token cuando
el documento lo tiene. El visor conserva temporalmente la lectura anterior de
Firestore si la ruta no está disponible para no romper enlaces ya enviados.

Para completar el cierre:

1. Configurar en Vercel `FIREBASE_SERVICE_ACCOUNT_JSON` con una cuenta de servicio
   del proyecto `proyectos-webfix` que tenga solo permisos de lectura en Firestore.
   El valor es secreto del servidor y nunca debe incorporarse al repositorio.
2. Verificar en producción, sin sesión, una factura autorizada por `txId` y clave,
   otra por clave sola, y una nota de venta histórica. Confirmar que el endpoint
   responde sin campos internos.
3. Verificar una nota de venta nueva: su emisión genera `publicRideToken` y los
   enlaces de correo, ventas y POS lo incluyen. Los enlaces históricos sin token
   siguen admitidos en el endpoint, que solo devuelve la proyección del RIDE.
4. Cambiar `firestore.rules` para que `get` y `list` de
   `finances_transactions` exijan pertenecer al tenant. Quitar el fallback de
   Firestore en `PublicRideView`. Probar reglas y enlaces públicos antes de
   publicar ambas partes.

No aplicar el paso 4 antes de comprobar el paso 2: cortaría el acceso público a
los RIDE enviados por correo.
