# Spec: Rediseño Integral con Radix Themes 3.0 & Tipografía Inter

- **Fecha:** 2026-09-17
- **Objetivo:** Alinear toda la interfaz del ERP al lenguaje visual auténtico de **Radix Themes 3.0**, adoptando la tipografía **Inter** para todos los elementos del sistema, eliminando botones rígidos o saturados en tablas, y estandarizando tarjetas, inputs, badges y modales a los componentes y tokens nativos de Radix.

---

## 1. Contexto y Problema Detectado

En la revisión visual del sistema comparado con la referencia oficial de Radix Themes 3.0:
1. **Tipografía Inadecuada**: El HTML cargaba `Geist` en lugar de `Inter`, generando inconsistencias visuales en pesos y legibilidad.
2. **Iconos y Botones Estridentes en Tablas (Flecha Roja en captura)**:
   - En columnas como "Archivos" y "Acciones" de `TransactionsView.jsx` (y homólogos), se renderizaban enlaces `<a>` planos y botones `UiButton variant="solid"` con colores saturados (azul, rojo, amarillo), viéndose toscos y desalineados con Radix.
   - En Radix Themes, estos botones deben ser `variant="soft"` (fondos pasteles suaves y translúcidos con iconos de alto contraste) o `variant="ghost"` (sutiles y discretos, con hover elegante).
3. **Inputs y Selectores**: Clases manuales de padding (`pl-9`) y selects nativos que no aprovechan `TextField.Slot` ni `Select.Root` de Radix.
4. **Bordes y Superficies**: Sobreescrituras de `designTokens.css` que generaban conflictos de especificidad con los tokens `--accent-*` y `--gray-*` de Radix Themes.

---

## 2. Decisiones de Diseño Aprobadas

### 2.1. Tipografía Global: Inter
- Se carga desde Google Fonts con pesos: `300, 400, 500, 600, 700`.
- Se habilita en `src/index.css`:
  - `--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
  - `--default-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
  - Aplicado a `body`, `#root`, `.radix-themes`, `.webfix-theme` y todos los controles.
- Headings (`UiHeading`): `weight="bold"` (700) o `weight="medium"` (500) con tracking ajustado (`letter-spacing: -0.02em`).
- Cuerpos de texto (`UiText`): escala `size="1"` (12px), `size="2"` (14px), `size="3"` (16px), con pesos 400 y 500.

### 2.2. Estandarización de Tablas: "Radix Soft Colorido"
En todas las tablas del sistema (`TransactionsView`, `ComprasGastosView`, `ProductsView`, `CuentasPorCobrarView`, `CuentasPorPagarView`, `BancosCajaView`, etc.):

1. **Columna "Archivos"**:
   - **XML**: `UiButton iconOnly variant="soft" color="blue" size="1"` con `<FileText size={13} />`. Cuando no haya archivo, `variant="ghost" color="gray" size="1"` con `disabled` y opacidad 40%.
   - **PDF**: `UiButton iconOnly variant="soft" color="red" size="1"` con `<FileText size={13} />`. Cuando no haya archivo, `variant="ghost" color="gray" size="1"` con `disabled`.
   - **RIDE / Visualizador**: `UiButton iconOnly variant="soft" color="amber" size="1"` con `<Eye size={13} />`.
   - **Correo / Envío**: `UiButton iconOnly variant="soft" color="indigo" size="1"` con `<Mail size={13} />`.
   - Todos envueltos en componentes de botón que respetan `radius="medium"` (6px) y tamaño uniforme de 28x28px (`size="1"`).

2. **Columna "Acciones"**:
   - **Editar**: `UiButton iconOnly variant="soft" color="gray" size="1"` con `<Edit2 size={13} />` (hover activo hacia acento).
   - **Eliminar**: `UiButton iconOnly variant="soft" color="red" size="1"` con `<Trash2 size={13} />`.

3. **Encabezados y Filas (`UiTable`)**:
   - `UiTableHeader`: Fondo tenue `var(--gray-2)` con borde inferior `1px solid var(--gray-a4)`, texto semibold `var(--gray-11)`, tamaño `1`, sin fondos oscuros artificiales.
   - `UiTableRow`: Hover uniforme `hover:bg-[var(--gray-a2)]`, borde entre filas `1px solid var(--gray-a3)`.
   - `UiTableCell`: Padding estándar `py-2.5 px-4 sm:px-6`, tipografía nítida Inter.

### 2.3. Topbar y Barra de Filtros
- **Topbar**:
  - Buscador global `⌘K`: `TextField.Root size="2" variant="surface"` con `TextField.Slot` para el icono `<Search />` y atajo `<kbd>`.
  - Botón POS: `UiButton variant="solid" color="blue" size="2"` con Inter 500.
  - Botón Asistente: `UiButton variant="soft" color="gray" size="2"`.
  - Botones Menú y Ajustes: `UiButton iconOnly variant="ghost" color="gray" size="2"`.
  - Badge SRI: `Badge variant="soft" color="green"`.
- **Filtros de Búsqueda**:
  - `UiInput` con slot de búsqueda integrado para búsquedas en vivo.
  - `UiSelect` nativo de Radix para selector de mes, año y estado.

### 2.4. Cards, Modales y Formularios
- **`UiCard`**: Fondo blanco puro (`var(--color-panel-solid)`), borde sutil `1px solid var(--gray-a4)`, radio de esquinas `var(--radius-3)` (8px) o `var(--radius-4)` (12px), elevación limpia sin sombras toscas.
- **`UiDialog` / Modales**: Uso de Radix `Dialog.Root`, `Dialog.Content`, con overlay translúcido `var(--black-a6)` y contenedor centrado con radio de 12px.
- **Badges**:
  - Autorizado/Éxito: `Badge variant="soft" color="green"`.
  - Registrado/Info: `Badge variant="soft" color="blue"`.
  - Pendiente: `Badge variant="soft" color="amber"`.
  - Rechazado/Anulado: `Badge variant="soft" color="red"`.

---

## 3. Plan de Cambios por Archivo

| Archivo | Cambios Principales |
|---|---|
| `index.html` | Cargar fuente Google Fonts **Inter** (300, 400, 500, 600, 700) en sustitución de Geist. |
| `src/index.css` | Configurar `--font-sans: 'Inter'`, `--default-font-family: 'Inter'`, forzar tipografía en `body` y tema. Limpiar variables que chocan con Radix. |
| `src/radixTheme.css` | Mapear tokens a las clases de Radix Themes 3.0, asegurar tamaños de botones y slots de inputs. |
| `src/components/ui/controls.jsx` | Soportar `TextField.Slot` en `UiInput`, asegurar soporte `asChild` en `UiButton` para enlaces `<a>`, afinar `UiSelect`. |
| `src/components/finances/TransactionsView.jsx` | Corregir columna "Archivos" y "Acciones" al estilo **Radix Soft Colorido**, estandarizar filtros e input de búsqueda. |
| `src/components/finances/ComprasGastosView.jsx` | Aplicar la misma estandarización de botones e iconos suaves. |
| `src/components/finances/ProductsView.jsx` | Estandarizar tabla de productos y acciones con Radix Soft. |
| `src/components/finances/CuentasPorCobrarView.jsx` | Estandarizar tabla de cartera y abonos con Radix Soft. |
| `src/components/finances/CuentasPorPagarView.jsx` | Estandarizar tabla de deudas y retenciones con Radix Soft. |
| `src/App.jsx` | Refinar Topbar superior con Radix `TextField` y botones `variant="solid"` / `variant="soft"`. |
| `src/components/Sidebar.jsx` | Ajustar estilos de items del menú lateral para armonía con Radix e Inter. |

---

## 4. Criterios de Éxito y Verificación

1. **Pruebas Automatizadas**:
   - `npm test`: Los 15 tests comerciales deben pasar con 0 fallos.
2. **Compilación Limpia**:
   - `npm run build`: Generación de bundle de Vite sin errores.
3. **Inspección Visual**:
   - Tipografía Inter activa y visible en todos los textos y números.
   - Columna "Archivos" muestra botones suaves de tamaño uniforme (28x28) con colores pastel translúcidos y esquinas redondeadas elegantes (idénticas a la captura de referencia de Radix Themes).
   - Acciones (Editar/Eliminar) sobrias con `variant="soft"` o `variant="ghost"`.
   - Búsqueda y selects estilizados nativamente con Radix.
