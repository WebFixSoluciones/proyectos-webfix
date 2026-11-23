# Auditoría QA Integral — WebFix ERP

**Proyecto:** `proyectos-webfix`
**Fecha de auditoría:** 09/11/2026
**Commit auditado:** `3322a05` — `fix(skills): corregir delimitadores YAML frontmatter...` (21/10/2026)
**Rama:** `main` (árbol de trabajo limpio, sin cambios locales)
**Stack:** React 19 · Vite 8 · Tailwind CSS 4 · Firebase (Auth + Firestore + Storage) · React Router 7
**Tipo de auditoría:** QA funcional, revisión de código, seguridad multi-tenant y calidad de entrega
**Auditor:** Agente QA (revisión estática + ejecución de test/build/lint)

---

## 0. Ficha técnica y limitaciones

### 0.1 Alcance

| Área | Cubierto |
|---|---|
| Navegación y ruteo (Sidebar → módulo → submódulo) | Sí |
| Ventas: historial, emisión, preventas, cotizaciones, notas de crédito, retenciones, descuentos | Sí |
| Compras: historial, registro, gastos, notas de crédito/débito, retenciones, SRI compras | Sí |
| Finanzas: 11 submódulos (movimientos, CxC, CxP, bancos, tarjetas, préstamos, OCR, resumen, contabilidad, impuestos, reportes) | Sí |
| Inventario: productos, servicios, categorías, marcas, bodegas, movimientos | Sí |
| Personas: clientes y proveedores (ficha 360°) | Sí |
| Ajustes: 7 pestañas (empresa, SRI, correo, bodegas, usuarios, recuperación, apariencia) | Sí |
| Suscripción: 5 submódulos y checkout | Sí |
| SuperAdmin: dashboard, tenants, monitor SRI, aprobaciones, tarifas | Sí |
| Landing page y formulario de contacto | Sí |
| Flujos end-to-end (compra → CxP → pago; cotización → venta; venta → SRI → correo → RIDE; POS; gastos) | Sí |
| Reglas Firestore y aislamiento multi-tenant | Sí |

### 0.2 Método

1. **Ejecución automatizada:** `npm test`, `npm run build`, `npx eslint src --format json`.
2. **Revisión estática dirigida:** lectura de `App.jsx`, `Sidebar.jsx`, `FinanceModule.jsx`, `AuthContext.jsx`, `firestore.rules`, servicios SRI/finanzas y las 40+ vistas de módulo.
3. **Trazado de flujos:** seguimiento de cada identificador de navegación hasta su rama de render, y de cada acción de negocio hasta su escritura en Firestore.
4. **Búsqueda de patrones de riesgo:** `TODO/FIXME`, `window.confirm/alert`, `href="#"`, handlers vacíos, datos mock, hardcodes de identidad.

### 0.3 Limitaciones (declaración honesta)

- **No se ejecutó una prueba click-through en vivo** contra Firebase, SRI ni pasarela de pagos: no se dispone de credenciales, certificado `.p12` ni entorno sembrado.
- Los hallazgos de comportamiento se derivan de la lectura del código y de las reglas; algunos requieren **confirmación en emulador/staging** (marcados como `[verificar en staging]`).
- No se evaluó rendimiento real de red ni Core Web Vitals; solo tamaño de bundle y estructura.
- La revisión visual se basa en estructura JSX/clases, no en capturas de cada pantalla.

---

## 1. Veredicto ejecutivo

> **Estado: NO APTO para producción.**
> El ERP tiene una base funcional amplia y un flujo fiscal bien construido, pero presenta **7 defectos críticos** que incluyen pérdida de datos silenciosa, pantallas principales en blanco, escalada de plan sin pago y un crash de runtime en el flujo de corrección de facturas.

### 1.1 Scorecard cualitativo

| Dimensión | Nota | Comentario |
|---|---:|---|
| Navegación y ruteo | 5/10 | 2 destinos del menú no renderizan; 1 pantalla inalcanzable |
| Ventas y facturación SRI | 6/10 | Flujo feliz completo; crash en reemisión y edición |
| Compras | 5/10 | Registro inaccesible desde menú; SRI compras no implementado |
| Finanzas | 7/10 | 11 submódulos operativos; confirmaciones destructivas rotas |
| Inventario | 6/10 | Borrado permanente accidental por lógica de confirmación |
| Personas | 8/10 | Ficha 360° y crédito bien resueltos |
| Ajustes | 4/10 | Gestión de usuarios es maqueta |
| Suscripción / SaaS | 2/10 | Planes pagos gratis y auto-escalada por reglas |
| SuperAdmin | 5/10 | Funciona parcialmente; métricas de equipo ficticias |
| Seguridad multi-tenant | 3/10 | Reglas incompletas y lectura pública de comprobantes |
| Calidad de código | 4/10 | 97 errores de lint, tests parciales, sin CI |

**Promedio ponderado: 5.0 / 10.**

### 1.2 Top 5 riesgos de negocio

1. **Cobro evadible:** cualquier miembro del tenant puede activar un plan pagado editando Firestore; además el checkout "Sandbox" lo hace con un clic.
2. **Pérdida de datos:** `window.confirm` devuelve una *Promise* y se usa sin `await`; las eliminaciones/anulaciones se ejecutan sin confirmar y los productos se borran permanentemente.
3. **Pantalla principal vacía:** "Registrar Compra" del menú lateral no tiene rama de render.
4. **Crash en corrección fiscal:** `Edit2` no está importado; el detalle de comprobantes no autorizados rompe el render.
5. **Transferencias inoperantes:** la colección `transfers` no tiene reglas Firestore; el flujo de aprobación de pagos por transferencia queda bloqueado o abierto según el entorno.

---

## 2. Resumen de hallazgos

| Severidad | Cantidad | IDs |
|---|---:|---|
| 🔴 Crítica | 7 | C-01 … C-07 |
| 🟠 Alta | 10 | A-01 … A-10 |
| 🟡 Media | 10 | M-01 … M-10 |
| 🔵 Baja | 5 | B-01 … B-05 |
| **Total** | **32** | |

### Índice rápido

**Críticos**
- C-01 · Auto-escalada de plan desde el cliente
- C-02 · Pasarela Sandbox activa planes pagos gratis
- C-03 · `Edit2` no importado → crash en Paso 2
- C-04 · "Registrar Compra" renderiza en blanco
- C-05 · `transfers` sin reglas Firestore
- C-06 · `window.confirm` sin `await` → acciones destructivas sin confirmación
- C-07 · Sin gestión real de usuarios; registro sin verificación

**Altos**
- A-01 · `esSuperAdmin()` hardcodeado a un correo
- A-02 · Lectura pública de comprobantes y enumeración
- A-03 · Trial sin control de expiración
- A-04 · SRI de compras no implementado y vista no montada
- A-05 · Métricas de equipo en SuperAdmin sobre datos legacy
- A-06 · Pérdida silenciosa de leads de la landing
- A-07 · Compras importadas marcadas "autorizado" sin verificar
- A-08 · Autor de auditoría hardcodeado
- A-09 · Recuperación de contraseña no funcional
- A-10 · Sin gate de calidad en CI

---

## 3. Matriz de módulos y pantallas

Leyenda: ✅ operativa · ⚠️ operativa con defectos · ❌ rota / vacía · 🚫 inalcanzable · 🧪 maqueta

### 3.1 Ventas (7 submódulos)

| Submódulo | ID de navegación | Estado | Observación |
|---|---|---|---|
| Historial de Ventas | `resumen_ventas` | ✅ | Paginación 25/50/100, filtros por tipo/mes/año, badges por estado |
| Registrar Venta | `ventas_nueva` | ✅ | `TransactionForm` con 7 tipos de comprobante |
| Preventas | `preventas` | ✅ | CRUD y conversión |
| Cotizaciones | `quotes` | ✅ | CRUD, RIDE y promoción a factura |
| Notas de Crédito | `nota_credito` | ✅ | `TransactionsView` filtrado + emisión referenciada |
| Retenciones de Venta | `retencion` | ⚠️ | Emisión OK; consulta de retenciones recibidas no existe |
| Descuentos y Promociones | `discounts` | ⚠️ | CRUD OK; confirmaciones destructivas rotas (C-06) |

> **Nota sobre la captura del usuario:** los identificadores del Sidebar y los rótulos son correctos; el aspecto "roto" observado era codificación de consola, no corrupción del archivo. No es un defecto de producto.

### 3.2 Compras (5 submódulos)

| Submódulo | ID | Estado | Observación |
|---|---|---|---|
| Historial de Compras | `compras_resumen` | ✅ | Filtros y acciones |
| **Registrar Compra** | `compras_preventa` | ❌ | **Sin rama de render → área en blanco (C-04)** |
| Notas de Crédito / Débito | `compras_nc`, `compras_nd` | ✅ | |
| Retenciones de Compra | `compras_retencion` | ✅ | |
| SRI Compras | — | 🚫 | Componente `ComprasSriView` existe pero **no está montado**; su consulta es un `TODO` |

El wizard de compra (`PurchaseForm`, 3 pasos, importación XML, costo promedio, banco/crédito) funciona cuando se abre por la barra interna o por el selector de método — **no** desde el menú lateral.

### 3.3 Finanzas (11 submódulos)

| Submódulo | Estado | Observación |
|---|---|---|
| Movimientos Financieros | ⚠️ | Confirmaciones sin await |
| Cuentas por Cobrar | ✅ | Cobros formales con banco |
| Cuentas por Pagar | ✅ | Pagos con retención |
| Bancos y Caja | ⚠️ | Anulaciones sin confirmación real |
| Tarjetas y Créditos | ✅ | Consumos diferidos |
| Préstamos Bancarios | ⚠️ | Eliminación sin confirmación |
| Captura Inteligente (OCR) | ✅ | |
| Resumen Financiero | ✅ | KPIs, aging, forecast |
| Contabilidad | ⚠️ | Asientos; confirmaciones rotas |
| Impuestos y SRI | ✅ | |
| Reportes Especializados | ⚠️ | Duplicidad con `ReportsView` (M-01) |

### 3.4 Inventario (6 submódulos)

| Submódulo | Estado | Observación |
|---|---|---|
| Catálogo de Productos | ❌* | **Borrado permanente accidental (C-06)** |
| Servicios | ✅ | Sin stock, SKU propio |
| Categorías | ✅ | |
| Marcas | ✅ | |
| Bodegas | ✅ | |
| Movimientos / Kardex | ⚠️ | Autor "Administrador" hardcodeado (A-08) |

\* Funcional, pero la ruta de eliminación es peligrosa.

### 3.5 Personas, Ajustes, Suscripción y SuperAdmin

| Módulo | Estado | Observación |
|---|---|---|
| Clientes | ✅ | Ficha 360°, crédito, historial |
| Proveedores | ✅ | Términos, régimen fiscal |
| Ajustes → Empresa / SRI / Correo / Bodegas / Apariencia | ✅ | |
| Ajustes → Usuarios y Roles | 🧪 | Datos mock, sin Auth real (C-07) |
| Ajustes → Recuperar Facturas SRI | ✅ | Panel montado |
| Suscripción → Planes / Checkout | ❌ | Sandbox activa planes (C-01, C-02) |
| Suscripción → Historial de Pagos | ⚠️ | Depende de `transfers` sin reglas (C-05) |
| SuperAdmin → Dashboard | ⚠️ | Conteos de equipo legacy (A-05) |
| SuperAdmin → Tenants | ✅ | CRUD y purga de datos |
| SuperAdmin → Monitor SRI Global | ✅ | Reconciliación masiva e individual |
| SuperAdmin → Aprobaciones | ⚠️ | `transfers` sin reglas (C-05) |
| SuperAdmin → Tarifas y Planes | ✅ | |

---

## 4. Hallazgos críticos

### C-01 · Auto-escalada de plan desde el cliente
**Módulo:** Suscripción / Seguridad multi-tenant
**Evidencia:**
- `firestore.rules:122` → `allow update: if userBelongsToTenant(tenantId);` (sin restricción de campos).
- `src/pages/billing/BillingPortal.jsx:259-262` → `updateDoc(doc(db,'tenants',tenantId), { planId, planStatus:'active' })` ejecutado desde el navegador.

**Impacto:** cualquier usuario autenticado del tenant (no solo el admin) puede cambiar `planId`, `planStatus`, `maxUsers`, `expiresAt` o suspenderse a sí mismo. Se pierde el control comercial y se expone el modelo SaaS.

**Reproducción:** autenticarse con un usuario normal y ejecutar en consola `updateDoc` sobre su tenant; o modificar el estado local del checkout.

**Recomendación:**
1. Restringir la regla a `esSuperAdmin()` y a un conjunto explícito de campos no sensibles.
2. Mover la activación a una Cloud Function que valide el comprobante de la pasarela (webhook firmado).
3. Separar `plan`/`billing` en una colección escribible solo por backend.
4. Añadir test de reglas con el emulador para cada rol.

**Esfuerzo:** 1–2 días.

---

### C-02 · La pasarela "Sandbox" activa planes pagados sin cobro
**Módulo:** Suscripción
**Evidencia:** `BillingPortal.jsx:248-265` (`completePayPhoneSim`), botón rotulado **"Pasarela PayPhone (Sandbox)"**.

**Impacto:** un clic otorga el plan seleccionado (`planStatus:'active'`) sin transacción real. Si se despliega así, es fraude directo y riesgo reputacional.

**Recomendación:** deshabilitar el simulador en producción con feature flag (`VITE_ALLOW_SANDBOX`), integrar PayPhone real con confirmación server-side, y auditar `transfers`/`payment_vouchers` para detectar activaciones sin pago.

**Esfuerzo:** 1 día (bloqueo) + 3–5 días (integración real).

---

### C-03 · `Edit2` no importado → `ReferenceError` en el Paso 2
**Módulo:** Ventas / Detalle de comprobante
**Evidencia:**
- `src/components/finances/TransactionForm.jsx:16-21` — bloque de importación de `lucide-react` **sin `Edit2`**.
- Usos en `TransactionForm.jsx:3620` y `3737`.
- ESLint lo reporta como `no-undef`; `vite build` **no** falla porque no resuelve identificadores.

**Impacto:** al renderizar el Paso 2 de un comprobante no autorizado, devuelto o pendiente (donde se muestran los botones "Editar y Corregir"), React lanza `ReferenceError: Edit2 is not defined` y la vista queda en blanco. Rompe el flujo del Walkthrough #61.

**Recomendación:** añadir `Edit2` al import; ejecutar `eslint` en CI (A-10); opcional `tsc --noEmit` o migración gradual a TS.

**Esfuerzo:** 5 minutos (fix) + 1 día (gate CI).

---

### C-04 · "Registrar Compra" renderiza un área en blanco
**Módulo:** Compras
**Evidencia:**
- `Sidebar.jsx` envía `compras_preventa` (y `compras_preventa_<timestamp>` desde atajos).
- `FinanceModule.jsx` **no** contiene la cadena `compras_preventa`; en `mode === 'compras'` solo hace `setActiveTab(initialSubTab)`.
- Las únicas ramas de compras renderizadas son `compras_resumen`, `compras_nc`, `compras_nd`, `compras_retencion`.

**Impacto:** la acción principal del módulo Compras no abre nada. El usuario percibe el módulo como roto.

**Recomendación:** mapear `compras_preventa` → abrir `PurchaseForm` (o el selector de método) y sincronizar el estado; añadir un test de humo que recorra **todos** los IDs del Sidebar y verifique que renderizan contenido.

**Esfuerzo:** 2–4 horas.

---

### C-05 · La colección `transfers` no tiene reglas Firestore
**Módulo:** Suscripción / SuperAdmin
**Evidencia:** `firestore.rules` define `payment_vouchers` (línea 133) pero **no** `transfers`. Escrituras/lecturas en `BillingPortal.jsx:211,268,304` y `SuperAdminPage.jsx:123,250,264,1424`.

**Impacto:** con el deny por defecto, el usuario no puede registrar una transferencia y el SuperAdmin no puede listarlas/aprobarlas → "Aprobaciones" vacía y pagos manuales imposibles. Si el proyecto se probó con reglas abiertas, el riesgo es el inverso (exposición total).

**Recomendación:** definir `match /transfers/{id}` con lectura por tenant o superadmin, creación autenticada con `tenantId` validado y estados permitidos; actualización solo superadmin; probar con emulador.

**Esfuerzo:** 3–4 horas.

---

### C-06 · `window.confirm` global devuelve una Promise y se usa sin `await`
**Módulo:** Transversal (Finanzas, Inventario, Personas)
**Evidencia:**
- `App.jsx:349` sobreescribe `window.confirm` para devolver `Promise<boolean>`.
- Call sites sin `await`: `BancosCajaView.jsx:79,94`; `ContabilidadView.jsx:101,116,127,133`; `DiscountsPromotionsView.jsx:137,178`; `MovimientosView.jsx:84`; `PrestamosView.jsx:243`; `CustomerDetailView.jsx:250`; `ThirdPartiesView.jsx:73`.
- `InventoryModule.tsx:292` (`if (!window.confirm(...)) return;`) y `:296` (`permanent = window.confirm(...)`).
- `ProductsView.jsx:131` hace `await` pero descarta el resultado (no hay guarda).

**Impacto:**
- `if (!promise)` siempre es falso → **anulaciones, eliminaciones y cambios de estado se ejecutan sin confirmación**.
- En inventario, `permanent` siempre es truthy → **todo producto sin historial se elimina permanentemente**, nunca se desactiva.
- Riesgo alto de pérdida de datos y de operaciones irreversibles por un clic.

**Recomendación:** crear `confirmAction(message): Promise<boolean>` y reemplazar todos los call sites; o eliminar el override y usar un modal propio. Añadir regla ESLint `no-alert` y una prueba unitaria del helper.

**Esfuerzo:** 1 día.

---

### C-07 · Sin gestión real de usuarios/equipo; registro sin verificación
**Módulo:** Ajustes / Registro / SuperAdmin
**Evidencia:**
- `App.jsx:84` → `useState(MOCK_USERS)` (Carlos Ruiz, Ana Torres, Luis Gómez, Cliente X).
- `GeneralSettings` ("Usuarios y Roles") solo escribe `meta/info.users`; no crea cuenta de Firebase Auth, ni `/users/{uid}`, ni invitaciones.
- Solo el SuperAdmin crea usuarios reales (app temporal de Firebase).
- `RegisterPage.jsx:54-78` crea tenant + admin con `planStatus:'trial'`, `status:'active'`, `expiresAt` a 14 días, **sin verificar correo ni aprobar**.

**Impacto:** un admin de tenant no puede invitar, desactivar ni asignar roles; los conteos `N/maxUsers` y "Cuentas registradas" son ficticios; cualquiera puede crear tenants ilimitados con trials de 14 días.

**Recomendación:** invitaciones vía Cloud Function + custom claims (`tenantId`, `role`); migrar `meta/info.users` a `/users`; verificación de email; rate limit por IP/dominio; opción de aprobación manual.

**Esfuerzo:** 5–8 días.

---

## 5. Hallazgos altos

### A-01 · `esSuperAdmin()` hardcodea un correo
`firestore.rules` compara con `aurresta@webfixsoluciones.net`. Si cambia el correo o se crea otro superadmin, se pierde acceso o se depende de una cuenta personal.
**Fix:** custom claim `superadmin: true` o colección `/superadmins/{uid}`.

### A-02 · Lectura pública de comprobantes y enumeración
`finances_transactions` permite `get` público y `list` con `limit <= 1`. Cualquiera con un ID puede leer una factura completa (nombre, RUC, correo, montos) y el límite 1 permite sondeo.
**Fix:** token de compartición firmado o Cloud Function que devuelva solo el subconjunto público del RIDE; rate limiting.

### A-03 · Trial sin enforcement
`expiresAt` se escribe (`RegisterPage.jsx:66`) pero **no se evalúa** en `App.jsx`; solo bloquea `planStatus === 'suspended'`. Los trials son infinitos y los impagos siguen operando.
**Fix:** guard de expiración en `AuthContext`/`App` + job diario de suspensión.

### A-04 · SRI de compras no implementado y vista no montada
`ComprasSriView.jsx:134` contiene `// TODO: Integrate with real SRI API (SOAP/REST)`; además el componente **no se importa en ninguna parte** (solo existe el breadcrumb `compras_sri` en `App.jsx:677`).
**Fix:** montar la vista y conectar la consulta real (o carga manual de XML) antes de comercializar el módulo.

### A-05 · Métricas de equipo en SuperAdmin sobre datos legacy
"Cuentas de Usuarios Registradas" y "Usuarios en Equipo" leen `meta/info.users`, no `/users`.
**Fix:** consultar `/users` por `tenantId`.

### A-06 · Pérdida silenciosa de leads de la landing
`LandingContact.jsx:48-52` captura el error de Firestore y aun así muestra "enviado".
**Fix:** mostrar error, reintentar y/o enviar a un endpoint serverless con correo de respaldo.

### A-07 · Compras importadas marcadas "autorizado" sin verificar
El estado `sriStatus:'autorizado'` se asigna solo por existir `claveAcceso` (importación XML), sin consultar autorización.
**Fix:** consultar el SRI o marcar `pendiente_verificacion`.

### A-08 · Autor de auditoría hardcodeado
`AdjustmentModal.tsx:107,120` y `TransferModal.tsx:124` escriben `'Administrador'`.
**Fix:** usar `profile.name`/`uid` del `AuthContext`.

### A-09 · Recuperación de contraseña no funcional
`LoginPage.jsx:134-140` solo muestra un toast ("comunícate con tu administrador").
**Fix:** `sendPasswordResetEmail` de Firebase.

### A-10 · Sin gate de calidad en CI
No existe `.github/workflows`. `npm run build` pasa con `no-undef`; `npm test` solo ejecuta 3 de 5 archivos de test.
**Fix:** pipeline con `eslint --max-warnings=0`, `npm test` completo, `npm run build` y (opcional) `tsc --noEmit`.

---

## 6. Hallazgos medios

| ID | Hallazgo | Evidencia | Impacto | Fix |
|---|---|---|---|---|
| M-01 | Dos pantallas de reportes solapadas | `FinanceModule.jsx:584` (`ReportesView`) y `:592` (`ReportsView`) | Confusión, mantenimiento duplicado | Unificar en una sola vista con pestañas |
| M-02 | Código muerto | `AccountsReceivablePayable.jsx`, `SalesDashboard.jsx` sin import | Peso y deuda | Eliminar |
| M-03 | "Papelera" inalcanzable | Breadcrumb en `App.jsx:591`, sin rama ni menú | Función fantasma | Implementar o eliminar |
| M-04 | Redes sociales del footer a homepages | `LandingLayout.jsx` (`twitter.com`, `linkedin.com`, …) | Mala imagen | Enlazar perfiles reales |
| M-05 | Errores de suscripción silenciados | `BillingPortal.jsx:217` `console.warn` | Fallos invisibles | Mostrar estado de error |
| M-06 | Cobertura de tests incompleta | `npm test` corre 3 archivos; quedan fuera `phase1-security-fiscal` y `landing-animation` | Regresiones no detectadas | Incluir todos |
| M-07 | Bundle principal elevado | 1.669 kB (354 kB gzip) sin lazy por módulo | Carga inicial lenta | `React.lazy` por módulo/ruta |
| M-08 | `Date.now()` en render | `PosView.jsx:926` | Impureza React | Mover a handler/estado |
| M-09 | Errores silenciados (`no-empty`) | `sriService.js:959,972`; `TransactionForm.jsx:1537` | Diagnóstico difícil | Log + propagación |
| M-10 | Sin permisos granulares | Solo distingue `superadmin` vs resto | Riesgo operativo | Roles por módulo (admin, cajero, contador, bodega) |

---

## 7. Hallazgos bajos

| ID | Hallazgo | Evidencia |
|---|---|---|
| B-01 | Breadcrumb huérfano `compras_sri` | `App.jsx:677` |
| B-02 | Warnings de hooks | `exhaustive-deps`, `preserve-manual-memoization` (MovimientosView:120) |
| B-03 | `no-unused-vars` masivo | 26 archivos con lint |
| B-04 | Hex hardcodeados en vez de tokens | LandingHome 84, TransactionForm 34, LandingLayout 25, GeneralSettings 19 |
| B-05 | `console.*` en producción | App 20, PosView 16, GeneralSettings 13, TransactionForm 13 |

---

## 8. Flujos de negocio end-to-end

### 8.1 Compra → CxP → Pago
**Estado: ⚠️ operativo con bloqueo de entrada.**
- `PurchaseForm` (3 pasos) funciona: proveedor, ítems con IVA por tarifa, costo promedio, banco/crédito, XML.
- `integracionFinanzasService.sincronizarDocumento` es idempotente (ID fijo), conserva abonos y escribe `fin_cxp`, `fin_movimientos` y `mov_doc_<id>`.
- **Roto:** el acceso desde el menú (C-04) y la conciliación SRI de compras (A-04).
- **Riesgo:** estado `autorizado` sin verificación (A-07).

### 8.2 Cotización → Venta
**Estado: ✅ operativo.**
- CRUD, RIDE, promoción a factura con prellenado de cliente e ítems.

### 8.3 Venta → SRI → Correo → RIDE
**Estado: ⚠️ flujo feliz OK; corrección rota.**
- Reserva atómica de secuencial y clave de 49 dígitos antes de la red; nunca se decrementa.
- Firma `.p12`, SOAP con reintentos y polling con backoff `[3s, 6s, 10s, 15s]`.
- Correo a cliente y emisor con reintento y copia alternativa.
- **Roto:** reemisión/edición por C-03 (crash al renderizar).
- **Riesgo:** `Edit2` solo se manifiesta en comprobantes no autorizados.

### 8.4 POS
**Estado: ✅ operativo.**
- Cobro combinado, crédito con PIN de supervisor, borradores en Firestore, atajos.
- **Menor:** `Date.now()` en render (M-08).

### 8.5 Control de gastos
**Estado: ✅ operativo.**
- `ComprasGastosView` + OCR; sincronización a movimientos.
- **Riesgo:** confirmaciones destructivas (C-06).

### 8.6 Nota de crédito
**Estado: ✅ operativo.** Referencia factura sustento, motivo y XML.

### 8.7 Retenciones
**Estado: ⚠️ emisión OK; recepción no implementada.** No hay bandeja de retenciones recibidas ni conciliación.

---

## 9. Seguridad y multi-tenant

| Control | Estado | Detalle |
|---|---|---|
| Aislamiento por `tenantId` en `fin_*` | ✅ | `userBelongsToTenant()` en 13 colecciones |
| Aislamiento en `finances_*` e `inventory_*` | ✅ | Validado |
| Escritura de plan | ❌ | C-01 |
| `transfers` | ❌ | C-05 |
| Lectura pública de comprobantes | ⚠️ | A-02 |
| Rol superadmin | ⚠️ | A-01 (email hardcodeado) |
| Registro / trial | ⚠️ | C-07, A-03 |
| Recuperación de contraseña | ⚠️ | A-09 |
| Autoría de auditoría | ⚠️ | A-08 |
| Verificación de email | ❌ | No existe |

**Conclusión:** el aislamiento de datos operativos está bien resuelto; el plano **comercial y de identidad** es el eslabón débil.

---

## 10. Pantallas faltantes y funcionalidades incompletas

| # | Elemento | Estado | Prioridad |
|---|---|---|---|
| 1 | SRI Compras (bandeja/consulta) | No montada + `TODO` | P1 |
| 2 | Gestión real de usuarios e invitaciones | Maqueta | P0 |
| 3 | Recuperación de contraseña | Toast | P1 |
| 4 | Aprobaciones de transferencia | Bloqueada por reglas | P0 |
| 5 | Papelera | Inalcanzable | P2 |
| 6 | Roles/permisos por módulo | Inexistente | P2 |
| 7 | Retenciones recibidas | Inexistente | P2 |
| 8 | Verificación de email / onboarding | Inexistente | P1 |
| 9 | Auditoría visible (quién cambió qué) | Parcial y con autor hardcodeado | P2 |
| 10 | Estado de suscripción con facturas reales | Depende de `transfers` | P1 |

---

## 11. Observaciones de consistencia visual (revisión de código)

> No sustituye una pasada visual en navegador; son inconsistencias detectables en el código.

1. **Encabezados heterogéneos:** conviven `FinancialPageHeader`, headers custom y títulos sueltos; conviene un único componente.
2. **Tokenización incompleta:** 84 hex en `LandingHome.jsx`, 34 en `TransactionForm.jsx`, 25 en `LandingLayout.jsx`; el estándar Brevo pide tokens (`--brand-*`).
3. **Dos vistas de reportes** con jerarquías y filtros distintos (M-01).
4. **Inputs locales:** `GeneralSettings.jsx:988` define `inputClass` propio en vez de `UiInput`.
5. **Breadcrumb fantasma** `compras_sri` (B-01).
6. **Footer con enlaces placeholder** (M-04).
7. **Estados vacíos:** varias tablas muestran "sin datos" sin acción sugerida; mejora de UX, no defecto funcional.

---

## 12. Calidad de código

### 12.1 Tests

```
> node --test tests/commerce.test.mjs tests/sri.test.mjs tests/sale-validation.test.mjs
# 49 tests, 49 pass, 0 fail
```

- Archivos **no ejecutados** por `npm test`: `tests/phase1-security-fiscal.test.mjs`, `tests/landing-animation.test.mjs`.
- Sin tests de componentes, navegación ni reglas Firestore.

### 12.2 Build

```
vite v8.x
✓ 2265 modules transformed
dist/assets/index-Dx-C1yDE.js   1,669.22 kB │ gzip: 353.57 kB
✓ built in 21.25s
```

- Build **exitoso**, pero no detecta `no-undef` (C-03).
- Bundle principal alto y sin *code splitting* por módulo.

### 12.3 Lint

```
npx eslint src
✖ 101 problems (97 errors, 4 warnings) in 26 files
```

| Archivo | E | W | Reglas |
|---|---:|---:|---|
| `App.jsx` | 12 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `CustomerDetailView.jsx` | 9 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `TransactionForm.jsx` | 9 | 1 | `no-unused-vars`, `no-empty`, `exhaustive-deps`, **`no-undef`** |
| `GeneralSettings.jsx` | 7 | 0 | `no-unused-vars` |
| `CuentasPorCobrarView.jsx` | 5 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `FinancialPaymentModal.jsx` | 5 | 1 | `no-unused-vars`, `set-state-in-effect`, `exhaustive-deps` |
| `TransactionsView.jsx` | 5 | 1 | `no-unused-vars`, `set-state-in-effect`, `exhaustive-deps` |
| `ShortcutCustomizerModal.jsx` | 4 | 0 | `no-unused-vars`, `only-export-components` |
| `ThirdPartiesView.jsx` | 4 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `ErpDashboard.jsx` | 3 | 0 | `no-unused-vars` |
| `CreditSetupModal.jsx` | 3 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `DiscountsPromotionsView.jsx` | 3 | 0 | `set-state-in-effect` |
| `MovimientosView.jsx` | 3 | 0 | `no-unused-vars`, `set-state-in-effect`, `preserve-manual-memoization` |
| `ResumenFinancieroView.jsx` | 3 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `ScrollReveal.jsx` | 3 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `BillingPortal.jsx` | 3 | 1 | `set-state-in-effect`, `exhaustive-deps` |
| `Sidebar.jsx` | 2 | 0 | `no-unused-vars` |
| `CuentasPorPagarView.jsx` | 2 | 0 | `no-unused-vars` |
| `PosView.jsx` | 2 | 0 | `no-unused-vars`, **`purity`** |
| `controls.jsx` | 2 | 0 | `no-unused-vars` |
| `SuperAdminPage.jsx` | 2 | 0 | `no-unused-vars`, `set-state-in-effect` |
| `sriService.js` | 2 | 0 | `no-empty` |
| `FinancialPageHeader.jsx` | 1 | 0 | `no-unused-vars` |
| `PosCreditAuthModal.jsx` | 1 | 0 | `no-unused-vars` |
| `useParallaxScroll.js` | 1 | 0 | `set-state-in-effect` |
| `LandingLayout.jsx` | 1 | 0 | `set-state-in-effect` |

### 12.4 Deuda técnica

- 2 componentes muertos (M-02).
- 1 vista no montada (A-04).
- 1 TODO funcional (A-04).
- 26 archivos con lint rojo.
- Sin CI (A-10).

---

## 13. Plan de remediación priorizado

### P0 — Bloqueantes de producción (estimado: 3–5 días)

| # | Acción | Hallazgo | Esfuerzo |
|---|---|---|---|
| 1 | Importar `Edit2` + smoke test del Paso 2 | C-03 | 0.5 h |
| 2 | Mapear `compras_preventa` a `PurchaseForm` + test de navegación por todos los IDs | C-04 | 4 h |
| 3 | Reemplazar `window.confirm` por `confirmAction()` async en los 12 call sites | C-06 | 1 d |
| 4 | Reglas de `transfers` (lectura tenant, escritura validada, update superadmin) | C-05 | 4 h |
| 5 | Restringir update de `tenants` y mover activación a backend | C-01 | 1 d |
| 6 | Deshabilitar PayPhone Sandbox en producción | C-02 | 2 h |

### P1 — Antes de abrir al público (estimado: 2 semanas)

| # | Acción | Hallazgo |
|---|---|---|
| 7 | Superadmin por claim/colección | A-01 |
| 8 | RIDE público con token firmado y rate limit | A-02 |
| 9 | Enforcement de `expiresAt` + job de suspensión | A-03 |
| 10 | Montar SRI Compras y conectar API real | A-04 |
| 11 | Métricas de equipo desde `/users` | A-05 |
| 12 | Correo de contacto con manejo de error visible | A-06 |
| 13 | Verificar autorización SRI en compras importadas | A-07 |
| 14 | Autor de auditoría real | A-08 |
| 15 | `sendPasswordResetEmail` | A-09 |
| 16 | CI con lint + tests completos + build | A-10 |
| 17 | Invitaciones y usuarios reales | C-07 |
| 18 | Verificación de email en registro | C-07 |

### P2 — Siguiente sprint (estimado: 2–3 semanas)

- Unificar reportes (M-01).
- Eliminar código muerto (M-02).
- Implementar o eliminar Papelera (M-03).
- Redes sociales reales (M-04).
- Errores de suscripción visibles (M-05).
- Incluir los 2 archivos de test restantes (M-06).
- Lazy loading por módulo (M-07).
- Corregir pureza en POS (M-08).
- Errores silenciados (M-09).
- Roles por módulo (M-10).

### P3 — Backlog (estimado: 1 semana)

- Limpiar breadcrumb `compras_sri` (B-01).
- Resolver warnings de hooks (B-02).
- Eliminar imports muertos (B-03).
- Tokenizar hex (B-04).
- Silenciar `console.*` en producción (B-05).

---

## 14. Anexos

### A. Comandos ejecutados

```bash
npm test
npm run build
npx eslint src --format json
git log -1 --format="%H %ad %s" --date=short
git status --porcelain
```

### B. Inventario de navegación

- **Ventas (7):** `resumen_ventas`, `ventas_nueva`, `preventas`, `quotes`, `nota_credito`, `retencion`, `discounts`.
- **Compras (5):** `compras_resumen`, `compras_preventa` ❌, `compras_nc`, `compras_nd`, `compras_retencion`.
- **Finanzas (11):** movimientos, CxC, CxP, bancos, tarjetas, préstamos, OCR, resumen, contabilidad, impuestos, reportes.
- **Inventario (6):** productos, servicios, categorías, marcas, bodegas, movimientos.
- **Personas (2):** clientes, proveedores.
- **Ajustes (7):** empresa, SRI, correo, bodegas, usuarios, recuperación, apariencia.
- **Suscripción (5):** facturación, páginas web, correos, WhatsApp CRM, historial.
- **SuperAdmin (5):** dashboard, tenants, monitor SRI, aprobaciones, tarifas.

### C. Evidencia clave por archivo

| Archivo | Línea | Hallazgo |
|---|---:|---|
| `firestore.rules` | 122 | `allow update` sin restricción de campos (C-01) |
| `firestore.rules` | 133 | Única regla de vouchers; falta `transfers` (C-05) |
| `src/App.jsx` | 349 | Override de `window.confirm` (C-06) |
| `src/App.jsx` | 84 | `MOCK_USERS` (C-07) |
| `src/App.jsx` | 677 | Breadcrumb `compras_sri` huérfano (B-01) |
| `src/components/finances/TransactionForm.jsx` | 16-21 | Falta `Edit2` (C-03) |
| `src/components/finances/TransactionForm.jsx` | 3620, 3737 | Uso de `Edit2` (C-03) |
| `src/components/finances/FinanceModule.jsx` | 136 | `mode === 'compras'` sin rama para `compras_preventa` (C-04) |
| `src/components/inventory/InventoryModule.tsx` | 292, 296 | Confirmación Promise (C-06) |
| `src/pages/billing/BillingPortal.jsx` | 248-265 | Activación Sandbox (C-02) |
| `src/pages/billing/BillingPortal.jsx` | 259-262 | `updateDoc` de plan desde cliente (C-01) |
| `src/pages/RegisterPage.jsx` | 54-78 | Trial autoactivado (C-07) |
| `src/pages/LoginPage.jsx` | 134-140 | Reset solo toast (A-09) |
| `src/components/finances/ComprasSriView.jsx` | 134 | `TODO` SRI (A-04) |
| `src/pages/landing/LandingContact.jsx` | 48-52 | Fallo silencioso (A-06) |

---

## 15. Conclusión

WebFix ERP demuestra un dominio funcional sólido del negocio ecuatoriano: facturación SRI, CxC/CxP, inventario y finanzas están bien modelados y el flujo fiscal feliz funciona. Sin embargo, **la capa de plataforma (identidad, planes, reglas, calidad) no está lista para producción**.

Los tres frentes que deben cerrarse antes de cualquier lanzamiento son:

1. **Cobro y planes** (C-01, C-02, A-03): hoy el producto se puede usar gratis indefinidamente y autoactivar planes.
2. **Integridad de datos** (C-06, C-03): acciones destructivas sin confirmación y un crash en el flujo de corrección fiscal.
3. **Navegación y módulos anunciados** (C-04, A-04): "Registrar Compra" en blanco y SRI Compras inexistente.

Con el plan P0 (3–5 días) el sistema deja de tener bloqueantes; con P1 (2 semanas) queda apto para clientes reales. El resto es deuda manejable.

---

*Informe generado el 09/11/2026. Evidencia basada en el commit `3322a05`. No se modificó código durante la auditoría.*
