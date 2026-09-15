# Rediseño integral WebFix — análisis y opciones

Fecha: 14 de septiembre de 2026. Estado: propuesta para elegir dirección visual.

## Conclusión

Recomiendo **A. Flat operativo azul**: una estructura común, azul para la acción principal, superficies neutras y dos densidades controladas. Tablas compactas para trabajo intensivo y formularios cómodos para ingresar información. La homogeneidad debe estar en las reglas y los comportamientos, sin obligar al POS, un reporte y un tablero de proyectos a tener la misma distribución.

La base ya existe: variables de diseño, componentes UI, navegación lateral e iconos Lucide. El trabajo principal consiste en consolidar su uso y corregir la competencia entre estilos globales y locales.

## Alcance y límites del análisis

Se revisaron las reglas AGENTS.md, la especificación de julio, los estilos globales, los componentes UI, el enrutamiento, la navegación y muestras de dashboard, ventas/compras, finanzas, inventario, proyectos, administración y páginas públicas. El inventario incluye 34 archivos de componentes financieros, 6 de inventario, 4 de dashboard y 11 de UI; son archivos, no un conteo de pantallas.

Es una auditoría de código y estructura. No se ha validado la apariencia final de cada pantalla con sesión autenticada, ni sus estados con datos reales. Los efectos de la cascada CSS y los tamaños efectivos deben verificarse en navegador durante la implementación. La maqueta adjunta es independiente y utiliza datos ficticios; no modifica el ERP.

## 1. Hallazgos

### 1.1 Tres fuentes de estilo compiten

`src/designTokens.css` define la paleta y las medidas; `src/components/ui/` vuelve a definir sus variantes; `src/index.css` fuerza estilos sobre elementos HTML y clases genéricas con `!important`.

Ejemplos verificables:

- `index.css`: la regla global de inputs impone tamaño, relleno, fondo y borde. También impone un tamaño pequeño con `!important`, que prevalece sobre la regla móvil anterior de 16px. La intención de mejorar la entrada en móvil queda anulada.
- `index.css`: todos los `th` y `td` reciben el mismo color y relleno con `!important`. Las pantallas pierden capacidad de expresar estados o densidades mediante sus clases habituales.
- `index.css`: un selector de cualquier clase que contenga `rounded-` fuerza un radio común y alcanza incluso clases de esquinas individuales. Oculta las diferencias del código en vez de resolverlas.
- `index.css`: `@theme` contiene autorreferencias como `--text-sm: var(--text-sm)` y `--radius-md: var(--radius-md)`. Revisar el CSS emitido y evitar nombres autorreferentes en la nueva integración; no se ha comprobado su resultado compilado aquí.

**Decisión propuesta:** una fuente de variables semánticas y componentes responsables de su apariencia. Reducir las sobreescrituras globales progresivamente, después de migrar sus consumidores.

### 1.2 La especificación y la implementación se separaron

La especificación de julio establece azul profesional `#2563EB` y fondo `#F8FAFC`. Los tokens actuales usan azul `#1C40F2`, fondo blanco y una dirección monocromática con Geist. `buttonVariants.js` utiliza negro como variante por defecto y azul como variante accent; `.btn-primary` también es negro. Los módulos financieros construyen además botones azules directamente.

No existe una única respuesta visual a «esta es la acción principal».

**Decisión propuesta:** fijar una sola variante principal para todo el ERP. Diferenciar acción principal, secundaria, discreta y destructiva por función.

### 1.3 La biblioteca compartida aún no controla el sistema

El dashboard usa Button, Card, Badge y Table; gran parte de finanzas e inventario utiliza HTML y clases locales. Solo 9 archivos del código analizado contienen importaciones que coinciden con el patrón de UI compartida. Este indicador muestra adopción limitada; no mide instancias renderizadas ni componentes indirectos.

Además, la biblioteca tiene deuda propia:

- `dialog.jsx` contiene `shadow-xl` y `backdrop-blur-[2px]`.
- `buttonVariants.js`, `table.jsx` y `badgeVariants.js` incluyen tamaños arbitrarios.
- El diálogo compartido no implementa por sí mismo confinamiento/restauración del foco, cierre con Escape ni semántica de diálogo. Su trigger es un div clickable. Antes de expandir su uso, debe completarse el comportamiento de teclado.
- Input es un control básico; faltan un campo compuesto, ayuda, error asociado y estructura uniforme de formulario.

**Decisión propuesta:** corregir primero los componentes base y crear patrones completos de pantalla.

### 1.4 Inventario reproducible de señales

Búsqueda estática sobre `.jsx`, `.tsx`, `.css`, `.js` y `.ts` dentro de `src`. Son coincidencias textuales, no defectos visuales independientes; pueden incluir comentarios, clases sobrescritas y páginas públicas.

| Señal | Coincidencias | Archivos |
|---|---:|---:|
| Clases bg/text/border con hexadecimal arbitrario | 47 | 9 |
| Tamaños `text-[Npx]` | 111 | 13 |
| Clases `shadow-*`, excluyendo `shadow-none` | 25 | 6 |
| Texto `backdrop-blur` | 3 | 3 |
| Radios `rounded-xl`, `2xl`, `3xl` | 119 | 8 |
| Declaraciones `!important` | 257 | 5 |
| Importaciones coincidentes con UI compartida | 23 | 9 |

El conteo no detecta todos los colores directos: las clases slate/gray/blue y los estilos inline requieren revisión adicional. Tampoco considera `rounded-full` una infracción automática: círculos de estado y avatares tienen una función distinta.

### 1.5 Estructura y navegación

- `App.jsx` concentra proyectos, calendario, equipo, paneles y composición del sistema en más de 3.000 líneas físicas. Aumenta el riesgo de cambios visuales transversales.
- App aplica márgenes al contenido y `InventoryModule.tsx` añade `p-6 md:p-8` y desplazamiento propios. Hay riesgo de márgenes acumulados y áreas de scroll anidadas.
- El sidebar utiliza estados locales para seleccionar varios módulos y submódulos. El modelo mezcla navegación, selección y acciones de crear. Conviene distinguir páginas persistentes de acciones.
- `ResumenFinancieroView.jsx` vuelve a incluir una barra horizontal. Revisar su finalidad y resolverla dentro de la política de navegación lateral vigente.
- SuperAdmin construye su propio marco de navegación y sus tarjetas.

**Decisión propuesta:** un contenedor de aplicación que posea márgenes, navegación y desplazamiento principal. Cada módulo entrega su contenido. Mantener las autorizaciones actuales al reorganizar menús; no mezclar visibilidad visual con permisos.

## 2. Tres opciones

Todas respetan modo claro, cero sombras decorativas, ausencia de desenfoque y radios de 4–6px. Las diferencias son de jerarquía, densidad y superficies, además del color.

| | A. Flat operativo azul | B. Flat monocromático | C. Flat amplio petróleo |
|---|---|---|---|
| Objetivo | Operación diaria y lectura clara | Máxima sobriedad visual | Lectura tranquila y entrada de datos |
| Acción principal | Azul `#2563EB` | Negro `#171717` | Petróleo `#0F6470` |
| Fondo | Gris frío `#F8FAFC` | Blanco `#FFFFFF` | Gris cálido `#F7F8F6` |
| Navegación | Selección azul suave | Selección gris y marcador oscuro | Selección petróleo suave |
| Contenido | Paneles blancos delimitados | Secciones y divisores; menos contenedores | Paneles amplios y más separación |
| Densidad | Equilibrada; tablas compactas | Compacta | Cómoda |
| Ventaja | Acción principal fácil de reconocer | Continúa parte de la dirección actual | Menos fatiga en formularios largos |
| Coste de uso | Exige moderación con los acentos | Jerarquía depende más de tipografía | Muestra menos registros por pantalla |

**Recomendación: A.** Se alinea con la especificación original y ofrece una jerarquía útil para un ERP con numerosas operaciones. Adoptar una sola dirección para todos los módulos. La preferencia de densidad puede ser global y persistente, sin convertir cada módulo en un tema diferente.

## 3. Contrato de diseño propuesto

### Marco de aplicación

- Sidebar de 240px expandido; colapsado con etiquetas accesibles y ayuda al pasar el cursor o enfocar.
- Cabecera de 56px con empresa/contexto y acciones de cuenta.
- Separación del contenido: 24px en escritorio, 16px en móvil. Formularios largos con ancho de lectura limitado; listados aprovechan el ancho disponible.
- Encabezado repetible: ubicación, título, descripción opcional y una acción principal.
- Sin barras de pestañas horizontales para cambiar módulos. Vistas alternativas de datos mediante selector claramente etiquetado cuando sea necesario.

### Tipografía y tamaños

- Mantener Geist, ya cargada; evitar cambiar fuente y estructura a la vez.
- Texto operativo de 14px; tablas compactas de 13px; auxiliares de 12px. Títulos de página de 24px y sección de 16px.
- Formularios: controles de 40px en escritorio y áreas táctiles de al menos 44px en móvil. Tamaño de entrada móvil de 16px.
- Tablas: filas objetivo de 40px en compacto y 48px en cómodo, permitiendo crecer con contenido o zoom.
- Valores monetarios alineados a la derecha, números tabulares y un único formato monetario aprobado para toda la aplicación. Reutilizar el formato existente antes de cambiar convenciones locales.

### Color y estados

- Marca para acción principal, enlace y selección.
- Verde para éxito, ámbar para pendiente, rojo para error/vencido y gris para borrador/inactivo.
- Separar colores de texto de colores de relleno. El verde brillante actual no debe usarse automáticamente como texto sobre blanco.
- Mostrar texto e icono cuando un estado sea relevante. Separar estado SRI, estado del pago y estado del documento; «autorizado» no significa «pagado».
- Foco visible con outline, sin sombra. Contraste a verificar en todos los pares reales, incluidos disabled y placeholder cuando contienen información necesaria.

### Componentes que deben quedar resueltos

Button, IconButton, FormField, Input, Select, Textarea, Checkbox, StatusBadge, PageHeader, FilterBar, MetricCard, DataTable, Pagination, EmptyState, ErrorState, Skeleton, Dialog, Drawer, ConfirmDialog y Toast.

DataTable concentra ordenamiento accesible, selección, densidad, alineación, estados y paginación. Los campos concretos y las reglas financieras siguen siendo responsabilidad de cada módulo.

### Cuatro plantillas

1. **Resumen:** encabezado, periodo, métricas limitadas, alertas y actividad.
2. **Listado:** encabezado, filtros, resultados, tabla y paginación consistente.
3. **Formulario:** secciones de datos, ayuda/error junto al campo, resumen y acciones finales predecibles.
4. **Detalle:** identidad y estado, datos clave, historial y acciones contextualizadas; panel lateral para consulta corta.

POS y Kanban conservan distribuciones específicas con los mismos botones, campos, estados y espaciado.

## 4. Aplicación a todo el sistema

| Área | Intervención propuesta |
|---|---|
| Dashboard | Encabezado único, métricas comparables y alertas accionables; evitar indicadores de conexión meramente decorativos |
| Ventas, cotizaciones y compras | Misma plantilla de lista y filtros; estados documentales y de pago separados |
| POS y preventas | Mantener flujo rápido, cesta y totales; jerarquía común de botones y campos |
| Movimientos, CxC y CxP | Tabla común, resumen del saldo y panel de detalle/abonos consistente |
| Bancos, tarjetas y préstamos | Resumen de cuenta, movimientos y detalle; misma presentación de cuotas y saldos |
| Captura inteligente | Carga → revisión de datos → confirmación con estados de progreso y error claros |
| Contabilidad, impuestos y reportes | Filtros uniformes, importes alineados y exportación en ubicación constante |
| Inventario y Kardex | Resolver márgenes/scroll; tablas compartidas y formularios unificados para producto, transferencia y ajuste |
| Clientes, proveedores y equipo | Lista y detalle coherentes; datos de contacto y acciones en posiciones predecibles |
| Proyectos, tareas y calendario | Extraer presentación de App; tarjetas planas y acciones disponibles por teclado y tacto |
| Configuración, soporte y contratación | Secciones con encabezados, campos y mensajes comunes |
| SuperAdmin y suscripciones | Reutilizar marco y componentes; mantener contexto de administración y empresa visible |
| Login, registro y sitio público | Misma marca, fuente y controles; composición adecuada a acceso y contenido comercial |
| RIDE público e impresión | Compartir tipografía/estados aplicables; preservar estructura documental y legibilidad de impresión |

## 5. Plan de implementación

1. **Elegir dirección y fijar referencia:** revisar la maqueta; inventariar pantallas reales por rol y estados. Capturar referencias antes de modificar.
2. **Base:** variables sin autorreferencias, jerarquía de botones, campos y diálogos accesibles; catálogo de componentes con sus estados.
3. **Piloto completo:** dashboard + listado de movimientos + formulario + detalle. Validar escritorio, móvil y teclado antes de propagar.
4. **Operación comercial:** ventas, compras, POS, contactos e inventario. Conservar cálculos, permisos y flujo de guardado.
5. **Finanzas:** los once submódulos, con énfasis en tablas, formularios largos, alertas y exportaciones.
6. **Resto del producto:** proyectos, calendario, equipo, configuración, soporte, SuperAdmin, suscripciones y acceso/público.
7. **Cierre:** retirar compatibilidad CSS que ya no tenga consumidores y añadir controles para evitar nuevas desviaciones.

No conviene estimar fechas cerradas solo por número de archivos: faltan el inventario de estados y la revisión de formularios con datos representativos. El piloto permitirá estimar la migración restante con evidencia.

## 6. Criterios de aceptación

- Todas las pantallas inventariadas usan el marco y las plantillas acordadas o una excepción funcional documentada.
- Sin colores arbitrarios en componentes, sombras decorativas, desenfoque ni tamaños locales fuera de la escala acordada.
- Una misma acción y estado se reconocen igual en todos los módulos.
- Campos con label asociado, errores comprensibles, foco visible y orden de teclado correcto; diálogos con Escape, foco contenido y devolución al control de origen.
- Comprobar 390px, 768px, 1280px y 1440px; zoom de 200%. Tablas anchas pueden desplazar su propio contenido sin causar desbordamiento de toda la página.
- Verificar carga, vacío, sin resultados, error, guardando, éxito, permisos limitados y textos largos.
- Ejecutar build y lint; validar flujos representativos de venta, compra, abono, inventario y exportación. No confundir compilación correcta con revisión visual aprobada.

## Entregables de esta revisión

- Este análisis con diagnóstico, opciones, alcance y criterios de cierre.
- `flat-modern-options.html`: maqueta interactiva de tres direcciones sobre resumen, listado, formulario y proyectos. Permite alternar densidad y buscar registros de ejemplo.
- El código operativo del ERP no se ha modificado en esta revisión.
