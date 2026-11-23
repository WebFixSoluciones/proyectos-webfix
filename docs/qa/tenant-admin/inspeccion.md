# Inspección del registro y administración de tenants

Fecha: 13 de noviembre de 2026. Revisión del código, navegador con datos aislados y emulador Firestore. No se crearon ni modificaron cuentas reales, ni se desplegaron cambios.

## Recorrido de una nueva empresa

1. La landing dirige a `/register`, con plan y ciclo opcionales. Los valores desconocidos se normalizan a Starter y mensual.
2. Firebase Authentication crea la cuenta de acceso.
3. Un único lote crea `tenants/{tenantId}`, `users/{uid}` (propietario con rol admin), configuración del emisor y metadatos en `artifacts/{tenantId}/public/data`.
4. La empresa se registra como `pending_approval`, sin fecha de prueba ni suscripción activa. Se registran el propietario, correo de contacto y origen del alta. El superadministrador habilita después los 14 días de prueba.
5. Se solicita verificar el correo y se abre `/verify-email`. Las reglas impiden acceder a los datos operativos sin esa verificación cuando es obligatoria.
6. Al verificar, se entra a `/app`, donde se muestra la espera de aprobación hasta que el superadministrador habilite el tenant. El cliente debe completar datos fiscales, firma electrónica, correo e inventario antes de operar según su actividad.
7. La empresa aparece automáticamente en SuperAdmin → Empresas. El administrador puede revisar preparación, consumo, perfiles y condiciones de acceso.
8. `Usuarios y altas` consulta Authentication y lo cruza con perfiles y empresas, mostrando contactos, datos faltantes y acciones de recuperación y aprobación. Las cuentas sin correo se separan del listado de clientes.
9. Al vencer la prueba o suscripción, la aplicación presenta el portal de suscripción y Firestore bloquea escrituras operativas. Un pago reportado queda pendiente hasta su aprobación por SuperAdmin.

## Correcciones implementadas

| Hallazgo | Resultado |
|---|---|
| Ampliar una prueba actualizaba `expiresAt`, pero las reglas seguían usando `trialExpiresAt` | Guardado sincronizado de la fecha protegida correspondiente a prueba o suscripción |
| La lista podía mostrar activo un tenant vencido | Estado efectivo calculado por fecha y exclusión de vencidos en métricas de cuentas activas |
| El alta manual persistía documentos por separado | Alta transaccional, con comprobación del ID para evitar sobrescrituras concurrentes |
| Un fallo posterior al alta en Authentication podía dejar una cuenta sin empresa | Intento de eliminar la cuenta recién creada cuando falla la provisión; aviso explícito si falla la compensación |
| El alta anual manual daba solo 30 días | Se otorga un año para una suscripción anual activa |
| Fallar el correo de recuperación se presentaba como fallo de creación | Se conserva el alta y se comunica el fallo del correo por separado |
| La lista comprobaba el antiguo campo `active` | Usa `status` y permite gestionar roles y activación de colaboradores |
| Usuarios desactivados conservaban acceso directo a Firestore | Comprobación del estado activo en las reglas; se admite leer el perfil propio para comunicar el bloqueo |
| El superadmin inactivo podía recibir la vista privilegiada en el cliente | AuthContext exige perfil activo también para superadministración |
| Faltaba una ficha de preparación | Estado del propietario, fecha, emisor, firma y correo, sin mostrar contraseñas |
| No había historial administrativo | Eventos por tenant para altas manuales, modificaciones de empresa/suscripción, accesos y aprobaciones de pago; el cliente no puede leerlos ni modificarlos |
| Se descargaban todos los comprobantes para contar consumo | Consultas de conteo en el servidor |
| Menú activo invisible y problemas de espacio en móvil | Colores legibles, cierre de menú móvil y formulario adaptable |

El propietario y los superadministradores se protegen de cambios de rol o desactivación desde los controles de colaboradores. Para suspender a toda la empresa se usa el estado de su suscripción. Cambiar el nombre de la empresa en el panel no cambia automáticamente su razón social fiscal.

## Mejoras siguientes para control integral

1. **Gestión de Authentication desde un servicio administrativo autenticado:** verificación real del correo, revocación de sesiones, recuperación de cuentas huérfanas, invitación de usuarios y transferencia de propietario con auditoría. El panel actual administra perfiles Firestore; no elimina cuentas de Authentication ni cambia correos o contraseñas.
2. **Autenticación y autorización de los servicios HTTP:** `api/send-email` y los proxies SRI no comprueban actualmente el perfil activo del usuario. La revocación incorporada protege Firestore; hace falta extenderla a esos servicios, con controles de tenant y límites de uso.
3. **Límites de plan en el servidor:** las métricas del panel no sustituyen límites de usuarios, productos y módulos aplicados por reglas o servicios autorizados. Un control del navegador no es suficiente.
4. **Acompañamiento de activación:** checklist guiado para el cliente, pruebas reales de firma/correo y filtros de altas pendientes. Las comprobaciones añadidas solo detectan campos configurados, no certifican que SRI o SMTP funcionen.
5. **Respaldo completo y restauración:** la exportación existente enumera seis colecciones y no equivale a un respaldo integral; faltan otras colecciones, archivos de Storage y un procedimiento de restauración probado. La limpieza operativa existente tampoco cubre todo el módulo financiero.
6. **Auditoría extendida:** incorporar rechazos de pago, cambios de planes globales y acciones avanzadas. Los eventos actuales cubren las operaciones indicadas arriba, no toda acción del sistema ni el registro público.
7. **Conciliación comercial:** validar plan, valor esperado, referencias y duplicados antes de aprobar pagos, y gestionar alertas de vencimiento.

## Validación

- 77 pruebas unitarias aprobadas, incluyendo autorización del servicio administrativo, recuperación de registros incompletos y aprobación sin duplicar la prueba.
- Reglas comprobadas con emulador: alta pública, verificación, aislamiento, pagos, revocación/reactivación de usuario, historial protegido y ampliación efectiva de prueba.
- Navegador aislado: alta pública, normalización de parámetros, fallo de provisión con limpieza de cuenta, alta manual anual, gestión de acceso/rol, fecha real, auditoría y protección del propietario.
- Comprobación de escritorio y móvil; recorrido previo de ventas, POS, inventario y módulos financieros sin regresiones.
- Compilación de producción y revisión de errores críticos aprobadas.

## Publicación

Publicar la aplicación junto con `firestore.rules`. La gestión de accesos y el historial nuevos dependen de esas reglas. El servicio `api/admin/users.js` requiere `FIREBASE_SERVICE_ACCOUNT_JSON` en el servidor, para el proyecto `proyectos-webfix`, como el visor público existente. Las credenciales nunca se envían al navegador. No se comprobó su configuración en producción. Este trabajo queda preparado y verificado localmente; no se ha desplegado a producción. Los perfiles históricos sin `status: active` requieren revisión antes de publicar, porque el nuevo control exige ese estado para acceder a los datos.


## Hallazgo confirmado al consultar las reglas publicadas

El 13 de noviembre se comprobó que las reglas publicadas exigen `pending_approval`, correo del propietario y ausencia de fechas de prueba en el alta pública. El formulario del repositorio todavía enviaba `trial` y `trialExpiresAt`. Esa petición es rechazada por las reglas tras crear la cuenta Authentication. No se dispone del registro histórico del intento de un usuario específico para atribuirle inequívocamente ese error, pero la incompatibilidad se reprodujo en el emulador.

Se alineó el registro a la aprobación administrativa conservando las restricciones publicadas sobre pagos, administradores de tenants vencidos y formularios de contacto. Si una cuenta ya existe sin perfil, el cliente puede reanudar el alta autenticándose con su contraseña en el registro; nunca se elimina esa cuenta preexistente.

El panel informa de registros incompletos en el dashboard y el menú `Usuarios y altas`. Permite consultar correo, teléfono disponible, verificación y faltantes. `Completar alta` exige nombre del cliente y empresa confirmados: crea un tenant aislado pendiente y su perfil. `Habilitar tenant` exige aprobación explícita del superadministrador y concede 14 días de prueba con evento de auditoría. Ninguna operación omite la verificación del correo. No se envía correo automáticamente: el enlace de contacto abre el programa de correo del administrador.

Los registros con perfil existente pero empresa ausente se detectan y se señalan; la recuperación automática se reserva a cuentas sin perfil para evitar reasignaciones y pérdida de vínculos históricos. Se consultan páginas de 100 cuentas, con botón para cargar más e indicación de que el conteo es parcial si quedan páginas.
