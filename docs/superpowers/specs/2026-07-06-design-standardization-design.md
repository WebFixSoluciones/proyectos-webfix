# Design Standardization Spec: Flat Modern Design

**Date:** 2026-07-06
**Approach:** Token-First (Enfoque A)
**Style:** Flat Modern Design - Zero shadows, minimal border-radius, blue professional palette

---

## 1. Problem Statement

The codebase has well-defined design tokens (`designTokens.css`) and written policies (`ui_stability_policies.md`), but 7 critical violations exist in production code:

1. **Border radius mismatch**: Policy says 10px cards / 4px buttons; code uses 16px-24px
2. **50+ hardcoded hex colors**: `bg-[#1a1a1a]`, `text-[#0A2540]`, etc.
3. **Shadows despite zero-shadow policy**: `shadow-xl`, `shadow-2xl` throughout
4. **Arbitrary font sizes**: `text-[10px]`, `text-[13px]` instead of tokens
5. **Hardcoded status badges**: Inline hex instead of CSS variables
6. **backdrop-filter on scrollable content**: Against GPU performance policy
7. **Mixed spacing approaches**: Tailwind, CSS vars, and raw pixels inconsistently

**Root cause:** Tailwind config doesn't consume the tokens, so developers use arbitrary values.

---

## 2. New Design Tokens

### 2.1 Color Palette (Blue Professional)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#2563EB` | Primary actions, active links |
| `--primary-hover` | `#1D4ED8` | Primary button hover |
| `--primary-light` | `#EFF6FF` | Selected/active backgrounds |
| `--primary-muted` | `#DBEAFE` | Info badges, soft highlights |
| `--surface-bg` | `#F8FAFC` | App background |
| `--surface-card` | `#FFFFFF` | Card/panel background |
| `--surface-sidebar` | `#F1F5F9` | Sidebar background |
| `--border-default` | `#E2E8F0` | Cards, inputs, dividers |
| `--border-strong` | `#CBD5E1` | Emphasized borders |
| `--text-primary` | `#0F172A` | Headings, body text |
| `--text-secondary` | `#475569` | Labels, descriptions |
| `--text-muted` | `#94A3B8` | Placeholders, hints |
| `--success` | `#16A34A` | Success states |
| `--success-light` | `#F0FDF4` | Success backgrounds |
| `--warning` | `#D97706` | Warnings, pending |
| `--warning-light` | `#FFFBEB` | Warning backgrounds |
| `--error` | `#DC2626` | Errors, rejected |
| `--error-light` | `#FEF2F2` | Error backgrounds |
| `--info` | `#2563EB` | Informational (same as primary) |
| `--info-light` | `#EFF6FF` | Info backgrounds |

### 2.2 Status Badge Colors

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| authorized | `--success-light` | `--success` | `--success` at 20% |
| registered | `--info-light` | `--primary` | `--primary` at 20% |
| pending | `--warning-light` | `--warning` | `--warning` at 20% |
| rejected | `--error-light` | `--error` | `--error` at 20% |
| draft | `--surface-sidebar` | `--text-secondary` | `--border-default` |
| cancelled | `--surface-sidebar` | `--text-muted` | `--border-default` |

### 2.3 Border Radius (Minimal)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, chips, tags |
| `--radius-md` | `6px` | Buttons, inputs, selects |
| `--radius-lg` | `6px` | Cards, modals, panels |

### 2.4 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | `11px` | Captions, micro labels |
| `--text-sm` | `12px` | Secondary text, table cells |
| `--text-base` | `13px` | Body text, form fields |
| `--text-md` | `14px` | Subheadings, nav items |
| `--text-lg` | `16px` | Section headers |
| `--text-xl` | `18px` | Page titles |
| `--font-family` | `Inter, system-ui, sans-serif` | All text |
| `--font-normal` | `400` | Body text |
| `--font-medium` | `500` | Labels, nav |
| `--font-semibold` | `600` | Subheadings |
| `--font-bold` | `700` | Headings |

### 2.5 Spacing (unchanged, enforce usage)

`--space-1` (4px) through `--space-8` (32px), increments of 4px.

### 2.6 Shadows

**None.** All depth conveyed through `--border-default` borders only.
`box-shadow: none` enforced globally.

---

## 3. Tailwind Integration

Extend the `@theme` block in `index.css` to map all CSS variables to Tailwind utility classes:

- `bg-primary` → `var(--primary)`
- `text-secondary` → `var(--text-secondary)`
- `border-default` → `var(--border-default)`
- `rounded-card` → `var(--radius-lg)`
- `rounded-btn` → `var(--radius-md)`
- `rounded-badge` → `var(--radius-sm)`

This eliminates the need for arbitrary values like `bg-[#2563EB]`.

---

## 4. Base UI Components

All in `src/components/ui/`:

### 4.1 Button.jsx

**Props:** `variant` (primary | secondary | ghost), `size` (sm | md), `disabled`, `children`, `...rest`

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| primary | `--primary` | white | none |
| secondary | transparent | `--text-primary` | `--border-default` |
| ghost | transparent | `--primary` | none |

Hover: primary darkens to `--primary-hover`, secondary/ghost get `--primary-light` background.
Radius: `--radius-md` (6px). No shadows ever.

### 4.2 Card.jsx

**Props:** `children`, `className`, `...rest`

- Background: `--surface-card`
- Border: 1px solid `--border-default`
- Radius: `--radius-lg` (6px)
- Padding: `--space-5` (20px)
- No shadows

### 4.3 Badge.jsx

**Props:** `status` (authorized | registered | pending | rejected | draft | cancelled), `children`

Uses status color tokens from section 2.2.
Radius: `--radius-sm` (4px). Font: `--text-xs`, `--font-medium`.

### 4.4 Input.jsx

**Props:** `label`, `error`, `...rest` (passed to native input)

- Border: `--border-default`
- Radius: `--radius-md`
- Focus: border `--primary`, ring 1px `--primary` at 25% opacity
- Error state: border `--error`
- Font: `--text-base` (13px)

### 4.5 Table.jsx

**Subcomponents:** `Table`, `Table.Head`, `Table.Row`, `Table.Cell`

- Header: background `--surface-sidebar`, text `--text-secondary`, uppercase, `--text-xs`
- Rows: border-bottom `--border-default`, hover background `--primary-light`
- Cells: padding `--space-3`, `--text-sm`

---

## 5. Migration Strategy

### Phase 1: Foundation
1. Update `designTokens.css` with new palette
2. Extend `@theme` block in `index.css` for Tailwind mapping
3. Create 5 UI components in `src/components/ui/`
4. Update `ui_stability_policies.md`

### Phase 2: Migration (file by file)
For each file in `src/components/`, `src/pages/`, `src/modules/`:
- Replace hardcoded hex → token-based Tailwind classes
- Replace arbitrary `rounded-*` → `rounded-card` / `rounded-btn` / `rounded-badge`
- Remove all `shadow-*` classes
- Replace arbitrary `text-[Npx]` → `text-xs` / `text-sm` / `text-base`
- Replace repeated button markup → `<Button>` component
- Replace repeated card markup → `<Card>` component
- Replace hardcoded status badges → `<Badge>` component
- Remove `backdrop-filter` from scrollable containers

### Phase 3: Validation
- Visual review of all pages
- Verify no remaining arbitrary color values (`bg-[#`, `text-[#`)
- Verify no remaining shadow classes
- Verify no remaining arbitrary border-radius values

---

## 6. Files Affected

### Modified:
- `src/designTokens.css` — new palette + radii
- `src/index.css` — extended `@theme` block, updated utility classes
- `tailwind.config.js` — content paths (if needed)
- `ui_stability_policies.md` — updated rules
- `src/components/dashboard/ErpDashboard.jsx`
- `src/components/dashboard/GeneralSettings.jsx`
- `src/components/dashboard/HiringServicesModule.jsx`
- `src/components/dashboard/SupportModule.jsx`
- `src/components/finances/*` (~13 files)
- `src/components/inventory/*` (~5 files)
- `src/components/common/IconRenderer.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/SuperAdminPage.jsx`
- `src/pages/BillingPortal.jsx`
- `src/pages/Landing*.jsx` (~6 files)
- `src/pages/PublicRideView.jsx`
- `src/constants/appData.js` — update Kanban colors

### Created:
- `src/components/ui/Button.jsx`
- `src/components/ui/Card.jsx`
- `src/components/ui/Badge.jsx`
- `src/components/ui/Input.jsx`
- `src/components/ui/Table.jsx`

### NOT changed:
- Business logic, routing, Firebase config, API integrations
- Folder structure, module architecture
- `src/modules/` domain logic (schemas, repositories, services)
- `src/contexts/AuthContext.jsx` (logic only)
- `src/hooks/` (logic only)
- `src/services/` (logic only)

---

## 7. Design Principles (Updated Policy)

1. **Zero shadows** — depth through borders only
2. **Flat Modern** — minimal border-radius (4-6px)
3. **Token-first** — no arbitrary hex values, everything via CSS variables
4. **Component-first** — use `<Button>`, `<Card>`, `<Badge>`, `<Input>` for consistency
5. **No backdrop-filter** on scrollable content
6. **GPU-safe animations** — transform and opacity only
7. **Blue professional palette** — `#2563EB` family as primary
